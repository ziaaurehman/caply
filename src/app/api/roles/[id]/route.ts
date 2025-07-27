import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { validateOrganizationAccess } from '@/utils/organizationUtils'

interface Params {
  id: string
}

// GET /api/roles/[id] - Get specific role details
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Validate organization access
    const validation = await validateOrganizationAccess()

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()
    const roleId = params.id
    const organizationId = validation.context!.organizationId

    // Get role details
    const { data: role, error } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        display_name,
        description,
        is_system_role,
        organization_id,
        role_permissions:role_permissions(
          permissions:permission_id(
            id,
            name,
            display_name,
            description,
            module,
            action
          )
        )
      `)
      .eq('id', roleId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Transform the data
    const transformedRole = {
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      is_system_role: role.is_system_role,
      organization_id: role.organization_id,
      permissions: role.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || []
    }

    return NextResponse.json({ role: transformedRole })

  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const roleId = params.id

    // Get user's organization and check admin permissions
    const { data: userOrgMembership, error: orgError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        roles!inner(name)
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (orgError || !userOrgMembership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user is admin
    const userRole = (userOrgMembership.roles as any)?.name
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, description, permission_ids } = body

    // Update role basic info
    const { error: updateError } = await supabase
      .from('roles')
      .update({
        display_name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .eq('organization_id', userOrgMembership.organization_id)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // Update permissions if provided
    if (permission_ids && Array.isArray(permission_ids)) {
      // Delete existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      // Add new permissions
      const permissionInserts = permission_ids.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId
      }))

      const { error: permissionsError } = await supabase
        .from('role_permissions')
        .insert(permissionInserts)

      if (permissionsError) {
        console.error('Error updating permissions:', permissionsError)
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Role updated successfully' })

  } catch (error) {
    console.error('Error in PUT roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const roleId = params.id

    // Get user's organization and check admin permissions
    const { data: userOrgMembership, error: orgError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        roles!inner(name)
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (orgError || !userOrgMembership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user is admin
    const userRole = (userOrgMembership.roles as any)?.name
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if role exists and belongs to the organization
    const { data: roleToDelete, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .eq('organization_id', userOrgMembership.organization_id)
      .single()

    if (roleError || !roleToDelete) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deletion of default roles
    if (['admin', 'manager', 'member'].includes(roleToDelete.name)) {
      return NextResponse.json({ 
        error: 'Cannot delete default organization roles' 
      }, { status: 400 })
    }

    // Check if role is being used by any members
    const { data: membersWithRole, error: membersError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('role_id', roleId)
      .eq('organization_id', userOrgMembership.organization_id)

    if (membersError) {
      console.error('Error checking role usage:', membersError)
      return NextResponse.json({ error: 'Failed to check role usage' }, { status: 500 })
    }

    if (membersWithRole && membersWithRole.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to team members' 
      }, { status: 400 })
    }

    // Delete the role (permissions will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('organization_id', userOrgMembership.organization_id)

    if (deleteError) {
      console.error('Error deleting role:', deleteError)
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Role deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
