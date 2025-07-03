import { UserProfile, Permission, Role } from '@/lib/types';

// Permission checking functions
export const hasPermission = (
  user: UserProfile | null, 
  resource: string, 
  action: string
): boolean => {
  if (!user || !user.role) {
    return false;
  }

  // Check if user has the specific permission
  return user.role.permissions.some(
    permission => permission.resource === resource && permission.action === action
  );
};

export const hasAnyPermission = (
  user: UserProfile | null, 
  permissions: { resource: string; action: string }[]
): boolean => {
  if (!user || !user.role) {
    return false;
  }

  return permissions.some(({ resource, action }) => 
    hasPermission(user, resource, action)
  );
};

export const hasAllPermissions = (
  user: UserProfile | null, 
  permissions: { resource: string; action: string }[]
): boolean => {
  if (!user || !user.role) {
    return false;
  }

  return permissions.every(({ resource, action }) => 
    hasPermission(user, resource, action)
  );
};

// Role checking functions
export const hasRole = (user: UserProfile | null, roleId: string): boolean => {
  if (!user || !user.role) {
    return false;
  }

  return user.role.id === roleId;
};

export const hasAnyRole = (user: UserProfile | null, roleIds: string[]): boolean => {
  if (!user || !user.role) {
    return false;
  }

  return roleIds.includes(user.role.id);
};

// Resource ownership checking
export const isResourceOwner = (
  user: UserProfile | null, 
  resourceOwnerId: string
): boolean => {
  if (!user) {
    return false;
  }

  return user.id === resourceOwnerId;
};

// Combined permission and ownership checking
export const canAccessResource = (
  user: UserProfile | null,
  resource: string,
  action: string,
  resourceOwnerId?: string
): boolean => {
  if (!user) {
    return false;
  }

  // Check if user has the permission
  const hasRequiredPermission = hasPermission(user, resource, action);
  
  // If no ownership is required, just check permission
  if (!resourceOwnerId) {
    return hasRequiredPermission;
  }

  // For certain resources, users can access their own even without explicit permission
  const ownResourceActions = ['read', 'update'];
  const isOwner = isResourceOwner(user, resourceOwnerId);
  
  if (isOwner && ownResourceActions.includes(action)) {
    // Users can always read/update their own resources for certain types
    const selfManagedResources = ['timesheets', 'leave', 'expenses', 'users'];
    if (selfManagedResources.includes(resource)) {
      return true;
    }
  }

  return hasRequiredPermission;
};

// Organization membership checking
export const isSameOrganization = (
  user: UserProfile | null, 
  targetOrganizationId: string
): boolean => {
  if (!user) {
    return false;
  }

  return user.organizationId === targetOrganizationId;
};

// Admin checking
export const isAdmin = (user: UserProfile | null): boolean => {
  return hasRole(user, 'admin');
};

export const isManager = (user: UserProfile | null): boolean => {
  return hasAnyRole(user, ['admin', 'manager']);
};

// Permission hierarchy - used for UI display and access control
export const getPermissionLevel = (user: UserProfile | null): number => {
  if (!user || !user.role) {
    return 0;
  }

  if (hasRole(user, 'admin')) {
    return 4;
  }
  
  if (hasRole(user, 'manager')) {
    return 3;
  }
  
  if (hasRole(user, 'project-lead')) {
    return 2;
  }
  
  return 1; // Basic employee or other roles
};

// Helper to check if user can manage another user
export const canManageUser = (
  currentUser: UserProfile | null, 
  targetUser: UserProfile | null
): boolean => {
  if (!currentUser || !targetUser) {
    return false;
  }

  // Can't manage users from different organizations
  if (!isSameOrganization(currentUser, targetUser.organizationId)) {
    return false;
  }

  // Check if has user management permission
  if (!hasPermission(currentUser, 'users', 'update')) {
    return false;
  }

  // Prevent managing users with higher or equal permission level
  const currentLevel = getPermissionLevel(currentUser);
  const targetLevel = getPermissionLevel(targetUser);
  
  return currentLevel > targetLevel;
};

// Helper to get allowed actions for a resource
export const getAllowedActions = (
  user: UserProfile | null, 
  resource: string,
  resourceOwnerId?: string
): string[] => {
  if (!user || !user.role) {
    return [];
  }

  const allowedActions: string[] = [];
  
  // Get all possible actions for this resource type
  const allActions = ['create', 'read', 'update', 'delete', 'approve', 'manage', 'assign', 'send', 'export'];
  
  for (const action of allActions) {
    if (canAccessResource(user, resource, action, resourceOwnerId)) {
      allowedActions.push(action);
    }
  }
  
  return allowedActions;
};

// Export commonly used permission checks as constants
export const PermissionChecks = {
  // User management
  canCreateUsers: (user: UserProfile | null) => hasPermission(user, 'users', 'create'),
  canViewUsers: (user: UserProfile | null) => hasPermission(user, 'users', 'read'),
  canUpdateUsers: (user: UserProfile | null) => hasPermission(user, 'users', 'update'),
  canDeleteUsers: (user: UserProfile | null) => hasPermission(user, 'users', 'delete'),
  
  // Project management
  canCreateProjects: (user: UserProfile | null) => hasPermission(user, 'projects', 'create'),
  canViewProjects: (user: UserProfile | null) => hasPermission(user, 'projects', 'read'),
  canUpdateProjects: (user: UserProfile | null) => hasPermission(user, 'projects', 'update'),
  canDeleteProjects: (user: UserProfile | null) => hasPermission(user, 'projects', 'delete'),
  canManageProjects: (user: UserProfile | null) => hasPermission(user, 'projects', 'manage'),
  
  // Financial management
  canCreateEstimates: (user: UserProfile | null) => hasPermission(user, 'estimates', 'create'),
  canSendEstimates: (user: UserProfile | null) => hasPermission(user, 'estimates', 'send'),
  canCreateInvoices: (user: UserProfile | null) => hasPermission(user, 'invoices', 'create'),
  canSendInvoices: (user: UserProfile | null) => hasPermission(user, 'invoices', 'send'),
  canApproveExpenses: (user: UserProfile | null) => hasPermission(user, 'expenses', 'approve'),
  
  // Approval permissions
  canApproveTimesheets: (user: UserProfile | null) => hasPermission(user, 'timesheets', 'approve'),
  canApproveLeave: (user: UserProfile | null) => hasPermission(user, 'leave', 'approve'),
  
  // Role and settings
  canManageRoles: (user: UserProfile | null) => hasPermission(user, 'roles', 'update'),
  canUpdateSettings: (user: UserProfile | null) => hasPermission(user, 'settings', 'update'),
  
  // Reports
  canViewReports: (user: UserProfile | null) => hasPermission(user, 'reports', 'read'),
  canExportReports: (user: UserProfile | null) => hasPermission(user, 'reports', 'export'),
} as const; 