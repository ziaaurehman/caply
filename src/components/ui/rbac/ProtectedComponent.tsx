"use client"

import React from 'react';
import { useSession } from 'next-auth/react';
import { UserProfile } from '@/lib/types';
import { hasPermission, hasRole, hasAnyPermission, hasAnyRole, canAccessResource } from '@/utils/rbac';

interface ProtectedComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  // Permission-based protection
  permission?: {
    resource: string;
    action: string;
  };
  permissions?: {
    resource: string;
    action: string;
  }[];
  requireAll?: boolean; // For multiple permissions, require all or any
  // Role-based protection
  role?: string;
  roles?: string[];
  // Resource ownership protection
  resourceOwnerId?: string;
  // Custom check function
  customCheck?: (user: UserProfile | null) => boolean;
}

export default function ProtectedComponent({
  children,
  fallback = null,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  resourceOwnerId,
  customCheck,
}: ProtectedComponentProps) {
  const { data: session } = useSession();
  
  // For now, we'll use session data. In a full implementation, 
  // you'd fetch the full UserProfile with role and permissions
  const user: UserProfile | null = session?.user ? {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    avatar: session.user.avatar || undefined,
    roleId: session.user.role || 'employee',
    role: {
      id: session.user.role || 'employee',
      name: session.user.role || 'Employee',
      description: '',
      permissions: [], // This would be populated from your store
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

  // Check custom condition first
  if (customCheck) {
    if (!customCheck(user)) {
      return <>{fallback}</>;
    }
  }

  // Check single permission
  if (permission) {
    const hasAccess = resourceOwnerId 
      ? canAccessResource(user, permission.resource, permission.action, resourceOwnerId)
      : hasPermission(user, permission.resource, permission.action);
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll 
      ? permissions.every(p => hasPermission(user, p.resource, p.action))
      : permissions.some(p => hasPermission(user, p.resource, p.action));
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  // Check single role
  if (role) {
    if (!hasRole(user, role)) {
      return <>{fallback}</>;
    }
  }

  // Check multiple roles
  if (roles) {
    if (!hasAnyRole(user, roles)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedComponent role="admin" fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function ManagerOrAbove({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedComponent roles={['admin', 'manager']} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function WithPermission({ 
  children, 
  resource, 
  action, 
  fallback,
  resourceOwnerId 
}: { 
  children: React.ReactNode; 
  resource: string; 
  action: string; 
  fallback?: React.ReactNode;
  resourceOwnerId?: string;
}) {
  return (
    <ProtectedComponent 
      permission={{ resource, action }} 
      fallback={fallback}
      resourceOwnerId={resourceOwnerId}
    >
      {children}
    </ProtectedComponent>
  );
} 