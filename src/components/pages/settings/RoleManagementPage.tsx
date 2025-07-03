"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Edit, Trash2, Users, Shield, Settings } from 'lucide-react';
import { useRBACStore } from '@/lib/stores/rbacStore';
import { Role, Permission } from '@/lib/types';
import { AdminOnly } from '@/components/ui/rbac/ProtectedComponent';

export default function RoleManagementPage() {
  const {
    roles,
    permissions,
    users,
    isLoading,
    error,
    fetchRoles,
    fetchUsers,
    createRole,
    updateRole,
    deleteRole,
    getUsersByRole,
  } = useRBACStore();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [fetchRoles, fetchUsers]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    const usersWithRole = getUsersByRole(roleId);
    if (usersWithRole.length > 0) {
      alert(`Cannot delete role. ${usersWithRole.length} users are assigned to this role.`);
      return;
    }

    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(roleId);
      } catch (error) {
        console.error('Failed to delete role:', error);
      }
    }
  };

  const getRoleUserCount = (roleId: string) => {
    return getUsersByRole(roleId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage roles and permissions for your organization
          </p>
        </div>
        
        <AdminOnly>
          <Button
            variant="default"
            onClick={handleCreateRole}
            leftIcon={<Plus size={18} />}
          >
            Create Role
          </Button>
        </AdminOnly>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary-600" />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                <div className="flex space-x-2">
                  <AdminOnly>
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit role"
                    >
                      <Edit size={16} />
                    </button>
                    {!role.isDefault && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete role"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </AdminOnly>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">{role.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {getRoleUserCount(role.id)} users
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {role.permissions.length} permissions
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-xs text-gray-500 mb-2">Permissions:</div>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                    {role.permissions.slice(0, 6).map((permission) => (
                      <span
                        key={permission.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700"
                      >
                        {permission.resource}.{permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{role.permissions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {role.isDefault && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      Default Role
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Modal would go here */}
      {isModalOpen && (
        <RoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          role={selectedRole}
          mode={modalMode}
          permissions={permissions}
          onSave={async (roleData) => {
            try {
              if (modalMode === 'create') {
                // Ensure required fields are present for createRole
                const { name, description, permissions } = roleData;
                if (!name || !permissions) {
                  throw new Error('Role name and permissions are required.');
                }
                await createRole({
                  ...roleData,
                  name, // name is guaranteed to be string here
                  permissions,
                } as Omit<Role, "id" | "createdAt" | "updatedAt">);
              } else if (selectedRole) {
                await updateRole(selectedRole.id, roleData);
              }
              setIsModalOpen(false);
            } catch (error) {
              console.error('Failed to save role:', error);
            }
          }}
        />
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
}

// Role Modal Component
interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  mode: 'create' | 'edit';
  permissions: Permission[];
  onSave: (roleData: Partial<Role>) => Promise<void>;
}

function RoleModal({ isOpen, onClose, role, mode, permissions, onSave }: RoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState<string>('');

  useEffect(() => {
    if (role && mode === 'edit') {
      setName(role.name);
      setDescription(role.description);
      setSelectedPermissions(role.permissions);
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
  }, [role, mode]);

  const resources = Array.from(new Set(permissions.map(p => p.resource))).sort();

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResource = !selectedResource || permission.resource === selectedResource;
    return matchesSearch && matchesResource;
  });

  const handlePermissionToggle = (permission: Permission) => {
    setSelectedPermissions(prev => {
      const isSelected = prev.some(p => p.id === permission.id);
      if (isSelected) {
        return prev.filter(p => p.id !== permission.id);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name,
      description,
      permissions: selectedPermissions,
      organizationId: '1', // Default for demo
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create Role' : 'Edit Role'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-6 flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Permissions ({selectedPermissions.length} selected)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <select
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Resources</option>
                  {resources.map(resource => (
                    <option key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 divide-y">
                  {filteredPermissions.map((permission) => {
                    const isSelected = selectedPermissions.some(p => p.id === permission.id);
                    return (
                      <label
                        key={permission.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(permission)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {permission.resource}.{permission.action}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {permission.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
            >
              {mode === 'create' ? 'Create Role' : 'Update Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 