'use client';

import React, { useEffect, useState } from 'react';
import { 
  hasPermissionWithResult, 
  hasAnyPermissionWithResult, 
  hasAllPermissionsWithResult,
  hasRole,
  isSuperAdmin,
  canAccessModule,
  getUserPermissions,
  rbacService
} from '@/utils/api/rbac';
import { useRBACStore } from '@/utils/api/rbac-store';

interface ProtectedComponentProps {
  userId: string;
}

export function ProtectedComponent({ userId }: ProtectedComponentProps) {
  const [permissions, setPermissions] = useState<{
    canViewProjects: boolean;
    canCreateProjects: boolean;
    canManageUsers: boolean;
    hasAnyAdminPermission: boolean;
    hasAllProjectPermissions: boolean;
    isAdmin: boolean;
    isSuperUser: boolean;
    canAccessProjectsModule: boolean;
  }>({
    canViewProjects: false,
    canCreateProjects: false,
    canManageUsers: false,
    hasAnyAdminPermission: false,
    hasAllProjectPermissions: false,
    isAdmin: false,
    isSuperUser: false,
    canAccessProjectsModule: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Using the RBAC store
  const { 
    currentUser, 
    fetchCurrentUserPermissions, 
    hasPermission: storeHasPermission 
  } = useRBACStore();

  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Method 1: Using direct utility functions
        const [
          canViewProjects,
          canCreateProjects,
          canManageUsers,
          hasAnyAdminPermission,
          hasAllProjectPermissions,
          isAdmin,
          isSuperUser,
          canAccessProjectsModule
        ] = await Promise.all([
          hasPermissionWithResult(userId, 'projects.read'),
          hasPermissionWithResult(userId, 'projects.create'),
          hasPermissionWithResult(userId, 'users.update'),
          hasAnyPermissionWithResult(userId, ['users.create', 'users.delete', 'roles.create']),
          hasAllPermissionsWithResult(userId, ['projects.read', 'projects.create', 'projects.update']),
          hasRole(userId, 'admin'),
          isSuperAdmin(userId),
          canAccessModule(userId, 'projects')
        ]);

        setPermissions({
          canViewProjects: canViewProjects.hasPermission,
          canCreateProjects: canCreateProjects.hasPermission,
          canManageUsers: canManageUsers.hasPermission,
          hasAnyAdminPermission: hasAnyAdminPermission.hasPermission,
          hasAllProjectPermissions: hasAllProjectPermissions.hasPermission,
          isAdmin,
          isSuperUser,
          canAccessProjectsModule
        });

        // Method 2: Using the store to fetch user permissions
        await fetchCurrentUserPermissions(userId);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check permissions');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      checkPermissions();
    }
  }, [userId, fetchCurrentUserPermissions]);

  if (isLoading) {
    return <div className="p-4">Loading permissions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Permission Check Results</h2>
      
      {/* Current User Info from Store */}
      {currentUser && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current User (from Store)</h3>
          <p><strong>User ID:</strong> {currentUser.userId}</p>
          <p><strong>Role:</strong> {currentUser.role.display_name}</p>
          <p><strong>Organization:</strong> {currentUser.organizationId}</p>
          <p><strong>Super Admin:</strong> {currentUser.isSuperAdmin ? 'Yes' : 'No'}</p>
          <p><strong>Total Permissions:</strong> {currentUser.permissions.length}</p>
        </div>
      )}

      {/* Permission Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PermissionCard
          title="View Projects"
          hasPermission={permissions.canViewProjects}
          description="Can view project information"
        />
        
        <PermissionCard
          title="Create Projects"
          hasPermission={permissions.canCreateProjects}
          description="Can create new projects"
        />
        
        <PermissionCard
          title="Manage Users"
          hasPermission={permissions.canManageUsers}
          description="Can update user information"
        />
        
        <PermissionCard
          title="Any Admin Permission"
          hasPermission={permissions.hasAnyAdminPermission}
          description="Has at least one admin permission"
        />
        
        <PermissionCard
          title="All Project Permissions"
          hasPermission={permissions.hasAllProjectPermissions}
          description="Has all project-related permissions"
        />
        
        <PermissionCard
          title="Admin Role"
          hasPermission={permissions.isAdmin}
          description="Has admin role"
        />
        
        <PermissionCard
          title="Super Admin"
          hasPermission={permissions.isSuperUser}
          description="Is a super administrator"
        />
        
        <PermissionCard
          title="Access Projects Module"
          hasPermission={permissions.canAccessProjectsModule}
          description="Can access the projects module"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-x-4">
        {permissions.canViewProjects && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            View Projects
          </button>
        )}
        
        {permissions.canCreateProjects && (
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Create Project
          </button>
        )}
        
        {permissions.canManageUsers && (
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Manage Users
          </button>
        )}
        
        {permissions.isSuperUser && (
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Super Admin Panel
          </button>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-4">
        <button 
          onClick={() => rbacService.getUserPermissions(userId)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Permissions
        </button>
      </div>
    </div>
  );
}

interface PermissionCardProps {
  title: string;
  hasPermission: boolean;
  description: string;
}

function PermissionCard({ title, hasPermission, description }: PermissionCardProps) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      hasPermission 
        ? 'border-green-200 bg-green-50' 
        : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          hasPermission 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {hasPermission ? 'Allowed' : 'Denied'}
        </span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// Example of a permission-based conditional render hook
export function usePermissionCheck(userId: string, permission: string) {
  const [hasPermissionState, setHasPermissionState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(true);
      try {
        const result = await hasPermissionWithResult(userId, permission);
        setHasPermissionState(result.hasPermission);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermissionState(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && permission) {
      checkPermission();
    }
  }, [userId, permission]);

  return { hasPermission: hasPermissionState, isLoading };
}

// Example usage of the hook
export function ConditionalButton({ userId, permission, children, ...props }: {
  userId: string;
  permission: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const { hasPermission: hasPermissionState, isLoading } = usePermissionCheck(userId, permission);

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 rounded h-10 w-24"></div>;
  }

  if (!hasPermissionState) {
    return null;
  }

  return <button {...props}>{children}</button>;
} 