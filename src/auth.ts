import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@/utils/supabase/server";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

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

    const supabase = await createClient();

    // Get user profile from users table (organization-based schema)
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !userData) {
      console.log("No user found for:", userId);
      return null;
    }
    const profile = {
      id: userData.id,
      email: userData.email,
      name: userData.full_name,
      avatar: userData.avatar_url,
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
          const supabase = await createClient();

          console.log(`Attempting to sign in with email: ${credentials.email}`);

          // Sign in with email and password
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            console.log("Supabase auth error:", error.message);
            throw new Error(error.message);
          }

          if (!data.user) {
            console.log("No user returned from Supabase");
            throw new Error("Invalid credentials");
          }

          console.log("User authenticated successfully:", data.user.id);

          // Get user profile from database
          const profile = await getUserProfile(data.user.id);

          if (profile) {
            return {
              id: profile.id,
              email: profile.email,
              name: profile.name || data.user.email?.split("@")[0],
              avatar: profile.avatar,
            };
          } else {
            // Fallback to user metadata if no profile (shouldn't happen in normal flow)
            return {
              id: data.user.id,
              email: data.user.email,
              name:
                data.user.user_metadata?.name || data.user.email?.split("@")[0],
              avatar: data.user.user_metadata?.avatar || null,
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
        console.log("JWT callback - user:", user);
        token.id = user.id;
        token.avatar = user.avatar;
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
          const supabase = await createClient();

          // Check if user already exists in our users table
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single();

          if (!existingUser) {
            // Create user profile manually for OAuth users
            console.log("Creating profile for OAuth user:", user.email);

            const { error: profileError } = await supabase
              .from("users")
              .insert({
                id: user.id,
                email: user.email,
                full_name:
                  user.name || user.email?.split("@")[0] || "Unknown User",
              });

            if (profileError) {
              console.error(
                "Failed to create OAuth user profile:",
                profileError
              );
              return false;
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
