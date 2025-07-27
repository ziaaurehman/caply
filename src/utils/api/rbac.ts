import { createClient } from '@/utils/supabase/server';
import { Role, Permission } from '@/lib/types';

export interface UserPermissionData {
  userId: string;
  organizationId: string;
  role: Role;
  permissions: Permission[];
  isSuperAdmin: boolean;
  status: string;
}

export interface PermissionCheckOptions {
  userId: string;
  permission: string;
  organizationId?: string;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  error?: string;
}

export class RBACService {
  private supabase: any;
  private isClient: boolean;

  constructor(supabase?: any) {
    this.supabase = supabase;
    this.isClient = typeof window !== 'undefined';
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      if (this.isClient) {
        // For client-side, we'll use fetch to call our API
        return null;
      } else {
        // For server-side
        this.supabase = await createClient();
      }
    }
    return this.supabase;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ user: any; session: any } | null> {
    try {
      if (this.isClient) {
        // Client-side: This should be handled by auth context
        return null;
      }

      const supabase = await this.getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }

      return { user: session.user, session };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.isClient) {
      // Client-side: This should be handled by auth context
      return false;
    }
    
    const userData = await this.getCurrentUser();
    return userData !== null;
  }

  /**
   * Get user's role and all permissions by user ID
   */
  async getUserPermissions(userId: string): Promise<UserPermissionData | null> {
    try {
      if (this.isClient) {
        // Client-side: Call API endpoint
        const response = await fetch(`/api/users/${userId}/permissions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized - Please login');
          }
          if (response.status === 403) {
            throw new Error('Forbidden - Insufficient permissions');
          }
          throw new Error(`Failed to fetch user permissions: ${response.statusText}`);
        }

        const data: UserPermissionData = await response.json();
        return data;
      }

      // Server-side: Direct database access
      const supabase = await this.getSupabaseClient();

      // Get user's role and organization
      const { data: userRoleData, error: roleError } = await supabase
        .from('organization_members')
        .select(`
          role_id,
          organization_id,
          status,
          roles (
            id,
            name,
            display_name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (roleError || !userRoleData) {
        return null;
      }

      // Get all permissions for the user's role
      const { data: permissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            id,
            name,
            display_name,
            description,
            module,
            action
          )
        `)
        .eq('role_id', userRoleData.role_id);

      if (permissionsError) {
        throw new Error('Failed to fetch permissions');
      }

      // Check if user is super admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error('Failed to fetch user data');
      }

      const userPermissions = permissions?.map((p: any) => p.permissions).filter(Boolean) || [];

      return {
        userId,
        organizationId: userRoleData.organization_id,
        role: userRoleData.roles,
        permissions: userPermissions,
        isSuperAdmin: userData.is_super_admin || false,
        status: userRoleData.status
      };

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(options: PermissionCheckOptions): Promise<boolean> {
    try {
      if (this.isClient) {
        // Client-side: Get user permissions and check locally
        const userData = await this.getUserPermissions(options.userId);
        
        if (!userData) {
          return false;
        }

        // Super admin has all permissions
        if (userData.isSuperAdmin) {
          return true;
        }

        // Check if permission exists in user's permissions
        return userData.permissions.some(p => p.name === options.permission);
      }

      // Server-side: Use database function
      const supabase = await this.getSupabaseClient();
      
      const { data: hasPermission, error } = await supabase.rpc('user_has_permission', {
        user_id: options.userId,
        permission_name: options.permission,
        org_id: options.organizationId || null
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return hasPermission || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific permission (frontend version with result object)
   */
  async hasPermissionWithResult(userId: string, permission: string): Promise<PermissionCheckResult> {
    try {
      const hasPermission = await this.hasPermission({ userId, permission });
      return { hasPermission };
    } catch (error) {
      return { 
        hasPermission: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(userId: string, permissions: string[], organizationId?: string): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const permission of permissions) {
      results[permission] = await this.hasPermission({
        userId,
        permission,
        organizationId
      });
    }

    return results;
  }

  /**
   * Check multiple permissions at once (frontend version with result objects)
   */
  async hasPermissionsWithResult(userId: string, permissions: string[]): Promise<{ [key: string]: PermissionCheckResult }> {
    const results: { [key: string]: PermissionCheckResult } = {};
    
    for (const permission of permissions) {
      results[permission] = await this.hasPermissionWithResult(userId, permission);
    }

    return results;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: string[], organizationId?: string): Promise<boolean> {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission({
        userId,
        permission,
        organizationId
      });
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has any of the specified permissions (frontend version with result object)
   */
  async hasAnyPermissionWithResult(userId: string, permissions: string[]): Promise<PermissionCheckResult> {
    try {
      const hasAnyPermission = await this.hasAnyPermission(userId, permissions);
      return { hasPermission: hasAnyPermission };
    } catch (error) {
      return { 
        hasPermission: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[], organizationId?: string): Promise<boolean> {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission({
        userId,
        permission,
        organizationId
      });
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has all of the specified permissions (frontend version with result object)
   */
  async hasAllPermissionsWithResult(userId: string, permissions: string[]): Promise<PermissionCheckResult> {
    try {
      const hasAllPermissions = await this.hasAllPermissions(userId, permissions);
      return { hasPermission: hasAllPermissions };
    } catch (error) {
      return { 
        hasPermission: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's role
   */
  async getUserRole(userId: string): Promise<Role | null> {
    try {
      const userData = await this.getUserPermissions(userId);
      return userData?.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userData = await this.getUserPermissions(userId);
      return userData?.role?.name === roleName;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      if (this.isClient) {
        const userData = await this.getUserPermissions(userId);
        return userData?.isSuperAdmin || false;
      }

      const supabase = await this.getSupabaseClient();
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', userId)
        .single();

      if (error) {
        return false;
      }

      return userData?.is_super_admin || false;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  /**
   * Check if user is support admin
   */
  async isSupportAdmin(userId: string): Promise<boolean> {
    try {
      if (this.isClient) {
        const userData = await this.getUserPermissions(userId);
        return userData?.role?.name === 'support_admin';
      }

      const supabase = await this.getSupabaseClient();
      
      const { data: isSupportAdmin, error } = await supabase.rpc('user_is_support_admin', {
        user_id: userId
      });

      if (error) {
        return false;
      }

      return isSupportAdmin || false;
    } catch (error) {
      console.error('Error checking support admin status:', error);
      return false;
    }
  }

  /**
   * Get user's organization ID
   */
  async getUserOrganization(userId: string): Promise<string | null> {
    try {
      if (this.isClient) {
        const userData = await this.getUserPermissions(userId);
        return userData?.organizationId || null;
      }

      const supabase = await this.getSupabaseClient();
      
      const { data: orgId, error } = await supabase.rpc('get_user_organization', {
        user_id: userId
      });

      if (error) {
        return null;
      }

      return orgId;
    } catch (error) {
      console.error('Error getting user organization:', error);
      return null;
    }
  }

  /**
   * Get user's organization ID
   */
  async getUserOrganizationId(userId: string): Promise<string | null> {
    return this.getUserOrganization(userId);
  }

  /**
   * Check if user can access a specific module
   */
  async canAccessModule(userId: string, moduleName: string): Promise<boolean> {
    try {
      const userData = await this.getUserPermissions(userId);
      
      if (!userData) {
        return false;
      }

      // Super admin can access everything
      if (userData.isSuperAdmin) {
        return true;
      }

      // Check if user has any permission for the module
      return userData.permissions.some(p => p.module === moduleName);
    } catch (error) {
      console.error('Error checking module access:', error);
      return false;
    }
  }

  /**
   * Get all modules user can access
   */
  async getAccessibleModules(userId: string): Promise<string[]> {
    try {
      const userData = await this.getUserPermissions(userId);
      
      if (!userData) {
        return [];
      }

      // Get unique modules from user's permissions
      const modules = Array.from(new Set(userData.permissions.map(p => p.module)));
      return modules;
    } catch (error) {
      console.error('Error fetching accessible modules:', error);
      return [];
    }
  }

  /**
   * Get user's permissions grouped by module
   */
  async getPermissionsByModule(userId: string): Promise<{ [module: string]: Permission[] }> {
    try {
      const userData = await this.getUserPermissions(userId);
      
      if (!userData) {
        return {};
      }

      const grouped: { [module: string]: Permission[] } = {};
      
      userData.permissions.forEach(permission => {
        if (!grouped[permission.module]) {
          grouped[permission.module] = [];
        }
        grouped[permission.module].push(permission);
      });

      return grouped;
    } catch (error) {
      console.error('Error grouping permissions by module:', error);
      return {};
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles(organizationId?: string): Promise<Role[]> {
    try {
      if (this.isClient) {
        // Client-side: Would need an API endpoint for this
        return [];
      }

      const supabase = await this.getSupabaseClient();
      
      let query = supabase
        .from('roles')
        .select('*')
        .order('display_name');

      if (organizationId) {
        query = query.eq('is_system_role', false);
      }

      const { data: roles, error } = await query;

      if (error) {
        throw new Error('Failed to fetch roles');
      }

      return roles || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      if (this.isClient) {
        // Client-side: Would need an API endpoint for this
        return [];
      }

      const supabase = await this.getSupabaseClient();
      
      const { data: permissions, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        throw new Error('Failed to fetch permissions');
      }

      return permissions || [];
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  }

  /**
   * Validate user access to resource
   */
  async validateAccess(userId: string, permission: string, resourceOrgId?: string): Promise<{
    hasAccess: boolean;
    reason?: string;
  }> {
    // Check if user is super admin (has access to everything)
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return { hasAccess: true };
    }

    // Check if user is support admin (has global read access)
    const isSupportAdmin = await this.isSupportAdmin(userId);
    if (isSupportAdmin && (permission.includes('.read') || permission.includes('.global_'))) {
      return { hasAccess: true };
    }

    // Get user's organization
    const userOrgId = await this.getUserOrganization(userId);
    
    // If resource belongs to a specific organization, check if user belongs to it
    if (resourceOrgId && userOrgId && resourceOrgId !== userOrgId && !isSupportAdmin) {
      return { hasAccess: false, reason: 'User does not belong to resource organization' };
    }

    // Check specific permission
    const hasPermission = await this.hasPermission({
      userId,
      permission,
      organizationId: resourceOrgId || userOrgId || undefined
    });

    return {
      hasAccess: hasPermission,
      reason: hasPermission ? undefined : `User lacks permission: ${permission}`
    };
  }
}

// Export singleton instance
export const rbacService = new RBACService();

// Export convenience functions for backend use
export const getCurrentUser = () => rbacService.getCurrentUser();
export const isAuthenticated = () => rbacService.isAuthenticated();
export const getUserPermissions = (userId: string) => rbacService.getUserPermissions(userId);
export const hasPermission = (options: PermissionCheckOptions) => rbacService.hasPermission(options);
export const hasPermissions = (userId: string, permissions: string[], organizationId?: string) => 
  rbacService.hasPermissions(userId, permissions, organizationId);
export const hasAnyPermission = (userId: string, permissions: string[], organizationId?: string) => 
  rbacService.hasAnyPermission(userId, permissions, organizationId);
export const hasAllPermissions = (userId: string, permissions: string[], organizationId?: string) => 
  rbacService.hasAllPermissions(userId, permissions, organizationId);
export const getAllRoles = (organizationId?: string) => rbacService.getAllRoles(organizationId);
export const getAllPermissions = () => rbacService.getAllPermissions();
export const isSuperAdmin = (userId: string) => rbacService.isSuperAdmin(userId);
export const isSupportAdmin = (userId: string) => rbacService.isSupportAdmin(userId);
export const getUserOrganization = (userId: string) => rbacService.getUserOrganization(userId);
export const validateAccess = (userId: string, permission: string, resourceOrgId?: string) => 
  rbacService.validateAccess(userId, permission, resourceOrgId);

// Export convenience functions for frontend use (with result objects)
export const hasPermissionWithResult = (userId: string, permission: string) => 
  rbacService.hasPermissionWithResult(userId, permission);
export const hasPermissionsWithResult = (userId: string, permissions: string[]) => 
  rbacService.hasPermissionsWithResult(userId, permissions);
export const hasAnyPermissionWithResult = (userId: string, permissions: string[]) => 
  rbacService.hasAnyPermissionWithResult(userId, permissions);
export const hasAllPermissionsWithResult = (userId: string, permissions: string[]) => 
  rbacService.hasAllPermissionsWithResult(userId, permissions);
export const getUserRole = (userId: string) => rbacService.getUserRole(userId);
export const hasRole = (userId: string, roleName: string) => rbacService.hasRole(userId, roleName);
export const getUserOrganizationId = (userId: string) => rbacService.getUserOrganizationId(userId);
export const getPermissionsByModule = (userId: string) => rbacService.getPermissionsByModule(userId);
export const canAccessModule = (userId: string, moduleName: string) => rbacService.canAccessModule(userId, moduleName);
export const getAccessibleModules = (userId: string) => rbacService.getAccessibleModules(userId);
