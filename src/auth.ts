import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@/utils/supabase/server"
import { JWT } from "next-auth/jwt"
import { Session } from "next-auth"

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: "admin" | "manager" | "employee"
      avatar?: string | null
    }
  }
  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: "admin" | "manager" | "employee"
    avatar?: string | null
  }
}

// Extend JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "admin" | "manager" | "employee"
    avatar?: string | null
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
          console.log("Missing email or password")
          return null
        }

        try {
          const supabase = await createClient()
          
          console.log(`Attempting to sign in with email: ${credentials.email}`)
          
          // Sign in with email and password
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error) {
            console.log("Supabase auth error:", error.message)
            throw new Error(error.message)
          }

          if (!data.user) {
            console.log("No user returned from Supabase")
            throw new Error("Invalid credentials")
          }

          console.log("User authenticated successfully:", data.user.id)
          console.log("User metadata:", data.user.user_metadata)

          // Return the user object
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
            role: data.user.user_metadata?.role || "employee",
            avatar: data.user.user_metadata?.avatar || null,
          }
        } catch (error: any) {
          console.error("Error in authorize function:", error)
          throw new Error(error.message || "Authentication failed")
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
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        console.log("JWT callback - user:", user)
        token.id = user.id
        token.role = user.role
        token.avatar = user.avatar
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        console.log("Session callback - token:", token)
        session.user.id = token.id as string
        session.user.role = token.role as "admin" | "manager" | "employee"
        session.user.avatar = token.avatar as string | undefined
      }
      return session
    },
  },
}

// Create auth helpers
const { auth, signIn, signOut } = NextAuth(authConfig)
export { auth, signIn, signOut } 