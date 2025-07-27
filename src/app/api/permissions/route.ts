import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from headers
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 })
    }

    // Validate organization access and permissions (admin only)
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'roles', action: 'read' }
    )

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()

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
