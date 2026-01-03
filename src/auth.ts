import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import {
  createOrganizationWithRoles,
  addUserAsAdmin,
  generateOrgSlug,
} from "@/utils/rbac/organizationSetup";

const userProfileCache = new Map<string, { profile: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      avatar?: string | null;
    };
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatar?: string | null;
  }
}

// Extend JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatar?: string | null;
  }
}

// Helper function to get user profile from database
async function getUserProfile(userId: string) {
  try {
    const cached = userProfileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Using cached user profile for:", userId);
      return cached.profile;
    }

    // Get user profile from database using Prisma
    const userData = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userData) {
      console.log("No user found for:", userId);
      return null;
    }

    const profile = {
      id: userData.id,
      email: userData.email,
      name: userData.fullName,
      avatar: userData.avatarUrl,
    };

    // Cache the profile
    userProfileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }

        try {
          console.log(`Attempting to sign in with email: ${credentials.email}`);

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log("User not found:", credentials.email);
            throw new Error("Invalid email or password");
          }

          // Check if user has a password (credentials-based user)
          if (!user.password) {
            console.log("User does not have a password set");
            throw new Error("Invalid email or password");
          }

          // Verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            console.log("Invalid password for user:", credentials.email);
            throw new Error("Invalid email or password");
          }

          // Check if user is active
          if (!user.isActive) {
            console.log("User account is inactive:", credentials.email);
            throw new Error("Account is inactive. Please contact support.");
          }

          // Check if email is verified
          if (!user.emailVerified) {
            console.log("User email not verified:", credentials.email);
            // Throw error - frontend will handle sending verification code
            throw new Error("EMAIL_NOT_VERIFIED");
          }


          console.log("User authenticated successfully:", user.id);

          // Update last sign in time
          await prisma.user
            .update({
              where: { id: user.id },
              data: { lastSignInAt: new Date() },
            })
            .catch((err: unknown) => {
              // Log but don't fail authentication if update fails
              console.warn("Failed to update last sign in time:", err);
            });

          // Get user profile
          const profile = await getUserProfile(user.id);

          if (profile) {
            return {
              id: profile.id,
              email: profile.email,
              name: profile.name || user.email?.split("@")[0],
              avatar: profile.avatar,
            };
          } else {
            // Fallback to user data if profile fetch fails
            return {
              id: user.id,
              email: user.email,
              name: user.fullName || user.email?.split("@")[0],
              avatar: user.avatarUrl,
            };
          }
        } catch (error: any) {
          console.error("Error in authorize function:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
      trigger,
    }: {
      token: JWT;
      user: any;
      account: any;
      trigger?: string;
    }) {
      // Initial sign in
      if (user) {
        console.log("JWT callback - initial sign-in, user from provider:", user);

        // IMPORTANT: For OAuth providers like Google, user.id is the provider's ID (e.g. numeric string),
        // but our database uses UUIDs. We MUST look up the user in our DB to get the correct UUID.
        // The signIn callback runs before this and should have created/updated the user.

        // We look up by email OR googleId to handle cases where the email in DB might differ 
        // from the current Google email (but accounts are linked via googleId).
        // For credential login, user.id is already the UUID. For Google, user.id is the Google ID.
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: user.email },
              { googleId: user.id } // user.id is the Google ID for Google provider
            ]
          },
          select: { id: true }
        });

        if (dbUser) {
          console.log(`JWT callback - mapped provider ID (${user.id}) to DB UUID: ${dbUser.id}`);
          token.id = dbUser.id;
        } else {
          console.error(`JWT callback - user not found in DB for email: ${user.email} or googleId: ${user.id} despite signIn success.`);
          // Fallback to user.id, but this will likely fail subsequent API calls if it's not a UUID
          token.id = user.id;
        }

        token.avatar = user.avatar || user.image;
        token.name = user.name;
        token.email = user.email;
        token.lastRefresh = Date.now();
      }

      // On subsequent requests, refresh user data from database
      else if (token.id && token.lastRefresh) {
        const timeSinceLastRefresh = Date.now() - (token.lastRefresh as number);
        const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

        // Only refresh if it's been more than 5 minutes since last refresh
        if (timeSinceLastRefresh > REFRESH_INTERVAL) {
          console.log("JWT callback - refreshing user data for:", token.id);
          const profile = await getUserProfile(token.id as string);
          if (profile) {
            token.avatar = profile.avatar;
            token.name = profile.name;
            token.email = profile.email;
            token.lastRefresh = Date.now();
          }
        } else {
          console.log("JWT callback - using cached token data for:", token.id);
        }
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        // Only log session callback in development and reduce frequency
        if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
          console.log("Session callback - token:", token.id);
        }
        session.user.id = token.id as string;
        session.user.avatar = token.avatar as string | undefined;
        session.user.name = token.name as string | undefined;
        session.user.email = token.email as string | undefined;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // For OAuth providers (Google), handle profile creation
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user already exists in our users table by email OR googleId
          // This prevents unique constraint violations if the user exists with a different email
          // or if they exist with the same email but we need to link accounts.
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: user.email },
                { googleId: account.providerAccountId }
              ]
            }
          });

          if (!existingUser) {
            // Create user profile manually for OAuth users
            console.log("Creating profile for OAuth user:", user.email);

            const newUser = await prisma.user.create({
              data: {
                // Ensure we let Prisma generate the ID (UUID) if we don't have a reliable mapped one
                // But typically for new users we want a UUID.
                // Depending on schema, id is @default(uuid()).
                // So we should NOT pass 'id' unless we want to force it.
                // NextAuth user.id for Google is the google ID (numeric string), which might not valid UUID.
                email: user.email,
                fullName:
                  user.name || user.email?.split("@")[0] || "Unknown User",
                emailVerified: true, // OAuth providers verify email
                avatarUrl: user.image || null,
                googleId: account.providerAccountId,
              },
            });

            // Create default organization for the new user
            try {
              const orgName = `${newUser.fullName}'s Organization`;
              const orgSlug = generateOrgSlug(orgName, newUser.id);

              console.log("Creating default organization for Google user:", orgName);

              const organizationResult = await createOrganizationWithRoles({
                name: orgName,
                slug: orgSlug,
                owner_id: newUser.id,
              });

              if (organizationResult.error) {
                console.error("Failed to create organization for Google user:", organizationResult.error);
              } else {
                const adminResult = await addUserAsAdmin(
                  newUser.id,
                  organizationResult.organization.id
                );

                if (adminResult.error) {
                  console.error("Failed to add Google user as admin:", adminResult.error);
                } else {
                  console.log("Successfully created organization and assigned admin role for Google user");
                }
              }
            } catch (orgError) {
              console.error("Error setting up organization for Google user:", orgError);
              // We don't block login if org creation fails, but it might result in a user without an org
            }
          } else {
            // User exists (either by email or googleId)
            console.log("User already exists, updating OAuth info:", existingUser.email);

            // Update last sign in time for existing OAuth user
            // And link Google ID if not already linked
            await prisma.user
              .update({
                where: { id: existingUser.id },
                data: {
                  lastSignInAt: new Date(),
                  avatarUrl: user.image || existingUser.avatarUrl,
                  // Ensure googleId is set (linking account if found by email but no googleId)
                  googleId: account.providerAccountId,
                  // Also update email if it was found by googleId but email changed (optional, be careful with unique constraints)
                  // For now, we assume email in DB is the source of truth or we don't change it to avoid conflicts
                  emailVerified: true, // Re-verify email on login
                },
              })
              .catch((err: unknown) => {
                console.warn("Failed to update OAuth user:", err);
              });

            // Self-healing: Check if user has an organization. If not, create one.
            // This handles cases where user creation succeeded but org creation failed previously.
            const membershipCount = await prisma.organizationMember.count({
              where: { userId: existingUser.id }
            });

            if (membershipCount === 0) {
              console.log("Existing user has no organization. Attempting recovery...");
              try {
                const orgName = `${existingUser.fullName || existingUser.email?.split("@")[0]}'s Organization`;
                const orgSlug = generateOrgSlug(orgName, existingUser.id);

                console.log("Creating default organization for existing user (Recovery):", orgName);

                const organizationResult = await createOrganizationWithRoles({
                  name: orgName,
                  slug: orgSlug,
                  owner_id: existingUser.id,
                });

                if (organizationResult.error) {
                  console.error("Failed to create organization for existing user:", organizationResult.error);
                } else {
                  const adminResult = await addUserAsAdmin(
                    existingUser.id,
                    organizationResult.organization.id
                  );

                  if (adminResult.error) {
                    console.error("Failed to add existing user as admin:", adminResult.error);
                  } else {
                    console.log("Successfully created organization and assigned admin role for existing user (Recovery)");
                  }
                }
              } catch (orgError) {
                console.error("Error setting up organization for existing user:", orgError);
              }
            }
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }

      return true;
    },
  },
};

// Export NextAuth configuration for API routes
const authHandler = NextAuth(authConfig);

// For NextAuth v4, export signIn and signOut separately
export const { signIn, signOut } = authHandler;
export default authHandler;
