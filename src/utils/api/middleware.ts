import { NextRequest, NextResponse } from 'next/server';
import { rbacService, validateAccess } from './rbac';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
  };
}

export interface PermissionMiddlewareOptions {
  permission: string;
  resourceOrgId?: string;
  allowSelfAccess?: boolean; // Allow users to access their own resources
  customValidation?: (userId: string, resourceId?: string) => Promise<boolean>;
}

/**
 * Middleware to check if user is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: { id: string; email: string };
  response?: NextResponse;
}> {
  try {
    const userData = await rbacService.getCurrentUser();
    
    if (!userData) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Please login' },
          { status: 401 }
        )
      };
    }

    return {
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}

/**
 * Middleware to check if user has required permission
 */
export async function requirePermission(
  request: NextRequest,
  options: PermissionMiddlewareOptions
): Promise<{
  success: boolean;
  user?: { id: string; email: string; organizationId?: string };
  response?: NextResponse;
}> {
  // First check authentication
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const userId = authResult.user.id;

  try {
    // Get user's organization
    const userOrgId = await rbacService.getUserOrganization(userId);

    // Custom validation if provided
    if (options.customValidation) {
      const customValid = await options.customValidation(userId);
      if (!customValid) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Access denied - Custom validation failed' },
            { status: 403 }
          )
        };
      }
    }

    // Self-access check (e.g., user accessing their own profile)
    if (options.allowSelfAccess) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const resourceUserId = pathParts.find((part, index) => 
        pathParts[index - 1] === 'users' && part !== 'users'
      );
      
      if (resourceUserId === userId) {
        return {
          success: true,
          user: {
            ...authResult.user,
            organizationId: userOrgId || undefined
          }
        };
      }
    }

    // Validate access using the comprehensive validation function
    const accessResult = await validateAccess(
      userId,
      options.permission,
      options.resourceOrgId || userOrgId || undefined
    );

    if (!accessResult.hasAccess) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Access denied - ${accessResult.reason || 'Insufficient permissions'}` },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user: {
        ...authResult.user,
        organizationId: userOrgId || undefined
      }
    };

  } catch (error) {
    console.error('Permission check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Permission validation failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Middleware to check multiple permissions (user must have ANY of them)
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: string[],
  resourceOrgId?: string
): Promise<{
  success: boolean;
  user?: { id: string; email: string; organizationId?: string };
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const userId = authResult.user.id;

  try {
    const userOrgId = await rbacService.getUserOrganization(userId);
    
    // Check if user has any of the required permissions
    const hasAnyPermission = await rbacService.hasAnyPermission(
      userId,
      permissions,
      resourceOrgId || userOrgId || undefined
    );

    if (!hasAnyPermission) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Access denied - Requires any of: ${permissions.join(', ')}` },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user: {
        ...authResult.user,
        organizationId: userOrgId || undefined
      }
    };

  } catch (error) {
    console.error('Permission check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Permission validation failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Middleware to check multiple permissions (user must have ALL of them)
 */
export async function requireAllPermissions(
  request: NextRequest,
  permissions: string[],
  resourceOrgId?: string
): Promise<{
  success: boolean;
  user?: { id: string; email: string; organizationId?: string };
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const userId = authResult.user.id;

  try {
    const userOrgId = await rbacService.getUserOrganization(userId);
    
    // Check if user has all required permissions
    const hasAllPermissions = await rbacService.hasAllPermissions(
      userId,
      permissions,
      resourceOrgId || userOrgId || undefined
    );

    if (!hasAllPermissions) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Access denied - Requires all of: ${permissions.join(', ')}` },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user: {
        ...authResult.user,
        organizationId: userOrgId || undefined
      }
    };

  } catch (error) {
    console.error('Permission check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Permission validation failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Middleware to check if user is super admin
 */
export async function requireSuperAdmin(request: NextRequest): Promise<{
  success: boolean;
  user?: { id: string; email: string; organizationId?: string };
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const userId = authResult.user.id;

  try {
    const isSuperAdmin = await rbacService.isSuperAdmin(userId);
    
    if (!isSuperAdmin) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Access denied - Super admin required' },
          { status: 403 }
        )
      };
    }

    const userOrgId = await rbacService.getUserOrganization(userId);

    return {
      success: true,
      user: {
        ...authResult.user,
        organizationId: userOrgId || undefined
      }
    };

  } catch (error) {
    console.error('Super admin check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Permission validation failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Middleware to check if user has a specific role
 */
export async function requireRole(
  request: NextRequest,
  roleName: string
): Promise<{
  success: boolean;
  user?: { id: string; email: string; organizationId?: string };
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const userId = authResult.user.id;

  try {
    const userPermissions = await rbacService.getUserPermissions(userId);
    
    if (!userPermissions || userPermissions.role.name !== roleName) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Access denied - Role '${roleName}' required` },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user: {
        ...authResult.user,
        organizationId: userPermissions.organizationId
      }
    };

  } catch (error) {
    console.error('Role check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Role validation failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Helper function to create a protected API route
 */
export function createProtectedRoute<T extends any[]>(
  handler: (request: NextRequest, user: { id: string; email: string; organizationId?: string }, ...args: T) => Promise<NextResponse>,
  middleware: (request: NextRequest, ...args: T) => Promise<{
    success: boolean;
    user?: { id: string; email: string; organizationId?: string };
    response?: NextResponse;
  }>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const middlewareResult = await middleware(request, ...args);
    
    if (!middlewareResult.success) {
      return middlewareResult.response || NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!middlewareResult.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    try {
      return await handler(request, middlewareResult.user, ...args);
    } catch (error) {
      console.error('Protected route handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Convenience function to create route with permission check
 */
export function withPermission(
  permission: string,
  options?: Omit<PermissionMiddlewareOptions, 'permission'>
) {
  return (request: NextRequest) => requirePermission(request, { permission, ...options });
}

/**
 * Convenience function to create route with multiple permission check (ANY)
 */
export function withAnyPermission(permissions: string[], resourceOrgId?: string) {
  return (request: NextRequest) => requireAnyPermission(request, permissions, resourceOrgId);
}

/**
 * Convenience function to create route with multiple permission check (ALL)
 */
export function withAllPermissions(permissions: string[], resourceOrgId?: string) {
  return (request: NextRequest) => requireAllPermissions(request, permissions, resourceOrgId);
}

/**
 * Convenience function to create route with role check
 */
export function withRole(roleName: string) {
  return (request: NextRequest) => requireRole(request, roleName);
}

/**
 * Convenience function to create route with super admin check
 */
export function withSuperAdmin() {
  return (request: NextRequest) => requireSuperAdmin(request);
} 