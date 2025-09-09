// Client-side organization utilities
// These functions work with the organizationStore data in client components

interface Permission {
  resource: string;
  action: string;
}

interface OrganizationContext {
  membership: {
    role: {
      name: string;
      permissions: Permission[];
    };
  };
}

/**
 * Check if user has specific permission in organization (client-side)
 */
export function hasPermission(
  context: OrganizationContext | null,
  resource: string,
  action: string
): boolean {
  if (!context?.membership?.role?.permissions) {
    return false;
  }

  return context.membership.role.permissions.some(
    p => p.resource === resource && p.action === action
  );
}

/**
 * Check if user has specific role in organization (client-side)
 */
export function hasRole(
  context: OrganizationContext | null,
  roleName: string
): boolean {
  return context?.membership?.role?.name === roleName;
}

/**
 * Check if user has any of the specified roles (client-side)
 */
export function hasAnyRole(
  context: OrganizationContext | null,
  roleNames: string[]
): boolean {
  if (!context?.membership?.role?.name) {
    return false;
  }
  
  return roleNames.includes(context.membership.role.name);
}

/**
 * Get user's permissions array (client-side)
 */
export function getUserPermissions(
  context: OrganizationContext | null
): Permission[] {
  return context?.membership?.role?.permissions || [];
}

/**
 * Check if user is admin (client-side)
 */
export function isAdmin(context: OrganizationContext | null): boolean {
  return hasRole(context, "admin");
}

/**
 * Check if user is manager or above (client-side)
 */
export function isManagerOrAbove(context: OrganizationContext | null): boolean {
  return hasAnyRole(context, ["admin", "manager"]);
}

/**
 * Check if user can manage roles (client-side)
 */
export function canManageRoles(context: OrganizationContext | null): boolean {
  return isAdmin(context) || hasPermission(context, "roles", "manage");
}

/**
 * Check if user can view leave (client-side)
 */
export function canViewLeave(context: OrganizationContext | null): boolean {
  return hasPermission(context, "leave", "read") || isManagerOrAbove(context);
}
