import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redisGetJSON, redisSetJSON } from '@/utils/redis'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'

// GET /api/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'global'
    const supabase = await createClient()

    // Try cache first: scope by organization for consistency with access rules
    const cacheKey = `permissions:by-module:${organizationId}`
    const cached = await redisGetJSON<Record<string, any[]>>(cacheKey)
    if (cached) {
      return NextResponse.json({ permissions: cached })
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

    // Cache grouped permissions (15 days)
    try {
      await redisSetJSON(cacheKey, groupedPermissions, 1296000)
    } catch (e) {
      console.warn('Failed to cache permissions:', e)
    }

    return NextResponse.json({ permissions: groupedPermissions })

  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
