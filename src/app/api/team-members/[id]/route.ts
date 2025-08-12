import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'
import { redisDel, redisSetJSON } from '@/utils/redis'

// PUT /api/team-members/[id] - Update team member
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = params.id
    const body = await request.json()
    const { roleId, department, hourlyRate, weeklyCapacity } = body
    
    // Get organization ID from headers
    const headerOrgId = request.headers.get('x-organization-id')
    
    if (!headerOrgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      headerOrgId,
      { resource: 'users', action: 'update' }
    )

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()
    const userContext = validation.context!

    // Get the member to update
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id')
      .eq('id', memberId)
      .eq('organization_id', headerOrgId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update the member
    const updateData: any = {}
    if (roleId) updateData.role_id = roleId
    if (department !== undefined) updateData.department = department
    if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate
    if (weeklyCapacity !== undefined) updateData.weekly_capacity = weeklyCapacity

    const { data: updatedMember, error: updateError } = await supabase
      .from('organization_members')
      .update(updateData)
      .eq('id', memberId)
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
      .single()

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    // Refresh caches related to this member and user (15 days)
    try {
      // Update single member cache
      await redisSetJSON(
        `organization:member:${headerOrgId}:${member.user_id}`,
        updatedMember,
        1296000
      )

      // Refresh organization members list cache
      const { data: allMembers } = await supabase
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
        .eq('organization_id', headerOrgId)
        .order('joined_at', { ascending: false })

      if (allMembers) {
        await redisSetJSON(`organization:members:${headerOrgId}`, allMembers, 1296000)
      }

      // Refresh user's organizations list cache
      const { data: userOrgs } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role_id,
          status,
          hourly_rate,
          weekly_capacity,
          department,
          hire_date,
          joined_at,
          organizations!inner(
            id,
            name,
            slug,
            description,
            logo_url,
            owner_id,
            created_at
          ),
          roles!inner(
            id,
            name,
            display_name,
            description,
            role_permissions!inner(
              permissions!inner(
                module,
                action
              )
            )
          )
        `)
        .eq('user_id', member.user_id)
        .eq('status', 'active')

      const transformedUserOrgs = (userOrgs || []).map((org: any) => ({
        id: org.organizations.id,
        name: org.organizations.name,
        slug: org.organizations.slug,
        description: org.organizations.description,
        logo_url: org.organizations.logo_url,
        is_owner: org.organizations.owner_id === member.user_id,
        created_at: org.organizations.created_at,
        membership_status: org.status,
        membership: {
          id: org.id,
          organization_id: org.organization_id,
          user_id: org.user_id,
          role_id: org.role_id,
          status: org.status,
          hourly_rate: org.hourly_rate,
          weekly_capacity: org.weekly_capacity,
          department: org.department,
          hire_date: org.hire_date,
          joined_at: org.joined_at,
          role: {
            id: org.roles.id,
            name: org.roles.name,
            display_name: org.roles.display_name,
            description: org.roles.description,
            permissions: org.roles.role_permissions?.map((rp: any) => ({
              resource: rp.permissions.module,
              action: rp.permissions.action
            })) || []
          }
        }
      }))

      await redisSetJSON(`user:organizations:${member.user_id}`, transformedUserOrgs, 1296000)
    } catch (e) {
      console.warn('Failed to refresh caches after member update:', e)
    }

    return NextResponse.json({ 
      success: true, 
      member: updatedMember 
    })

  } catch (error) {
    console.error('Error in team member PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/team-members/[id] - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = params.id
    
    // Get organization ID from headers
    const headerOrgId = request.headers.get('x-organization-id')
    
    if (!headerOrgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      headerOrgId,
      { resource: 'users', action: 'delete' }
    )

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()
    const userContext = validation.context!

    // Get the member to delete
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id')
      .eq('id', memberId)
      .eq('organization_id', headerOrgId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent deleting yourself
    if (member.user_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 })
    }

    // Check if the user is an organization owner
    const { data: organization, error: ownerError } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', headerOrgId)
      .single()

    if (ownerError) {
      console.error('Error checking organization owner:', ownerError)
      return NextResponse.json({ error: 'Failed to verify organization ownership' }, { status: 500 })
    }

    // Prevent deleting organization owner
    if (organization.owner_id === member.user_id) {
      return NextResponse.json({ 
        error: 'Cannot remove organization owner. Transfer ownership first before removing this member.' 
      }, { status: 400 })
    }

    // Delete the member
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error deleting member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Invalidate related Redis caches
    try {
      await Promise.all([
        redisDel(`user:organizations:${member.user_id}`),
        redisDel(`organization:members:${headerOrgId}`),
        redisDel(`organization:member:${headerOrgId}:${member.user_id}`),
      ])
    } catch (e) {
      console.warn('Failed to invalidate caches after member delete:', e)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Member removed successfully'
    })

  } catch (error) {
    console.error('Error in team member DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 