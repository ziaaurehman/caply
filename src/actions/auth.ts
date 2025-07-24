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

  // Register user with Supabase auth (clean schema approach)
  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.fullName,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // If user is immediately signed in, create their profile
  if (data.user && data.session) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: formData.fullName
      })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return { success: false, error: "Account created but profile setup failed" }
    }
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
  await signOut({ redirectTo: "/" })
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

