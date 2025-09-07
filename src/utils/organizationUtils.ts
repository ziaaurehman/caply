import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis'

// Cache TTL in seconds (1 week)
const CACHE_TTL = 604800;

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

interface CachedUserContext {
  userId: string
  organizationId: string
  roleId: string
  roleName: string
  permissions: Permission[]
  status: string
  cached_at: number
}

/**
 * Get user's organization context - membership and role data with Redis caching
 */
export async function getUserOrganizationContext(
  userId: string,
  organizationId: string,
  useCache: boolean = true
): Promise<UserOrganizationContext | null> {
  const cacheKey = `user_org_context:${userId}:${organizationId}`
  
  try {
    // Try cache first if enabled
    if (useCache) {
      const cached = await redisGetJSON<CachedUserContext>(cacheKey)
      if (cached && (Date.now() - cached.cached_at) < (CACHE_TTL * 1000)) {
        return {
          userId: cached.userId,
          organizationId: cached.organizationId,
          membership: {
            id: '', // Not needed for most operations
            organization_id: cached.organizationId,
            user_id: cached.userId,
            role_id: cached.roleId,
            status: cached.status,
            role: {
              id: cached.roleId,
              name: cached.roleName,
              display_name: cached.roleName,
              description: '',
              permissions: cached.permissions
            }
          }
        }
      }
    }

    const supabase = await createClient()

    // Optimized query with selective fields
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
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (error || !membership) {
      return null
    }

    // Get permissions separately for better caching
    const permissions = await getRolePermissions(membership.role_id, useCache)

    const context: UserOrganizationContext = {
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
          description: '',
          permissions
        }
      }
    }

    // Cache the result
    if (useCache) {
      const cacheData: CachedUserContext = {
        userId,
        organizationId,
        roleId: membership.role_id,
        roleName: (membership as any).roles.name,
        permissions,
        status: membership.status,
        cached_at: Date.now()
      }
      await redisSetJSON(cacheKey, cacheData, CACHE_TTL)
    }

    return context

  } catch (error) {
    console.error('Error getting user organization context:', error)
    return null
  }
}

/**
 * Get role permissions with caching
 */
async function getRolePermissions(
  roleId: string, 
  useCache: boolean = true
): Promise<Permission[]> {
  const cacheKey = `role_permissions:${roleId}`
  
  try {
    if (useCache) {
      const cached = await redisGetJSON<Permission[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const supabase = await createClient()
    
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions!inner(
          module,
          action
        )
      `)
      .eq('role_id', roleId)

    if (error) {
      console.error('Error fetching role permissions:', error)
      return []
    }

    const permissionList = permissions?.map((rp: any) => ({
      resource: rp.permissions.module,
      action: rp.permissions.action
    })) || []

    // Cache permissions for 30 minutes (they change less frequently)
    if (useCache) {
      await redisSetJSON(cacheKey, permissionList, 1800)
    }

    return permissionList

  } catch (error) {
    console.error('Error getting role permissions:', error)
    return []
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

/**
 * Get user's organizations with minimal data (for header dropdown)
 */
export async function getUserOrganizationsLite(userId: string): Promise<Array<{
  id: string
  name: string
  logo_url?: string
  role: string
  is_owner: boolean
}>> {
  const cacheKey = `user_orgs_lite:${userId}`
  
  try {
    // Check cache first
    const cached = await redisGetJSON<any[]>(cacheKey)
    if (cached) {
      return cached
    }

    const supabase = await createClient()

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role_id,
        organizations!inner(
          id,
          name,
          logo_url,
          owner_id
        ),
        roles!inner(
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error || !memberships) {
      return []
    }

    const orgs = memberships.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      logo_url: m.organizations.logo_url,
      role: m.roles.display_name,
      is_owner: m.organizations.owner_id === userId
    }))

    // Cache for 24 hours (organizations rarely change)
    await redisSetJSON(cacheKey, orgs, 86400)

    return orgs

  } catch (error) {
    console.error('Error getting user organizations:', error)
    return []
  }
}

/**
 * Prefetch organization context for faster switching
 * Call this when you know user might switch to this organization
 */
export async function prefetchOrganizationContext(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    // This will cache the data for future use
    await getUserOrganizationContext(userId, organizationId, true)
  } catch (error) {
    // Silent fail for prefetching
    console.debug('Prefetch failed for organization context:', error)
  }
}

/**
 * Warm cache for user's most likely organizations
 * Call this after login or when user becomes active
 */
export async function warmOrganizationCaches(userId: string): Promise<void> {
  try {
    // First get the organizations list
    const orgs = await getUserOrganizationsLite(userId)
    
    // Prefetch context for first 3 organizations (most likely to be used)
    const prefetchPromises = orgs.slice(0, 3).map(org => 
      prefetchOrganizationContext(userId, org.id)
    )
    
    // Don't await - let these run in background
    Promise.all(prefetchPromises).catch(error => 
      console.debug('Cache warming failed:', error)
    )
  } catch (error) {
    console.debug('Cache warming failed:', error)
  }
}

 