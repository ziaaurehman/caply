import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// GET /api/invitations/pending - Get pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get pending invitations for the current user's email
    const { data: invitations, error } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        organization_id,
        email,
        role_id,
        status,
        expires_at,
        created_at,
        message,
        token,
        roles:role_id (
          id,
          name,
          display_name,
          description
        ),
        organizations:organization_id (
          id,
          name,
          logo_url
        ),
        invited_by_user:invited_by (
          id,
          full_name,
          email
        )
      `)
      .eq('email', session.user.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({
      invitations: invitations || [],
      count: invitations?.length || 0
    })

  } catch (error) {
    console.error('Error in pending invitations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 