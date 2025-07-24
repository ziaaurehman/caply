import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
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

    // Check if user is admin (only admins can view permissions for role management)
    const userRole = (userOrgMembership.roles as any)?.name
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all permissions grouped by module
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module, action')

    if (error) {
      console.error('Error fetching permissions:', error)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    // Group permissions by module
    const groupedPermissions = permissions?.reduce((acc: any, permission: any) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    }, {})

    return NextResponse.json({ permissions: groupedPermissions })

  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
