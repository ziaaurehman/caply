'use server'

import { signIn as nextAuthSignIn } from '@/auth'
import { createClient } from '@supabase/supabase-js'

export async function signIn(email: string, password?: string) {
  if (!password) {
    return { error: 'Password is required.' }
  }
  try {
    await nextAuthSignIn('credentials', { email, password, redirectTo: '/dashboard' })
    return { success: true }
  } catch (error: any) {
    if (error.type === 'CredentialsSignin') {
      return { error: 'Invalid email or password.' }
    }
    console.error('Sign in error:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signUp(email: string, password?: string, fullName?: string) {
  if (!password) {
    return { error: 'Password is required.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    console.error('Supabase sign-up error:', error.message)
    return { error: error.message }
  }

  if (data.user) {
    await nextAuthSignIn('credentials', { email, password, redirectTo: '/dashboard' })
    return { success: true }
  }

  return { error: 'An unknown error occurred during sign up.' }
} 