import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    
    try {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)
      
      // Redirect to login page with success message
      return NextResponse.redirect(new URL('/login?verified=true', request.url))
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login page with error
      return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
    }
  }

  // No code provided, redirect to home page
  return NextResponse.redirect(new URL('/', request.url))
} 