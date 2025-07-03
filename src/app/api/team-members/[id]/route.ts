import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

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

    const supabase = await createClient()

    // Get user's organization and role
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role_id, roles:role_id(name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check permissions (admin or manager can update)
    const userRole = (userOrg as any).roles?.name
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the member to update
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id')
      .eq('id', memberId)
      .eq('organization_id', userOrg.organization_id)
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
    const supabase = await createClient()

    // Get user's organization and role
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role_id, roles:role_id(name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check permissions (admin or manager can delete)
    const userRole = (userOrg as any).roles?.name
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the member to delete
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id')
      .eq('id', memberId)
      .eq('organization_id', userOrg.organization_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent deleting yourself
    if (member.user_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 })
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

    return NextResponse.json({ 
      success: true,
      message: 'Member removed successfully'
    })

  } catch (error) {
    console.error('Error in team member DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 