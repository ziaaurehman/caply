import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { sendInvitationEmail } from '@/lib/email'

// GET /api/team-members - List all team members in the organization
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/team-members - Starting request')
  
  try {
    const session = await getServerSession(authConfig)
    console.log('📋 Session data:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    console.log('🗄️ Supabase client created')

    // Get user's organization
    console.log('🔍 Looking for user organization for user ID:', session.user.id)
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role_id, roles:role_id(name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    console.log('📊 Organization query result:', {
      userOrg,
      orgError,
      errorCode: orgError?.code,
      errorMessage: orgError?.message
    })

    if (orgError || !userOrg) {
      console.log('❌ Organization not found or error:', {
        error: orgError,
        userOrg,
        userId: session.user.id
      })
      
      // Let's also check all organization members for this user (for debugging)
      const { data: allMemberships, error: debugError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', session.user.id)
      
      console.log('🔍 Debug - All memberships for user:', {
        allMemberships,
        debugError,
        userId: session.user.id
      })
      
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('✅ Found user organization:', {
      organizationId: userOrg.organization_id,
      roleId: userOrg.role_id,
      roleName: (userOrg as any).roles?.name
    })

    // Get all team members with their roles and user info
    console.log('🔍 Fetching team members for organization:', userOrg.organization_id)
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role_id,
        hourly_rate,
        weekly_capacity,
        department,
        hire_date,
        status,
        joined_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          position,
          phone,
          is_active
        ),
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('organization_id', userOrg.organization_id)
      .order('joined_at', { ascending: false })

    console.log('📊 Members query result:', {
      membersCount: members?.length || 0,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code
    })

    if (error) {
      console.error('❌ Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get pending invitations
    console.log('🔍 Fetching pending invitations for organization:', userOrg.organization_id)
    const { data: invitations, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        email,
        role_id,
        status,
        expires_at,
        created_at,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('organization_id', userOrg.organization_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    console.log('📊 Invitations query result:', {
      invitationsCount: invitations?.length || 0,
      hasError: !!inviteError,
      errorMessage: inviteError?.message
    })

    const result = {
      members: members || [],
      invitations: invitations || []
    }

    console.log('✅ Returning successful response:', {
      membersCount: result.members.length,
      invitationsCount: result.invitations.length
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Unexpected error in team members API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/team-members - Invite a new team member
export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/team-members - Starting request')
  
  try {
    const session = await getServerSession(authConfig)
    console.log('📋 Session data:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { email, roleId, department, hourlyRate, weeklyCapacity, message } = body

    if (!email || !roleId) {
      console.log('❌ Missing required fields:', { email: !!email, roleId: !!roleId })
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user's organization and inviter info
    console.log('🔍 Looking for user organization for user ID:', session.user.id)
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select(`
        organization_id, 
        role_id, 
        roles:role_id(name),
        organizations:organization_id(name, logo_url),
        users:user_id(full_name)
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    console.log('📊 Organization query result:', {
      userOrg,
      orgError
    })

    if (orgError || !userOrg) {
      console.log('❌ Organization not found')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user has permission to invite (admin or manager)
    const userRole = (userOrg as any).roles?.name
    console.log('🔒 Checking permissions - User role:', userRole)
    
    if (!['admin', 'manager'].includes(userRole)) {
      console.log('❌ Insufficient permissions')
      return NextResponse.json({ error: 'Insufficient permissions to invite members' }, { status: 403 })
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists:', email)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    console.log('👤 Existing user check:', { exists: !!existingUser, userId: existingUser?.id })

    // Check if user is already a member
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', userOrg.organization_id)
        .eq('user_id', existingUser.id)
        .single()

      console.log('👥 Existing member check:', { isAlreadyMember: !!existingMember })

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', userOrg.organization_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    console.log('📧 Existing invitation check:', { hasInvitation: !!existingInvitation })

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
    }

    // Get role information for the invitation
    const { data: roleInfo } = await supabase
      .from('roles')
      .select('name, display_name')
      .eq('id', roleId)
      .single()

    // Generate invitation token
    const token = crypto.randomUUID()
    console.log('🎫 Generated invitation token:', token.substring(0, 8) + '...')

    // If user exists, add them directly to the organization
    if (existingUser) {
      console.log('✅ Adding existing user to organization')
      const { data: newMember, error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: userOrg.organization_id,
          user_id: existingUser.id,
          role_id: roleId,
          department: department || null,
          hourly_rate: hourlyRate || null,
          weekly_capacity: weeklyCapacity || 40,
          status: 'active',
          invited_by: session.user.id
        })
        .select(`
          id,
          user_id,
          role_id,
          hourly_rate,
          weekly_capacity,
          department,
          status,
          users:user_id (
            id,
            email,
            full_name,
            avatar_url,
            position
          ),
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .single()

      if (memberError) {
        console.error('❌ Error adding member:', memberError)
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
      }

      console.log('✅ Member added successfully')
      return NextResponse.json({ 
        success: true, 
        member: newMember,
        message: 'User added to organization successfully'
      })
    } else {
      console.log('📧 Creating invitation for new user')
      // Create invitation for new user
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: invitation, error: inviteError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: userOrg.organization_id,
          email,
          role_id: roleId,
          token,
          invited_by: session.user.id,
          message: message || null,
          expires_at: expiresAt
        })
        .select(`
          id,
          email,
          role_id,
          status,
          expires_at,
          created_at,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .single()

      if (inviteError) {
        console.error('❌ Error creating invitation:', inviteError)
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      console.log('✅ Invitation created successfully')

      // Send invitation email
      try {
        console.log('📧 Sending invitation email...')
        
        const emailResult = await sendInvitationEmail({
          email,
          token,
          organizationName: (userOrg as any).organizations?.name || 'Organization',
          organizationLogo: (userOrg as any).organizations?.logo_url,
          roleName: roleInfo?.display_name || 'Team Member',
          inviterName: (userOrg as any).users?.full_name || session.user.name || 'Team Admin',
          message: message || undefined,
          expiresAt
        })
        
        if (emailResult.success) {
          console.log(`✅ Invitation email sent successfully via ${emailResult.provider}`)
          if (emailResult.fallback) {
            console.log('⚠️ Email sent using fallback method')
          }
        } else {
          console.error('⚠️ Failed to send invitation email, but invitation was created:', emailResult.error)
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send invitation email, but invitation was created:', emailError)
        // Don't fail the request if email fails - invitation is still created
      }

      return NextResponse.json({ 
        success: true, 
        invitation,
        message: 'Invitation sent successfully'
      })
    }

  } catch (error) {
    console.error('💥 Unexpected error in team members POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 