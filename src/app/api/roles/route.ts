import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// GET /api/roles - Get all available roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all non-system roles (exclude superadmin, support_admin)
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        display_name,
        description,
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
      .eq('is_system_role', false)
      .order('name')

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    // Transform the data to flatten permissions
    const transformedRoles = roles?.map((role: any) => ({
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      permissions: role.role_permissions?.map((rp: any) => rp.permissions).filter(Boolean) || []
    }))

    return NextResponse.json({ roles: transformedRoles })

  } catch (error) {
    console.error('Error in roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 