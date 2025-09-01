import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { getUserOrganizationContext, getUserOrganizationsLite } from '@/utils/organizationUtils'

/**
 * Unified API to get organization context and user organizations
 * This replaces multiple API calls with a single efficient endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const includePermissions = searchParams.get('includePermissions') === 'true'
    const includeOrganizations = searchParams.get('includeOrganizations') === 'true'

    const result: any = {
      userId: session.user.id
    }

    // Get current organization context if specified
    if (organizationId) {
      const context = await getUserOrganizationContext(
        session.user.id,
        organizationId
      )
      
      if (context) {
        result.currentOrganization = {
          id: context.organizationId,
          membership: {
            role: {
              id: context.membership.role.id,
              name: context.membership.role.name,
              display_name: context.membership.role.display_name
            },
            status: context.membership.status
          }
        }

        // Include permissions if requested
        if (includePermissions) {
          const permissions: { [key: string]: boolean } = {}
          context.membership.role.permissions.forEach(p => {
            permissions[`${p.resource}:${p.action}`] = true
          })
          result.permissions = permissions
        }
      }
    }

    // Get user's organizations if requested
    if (includeOrganizations) {
      const organizations = await getUserOrganizationsLite(session.user.id)
      result.organizations = organizations
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in organization context API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update organization context cache
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, clearCache } = await request.json()

    if (clearCache) {
      // Force refresh by bypassing cache
      const context = await getUserOrganizationContext(
        session.user.id,
        organizationId,
        false // useCache = false
      )

      return NextResponse.json({ 
        success: true,
        context: context ? {
          organizationId: context.organizationId,
          role: context.membership.role.name
        } : null
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating organization context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}