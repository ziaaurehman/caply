import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { createClient } from '@/utils/supabase/server'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        organization_id,
        email,
        status
      `)
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      console.error('Error fetching invitation:', inviteError)
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      invitation.organization_id,
      { resource: 'users', action: 'delete' }
    )

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation is not pending' }, { status: 400 })
    }

    // Update the invitation status to 'cancelled'
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error cancelling invitation:', updateError)
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 