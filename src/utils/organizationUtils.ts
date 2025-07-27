import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

interface Permission {
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  permissions: Permission[]
}

interface OrganizationMembership {
  id: string
  organization_id: string
  user_id: string
  role_id: string
  status: string
  role: Role
}

interface UserOrganizationContext {
  userId: string
  organizationId: string
  membership: OrganizationMembership
}

/**
 * Get user's organization context - membership and role data
 */
export async function getUserOrganizationContext(
  userId: string,
  organizationId: string
): Promise<UserOrganizationContext | null> {
  try {
    const supabase = await createClient()

    const { data: membership, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        role_id,
        status,
        roles!inner(
          id,
          name,
          display_name,
          description,
          role_permissions!inner(
            permissions!inner(
              module,
              action
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (error || !membership) {
      return null
    }

    return {
      userId,
      organizationId,
      membership: {
        id: membership.id,
        organization_id: membership.organization_id,
        user_id: membership.user_id,
        role_id: membership.role_id,
        status: membership.status,
        role: {
          id: (membership as any).roles.id,
          name: (membership as any).roles.name,
          display_name: (membership as any).roles.display_name,
          description: (membership as any).roles.description,
          permissions: (membership as any).roles.role_permissions?.map((rp: any) => ({
            resource: rp.permissions.module,
            action: rp.permissions.action
          })) || []
        }
      }
    }
  } catch (error) {
    console.error('Error getting user organization context:', error)
    return null
  }
}

/**
 * Check if user has specific permission in organization
 */
export function hasPermission(
  context: UserOrganizationContext | null,
  resource: string,
  action: string
): boolean {
  if (!context?.membership?.role?.permissions) {
    return false
  }

  return context.membership.role.permissions.some(
    p => p.resource === resource && p.action === action
  )
}

/**
 * Check if user has specific role in organization
 */
export function hasRole(
  context: UserOrganizationContext | null,
  roleName: string
): boolean {
  return context?.membership?.role?.name === roleName
}

/**
 * Check if user is organization owner
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      return false
    }

    return organization.owner_id === userId
  } catch (error) {
    console.error('Error checking organization ownership:', error)
    return false
  }
}

/**
 * Middleware function to validate organization access for API routes
 */
export async function validateOrganizationAccess(
  requiredPermission?: { resource: string; action: string },
  requiredRole?: string
): Promise<{
  success: boolean
  context?: UserOrganizationContext
  error?: string
  status?: number
}> {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        status: 401
      }
    }

    // For now, we'll use the first organization the user belongs to
    // Later this should come from request headers or body
    const supabase = await createClient()
    
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (orgError || !userOrg) {
      return {
        success: false,
        error: 'No organization found',
        status: 404
      }
    }

    const context = await getUserOrganizationContext(
      session.user.id,
      userOrg.organization_id
    )

    if (!context) {
      return {
        success: false,
        error: 'Organization access denied',
        status: 403
      }
    }

    // Check required permission
    if (requiredPermission && !hasPermission(context, requiredPermission.resource, requiredPermission.action)) {
      return {
        success: false,
        error: `Permission denied: ${requiredPermission.resource}:${requiredPermission.action}`,
        status: 403
      }
    }

    // Check required role
    if (requiredRole && !hasRole(context, requiredRole)) {
      return {
        success: false,
        error: `Role required: ${requiredRole}`,
        status: 403
      }
    }

    return {
      success: true,
      context
    }

  } catch (error) {
    console.error('Error validating organization access:', error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
}

/**
 * Enhanced validation that accepts organizationId from request
 */
export async function validateOrganizationAccessWithId(
  organizationId: string,
  requiredPermission?: { resource: string; action: string },
  requiredRole?: string
): Promise<{
  success: boolean
  context?: UserOrganizationContext
  error?: string
  status?: number
}> {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        status: 401
      }
    }

    const context = await getUserOrganizationContext(
      session.user.id,
      organizationId
    )

    if (!context) {
      return {
        success: false,
        error: 'Organization access denied',
        status: 403
      }
    }

    // Check required permission
    if (requiredPermission && !hasPermission(context, requiredPermission.resource, requiredPermission.action)) {
      return {
        success: false,
        error: `Permission denied: ${requiredPermission.resource}:${requiredPermission.action}`,
        status: 403
      }
    }

    // Check required role
    if (requiredRole && !hasRole(context, requiredRole)) {
      return {
        success: false,
        error: `Role required: ${requiredRole}`,
        status: 403
      }
    }

    return {
      success: true,
      context
    }

  } catch (error) {
    console.error('Error validating organization access:', error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
} 