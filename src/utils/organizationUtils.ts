import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

interface Permission {
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
}

interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  status: string;
  role: Role;
}

interface UserOrganizationContext {
  userId: string;
  organizationId: string;
  membership: OrganizationMembership;
}

interface CachedUserContext {
  userId: string;
  organizationId: string;
  roleId: string;
  roleName: string;
  permissions: Permission[];
  status: string;
  cached_at: number;
}

export async function getUserOrganizationContext(
  userId: string,
  organizationId: string,
  useCache: boolean = true
): Promise<UserOrganizationContext | null> {
  try {
    // Get membership with role information
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        status: "active",
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return null;
    }

    // Get permissions separately for better caching
    const permissions = await getRolePermissions(membership.roleId, useCache);

    const context: UserOrganizationContext = {
      userId,
      organizationId,
      membership: {
        id: membership.id,
        organization_id: membership.organizationId,
        user_id: membership.userId,
        role_id: membership.roleId,
        status: membership.status,
        role: {
          id: membership.role.id,
          name: membership.role.name,
          display_name: membership.role.displayName,
          description: membership.role.description || "",
          permissions,
        },
      },
    };

    return context;
  } catch (error) {
    console.error("Error getting user organization context:", error);
    return null;
  }
}

/**
 * Get role permissions with caching
 */
async function getRolePermissions(
  roleId: string,
  useCache: boolean = true
): Promise<Permission[]> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId,
      },
      include: {
        permission: true,
      },
    });

    const permissionList = rolePermissions.map((rp) => ({
      resource: rp.permission.module,
      action: rp.permission.action,
    }));

    return permissionList;
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
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
    console.log("❌ No permissions found in context");
    return false;
  }

  const hasPermission = context.membership.role.permissions.some(
    (p) => p.resource === resource && p.action === action
  );

  return hasPermission;
}

/**
 * Check if user has specific role in organization
 */
export function hasRole(
  context: UserOrganizationContext | null,
  roleName: string
): boolean {
  return context?.membership?.role?.name === roleName;
}

/**
 * Check if user is organization owner
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerId: true },
    });

    if (!organization) {
      return false;
    }

    return organization.ownerId === userId;
  } catch (error) {
    console.error("Error checking organization ownership:", error);
    return false;
  }
}

/**
 * Middleware function to validate organization access for API routes
 */
export async function validateOrganizationAccess(
  requiredPermission?: { resource: string; action: string },
  requiredRole?: string
): Promise<{
  success: boolean;
  context?: UserOrganizationContext;
  error?: string;
  status?: number;
}> {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        status: 401,
      };
    }

    // For now, we'll use the first organization the user belongs to
    // Later this should come from request headers or body
    const userOrg = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
      select: {
        organizationId: true,
      },
    });

    if (!userOrg) {
      return {
        success: false,
        error: "No organization found",
        status: 404,
      };
    }

    const context = await getUserOrganizationContext(
      session.user.id,
      userOrg.organizationId
    );

    if (!context) {
      return {
        success: false,
        error: "Organization access denied",
        status: 403,
      };
    }

    // Check required permission
    if (
      requiredPermission &&
      !hasPermission(
        context,
        requiredPermission.resource,
        requiredPermission.action
      )
    ) {
      return {
        success: false,
        error: `Permission denied: ${requiredPermission.resource}:${requiredPermission.action}`,
        status: 403,
      };
    }

    // Check required role
    if (requiredRole && !hasRole(context, requiredRole)) {
      return {
        success: false,
        error: `Role required: ${requiredRole}`,
        status: 403,
      };
    }

    return {
      success: true,
      context,
    };
  } catch (error) {
    console.error("Error validating organization access:", error);
    return {
      success: false,
      error: "Internal server error",
      status: 500,
    };
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
  success: boolean;
  context?: UserOrganizationContext;
  error?: string;
  status?: number;
}> {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        status: 401,
      };
    }

    const context = await getUserOrganizationContext(
      session.user.id,
      organizationId
    );

    if (!context) {
      return {
        success: false,
        error: "Organization access denied",
        status: 403,
      };
    }

    // Check required permission
    if (requiredPermission) {
      const hasRequiredPermission = hasPermission(
        context,
        requiredPermission.resource,
        requiredPermission.action
      );

      // Allow admin and manager users even without specific permissions (fallback for missing DB data)
      if (!hasRequiredPermission) {
        return {
          success: false,
          error: `Permission denied: ${requiredPermission.resource}:${requiredPermission.action}`,
          status: 403,
        };
      }
    }

    // Check required role
    if (requiredRole && !hasRole(context, requiredRole)) {
      return {
        success: false,
        error: `Role required: ${requiredRole}`,
        status: 403,
      };
    }

    return {
      success: true,
      context,
    };
  } catch (error) {
    console.error("Error validating organization access:", error);
    return {
      success: false,
      error: "Internal server error",
      status: 500,
    };
  }
}

/**
 * Get user's organizations with minimal data (for header dropdown)
 */
export async function getUserOrganizationsLite(userId: string): Promise<
  Array<{
    id: string;
    name: string;
    logo_url?: string;
    role: string;
    is_owner: boolean;
  }>
> {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: "active",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            ownerId: true,
          },
        },
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
    });

    const orgs = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      logo_url: m.organization.logoUrl || undefined,
      role: m.role.displayName,
      is_owner: m.organization.ownerId === userId,
    }));

    return orgs;
  } catch (error) {
    console.error("Error getting user organizations:", error);
    return [];
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
    await getUserOrganizationContext(userId, organizationId, true);
  } catch (error) {
    // Silent fail for prefetching
    console.debug("Prefetch failed for organization context:", error);
  }
}

/**
 * Warm cache for user's most likely organizations
 * Call this after login or when user becomes active
 */
export async function warmOrganizationCaches(userId: string): Promise<void> {
  try {
    // First get the organizations list
    const orgs = await getUserOrganizationsLite(userId);

    // Prefetch context for first 3 organizations (most likely to be used)
    const prefetchPromises = orgs
      .slice(0, 3)
      .map((org) => prefetchOrganizationContext(userId, org.id));

    // Don't await - let these run in background
    Promise.all(prefetchPromises).catch((error) =>
      console.debug("Cache warming failed:", error)
    );
  } catch (error) {
    console.debug("Cache warming failed:", error);
  }
}
