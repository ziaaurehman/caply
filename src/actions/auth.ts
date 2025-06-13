"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { signIn, signOut } from "@/auth"

/**
 * Register a new user with Supabase
 */
export async function registerUser(formData: {
  fullName: string
  email: string
  password: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.fullName,
        role: "employee", // Default role
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Login with email and password
 */
export async function loginWithCredentials(formData: {
  email: string
  password: string
  redirectUrl?: string
}) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirectTo: formData.redirectUrl || "/dashboard",
    })
  } catch (error) {
    if ((error as Error).message.includes("CredentialsSignin")) {
      return { success: false, error: "Invalid email or password" }
    }
    return { success: false, error: "Something went wrong" }
  }

  // This should not be reached if signIn redirects
  return { success: true }
}

/**
 * Login with Google
 */
export async function loginWithGoogle(redirectUrl?: string) {
  await signIn("google", { redirectTo: redirectUrl || "/dashboard" })
}

/**
 * Sign out the current user
 */
export async function logoutUser() {
  await signOut({ redirectTo: "/login" })
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

