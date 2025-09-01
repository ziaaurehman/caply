import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { validateOrganizationAccess, validateOrganizationAccessWithId } from '@/utils/organizationUtils'
import { redisSetJSON } from '@/utils/redis'

// Cache TTL - 7 days for page 1 only (most frequently accessed)
const PAGE_ONE_CACHE_TTL = 604800 // 7 days in seconds

interface Params {
  id: string
}

// GET /api/roles/[id] - Get specific role details
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get('x-organization-id')
    
    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(
        headerOrgId,
        { resource: 'roles', action: 'read' }
      )
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess(
        { resource: 'roles', action: 'read' }
      )
    }

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
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get('x-organization-id')
    
    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(
        headerOrgId,
        { resource: 'roles', action: 'update' }
      )
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess(
        { resource: 'roles', action: 'update' }
      )
    }

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()
    const roleId = params.id
    const organizationId = validation.context!.organizationId

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
      .eq('organization_id', organizationId)

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

    // Refresh page 1 cache after updating role
    try {
      const cacheKey = `roles:page1:${organizationId}:` // Empty search
      
      // Refresh with new data
      const { data: roles } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          display_name,
          description,
          is_system_role,
          organization_id,
          created_at,
          updated_at,
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
        .eq('organization_id', organizationId)
        .eq('is_system_role', false)
        .order('name')
        .range(0, 9) // First 10 items for page 1

      const transformedRoles = (roles || []).map((role: any) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system_role: role.is_system_role,
        organization_id: role.organization_id,
        created_at: role.created_at,
        updated_at: role.updated_at,
        permissions: role.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || []
      }))

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('roles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_system_role', false)

      const totalPages = Math.ceil((totalCount || 0) / 10)

      const refreshedResult = {
        roles: transformedRoles,
        organization_id: organizationId,
        pagination: {
          page: 1,
          limit: 10,
          total: totalCount || 0,
          totalPages,
          hasNext: 1 < totalPages,
          hasPrev: false
        }
      }

      await redisSetJSON(cacheKey, refreshedResult, PAGE_ONE_CACHE_TTL)
      console.log('🔄 Refreshed page 1 cache after role update')
    } catch (e) {
      console.warn('Failed to refresh roles page 1 cache after update:', e)
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
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get('x-organization-id')
    
    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(
        headerOrgId,
        { resource: 'roles', action: 'delete' }
      )
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess(
        { resource: 'roles', action: 'delete' }
      )
    }

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()
    const roleId = params.id
    const organizationId = validation.context!.organizationId

    // Check if role exists and belongs to the organization
    const { data: roleToDelete, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .eq('organization_id', organizationId)
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
      .eq('organization_id', organizationId)

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
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('Error deleting role:', deleteError)
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
    }

    // Refresh page 1 cache after deleting role
    try {
      const cacheKey = `roles:page1:${organizationId}:` // Empty search
      
      // Refresh with new data
      const { data: roles } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          display_name,
          description,
          is_system_role,
          organization_id,
          created_at,
          updated_at,
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
        .eq('organization_id', organizationId)
        .eq('is_system_role', false)
        .order('name')
        .range(0, 9) // First 10 items for page 1

      const transformedRoles = (roles || []).map((role: any) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system_role: role.is_system_role,
        organization_id: role.organization_id,
        created_at: role.created_at,
        updated_at: role.updated_at,
        permissions: role.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || []
      }))

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('roles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_system_role', false)

      const totalPages = Math.ceil((totalCount || 0) / 10)

      const refreshedResult = {
        roles: transformedRoles,
        organization_id: organizationId,
        pagination: {
          page: 1,
          limit: 10,
          total: totalCount || 0,
          totalPages,
          hasNext: 1 < totalPages,
          hasPrev: false
        }
      }

      await redisSetJSON(cacheKey, refreshedResult, PAGE_ONE_CACHE_TTL)
      console.log('🔄 Refreshed page 1 cache after role deletion')
    } catch (e) {
      console.warn('Failed to refresh roles page 1 cache after delete:', e)
    }

    return NextResponse.json({ message: 'Role deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
