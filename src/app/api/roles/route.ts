import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// GET /api/roles - Get organization-specific roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user's organization
    const { data: userOrgMembership, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, user_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (orgError || !userOrgMembership) {
      console.error('Organization membership error:', orgError)
      console.error('User ID:', session.user.id)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('User organization:', userOrgMembership.organization_id)

    // Get organization-specific roles only (exclude system roles)
    const { data: roles, error } = await supabase
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
      .eq('organization_id', userOrgMembership.organization_id)
      .eq('is_system_role', false)
      .order('name')

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    console.log(`Found ${roles?.length || 0} roles for organization ${userOrgMembership.organization_id}`)

    // Transform the data to flatten permissions
    const transformedRoles = roles?.map((role: any) => ({
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      is_system_role: role.is_system_role,
      organization_id: role.organization_id,
      created_at: role.created_at,
      updated_at: role.updated_at,
      permissions: role.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || []
    })) || []

    return NextResponse.json({ 
      roles: transformedRoles,
      organization_id: userOrgMembership.organization_id,
      count: transformedRoles.length 
    })

  } catch (error) {
    console.error('Error in roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/roles - Create a new organization-specific role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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
    const { name, display_name, description, permission_ids } = body

    if (!name || !display_name || !permission_ids || !Array.isArray(permission_ids)) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, display_name, permission_ids' 
      }, { status: 400 })
    }

    // Call the database function to create the role
    const { data, error } = await supabase.rpc('create_organization_role', {
      org_id: userOrgMembership.organization_id,
      role_name: name,
      role_display_name: display_name,
      role_description: description || null,
      permission_ids: permission_ids
    })

    if (error) {
      console.error('Error creating role:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json({ role_id: data, message: 'Role created successfully' })

  } catch (error) {
    console.error('Error in POST roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 