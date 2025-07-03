import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserProfile } from '@/lib/types';
import { hasPermission, hasRole, canAccessResource } from './index';

// Route protection configuration
export interface RouteProtection {
  permission?: {
    resource: string;
    action: string;
  };
  role?: string;
  roles?: string[];
  customCheck?: (user: UserProfile | null) => boolean;
}

// Protected routes configuration
export const PROTECTED_ROUTES: Record<string, RouteProtection> = {
  // Settings routes
  '/settings/roles': {
    permission: { resource: 'roles', action: 'read' }
  },
  '/settings/users': {
    permission: { resource: 'users', action: 'read' }
  },
  '/settings/invitations': {
    permission: { resource: 'users', action: 'create' }
  },
  '/settings/organization': {
    permission: { resource: 'settings', action: 'update' }
  },

  // API routes
  '/api/roles': {
    permission: { resource: 'roles', action: 'read' }
  },
  '/api/invitations': {
    permission: { resource: 'users', action: 'create' }
  },
  '/api/users': {
    permission: { resource: 'users', action: 'read' }
  },

  // Admin only routes
  '/admin': {
    role: 'admin'
  },

  // Manager or above routes
  '/reports/advanced': {
    roles: ['admin', 'manager']
  }
};

// Middleware function to check route access
export async function checkRouteAccess(
  request: NextRequest,
  routeConfig: RouteProtection
): Promise<boolean> {
  // Get user from JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return false;
  }

  // Convert token to UserProfile (simplified for demo)
  const user: UserProfile | null = token ? {
    id: token.id as string,
    name: token.name || '',
    email: token.email || '',
    avatar: token.avatar as string | undefined,
    roleId: token.role as string || 'employee',
    role: {
      id: token.role as string || 'employee',
      name: token.role as string || 'Employee',
      description: '',
      permissions: [], // Would be populated from database/store
      createdAt: '',
      updatedAt: '',
    },
    organizationId: '1', // Default for demo
    organization: {
      id: '1',
      name: 'Demo Organization',
      settings: {
        allowSelfRegistration: false,
        defaultRole: 'employee',
      },
      createdAt: '',
      updatedAt: '',
    },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  } : null;

  // Check custom condition
  if (routeConfig.customCheck) {
    return routeConfig.customCheck(user);
  }

  // Check permission
  if (routeConfig.permission) {
    return hasPermission(user, routeConfig.permission.resource, routeConfig.permission.action);
  }

  // Check single role
  if (routeConfig.role) {
    return hasRole(user, routeConfig.role);
  }

  // Check multiple roles
  if (routeConfig.roles) {
    return routeConfig.roles.some(role => hasRole(user, role));
  }

  return true; // Default allow if no restrictions
}

// API route protection wrapper
export function withAuth(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  protection?: RouteProtection
) {
  return async (req: NextRequest, context: any) => {
    if (protection) {
      const hasAccess = await checkRouteAccess(req, protection);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return handler(req, context);
  };
}

// Page protection wrapper (for use in layouts or pages)
export async function requireAuth(
  request: NextRequest,
  protection: RouteProtection
): Promise<boolean> {
  return checkRouteAccess(request, protection);
}

// Helper to get user from request
export async function getUserFromRequest(request: NextRequest): Promise<UserProfile | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return null;
  }

  // Convert token to UserProfile (simplified for demo)
  return {
    id: token.id as string,
    name: token.name || '',
    email: token.email || '',
    avatar: token.avatar as string | undefined,
    roleId: token.role as string || 'employee',
    role: {
      id: token.role as string || 'employee',
      name: token.role as string || 'Employee',
      description: '',
      permissions: [], // Would be populated from database/store
      createdAt: '',
      updatedAt: '',
    },
    organizationId: '1', // Default for demo
    organization: {
      id: '1',
      name: 'Demo Organization',
      settings: {
        allowSelfRegistration: false,
        defaultRole: 'employee',
      },
      createdAt: '',
      updatedAt: '',
    },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
} 