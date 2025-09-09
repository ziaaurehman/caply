import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { getUserOrganizationContext, getUserOrganizationsLite } from '@/utils/organizationUtils'

/**
 * Unified API to get organization context and user organizations
 * This replaces multiple API calls with a single efficient endpoint
 */
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/context/organization - Starting request')
  console.log('📝 Request URL:', request.url)
  console.log('🔍 Request headers:', {
    authorization: request.headers.get('authorization'),
    cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
    userAgent: request.headers.get('user-agent')
  })
  
  try {
    console.log('🔍 Auth config:', {
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      secretLength: process.env.NEXTAUTH_SECRET?.length,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    })
    
    const session = await getServerSession(authConfig)
    console.log('🔍 Session data:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : [],
      sessionUser: session?.user
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found, returning 401')
      console.log('❌ Session details:', {
        session: session,
        user: session?.user,
        userId: session?.user?.id
      })
      
      // Try to get token directly to debug
      try {
        const { getToken } = await import('next-auth/jwt')
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
        console.log('🔍 Direct token check:', {
          hasToken: !!token,
          tokenId: token?.id,
          tokenEmail: token?.email
        })
      } catch (tokenError) {
        console.log('❌ Error getting token directly:', tokenError)
      }
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const includePermissions = searchParams.get('includePermissions') === 'true'
    const includeOrganizations = searchParams.get('includeOrganizations') === 'true'

    console.log('🔍 Request parameters:', {
      organizationId,
      includePermissions,
      includeOrganizations,
      allParams: Object.fromEntries(searchParams.entries())
    })

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
              display_name: context.membership.role.display_name,
              permissions: context.membership.role.permissions || []
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
      console.log('🔍 Fetching user organizations for user:', session.user.id)
      try {
        const organizations = await getUserOrganizationsLite(session.user.id)
        console.log('✅ User organizations fetched:', {
          count: organizations.length,
          organizations: organizations.map(org => ({ id: org.id, name: org.name, role: org.role }))
        })
        result.organizations = organizations
      } catch (orgError) {
        console.error('❌ Error fetching user organizations:', orgError)
        result.organizations = []
      }
    }

    console.log('✅ Returning result:', {
      hasCurrentOrg: !!result.currentOrganization,
      orgCount: result.organizations?.length || 0,
      hasPermissions: !!result.permissions
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Error in organization context API:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
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