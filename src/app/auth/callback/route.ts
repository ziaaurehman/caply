import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { handleSignupComplete } from '@/utils/rbac/adminSetup'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const invitationToken = requestUrl.searchParams.get('invitation')
  
  if (code) {
    const supabase = await createClient()
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
      }
      
      // Check if this is a new user signup that needs RBAC setup
      if (data.user && data.session) {
        const user = data.user
        
        // Check if user profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        // If no profile exists, this is a new user
        if (!existingProfile) {
          console.log('New user detected, setting up RBAC profile...')
          
          const setupResult = await handleSignupComplete(
            user.id,
            user.email || '',
            user.user_metadata?.name,
            invitationToken || undefined
          )
          
          if (setupResult.success) {
            console.log(`User setup complete. Role: ${setupResult.role}, First Admin: ${setupResult.isFirstAdmin}`)
            
            // Redirect based on role
            if (setupResult.isFirstAdmin) {
              return NextResponse.redirect(new URL('/dashboard?welcome=admin', request.url))
            } else if (invitationToken) {
              return NextResponse.redirect(new URL('/dashboard?welcome=invited', request.url))
            } else {
              return NextResponse.redirect(new URL('/dashboard?welcome=new', request.url))
            }
          } else {
            console.error('Failed to set up user profile')
            return NextResponse.redirect(new URL('/login?error=setup_failed', request.url))
          }
        }
      }
      
      // Existing user, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
      
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=callback_failed', request.url))
    }
  }

  // No code provided, redirect to home page
  return NextResponse.redirect(new URL('/', request.url))
} 