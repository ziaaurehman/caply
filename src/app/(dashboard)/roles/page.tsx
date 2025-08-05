'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Shield, Users, Settings, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { rolesApi, permissionsApi } from '@/utils/api/roles'
import { Role, Permission } from '@/lib/types'
import CreateRoleModal from '@/components/modals/CreateRoleModal'
import EditRoleModal from '@/components/modals/EditRoleModal'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal'
import { useOrganizationStore } from '@/lib/stores/organizationStore'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({})
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  const { currentOrganization, hasPermission, hasRole } = useOrganizationStore()

  // Check if user has admin access for role management
  const hasAdminAccess = hasRole('admin') || hasPermission('roles', 'manage') || hasPermission('roles', 'read')
  const canCreateRoles = hasRole('admin') || hasPermission('roles', 'create') || hasPermission('roles', 'manage')
  const canUpdateRoles = hasRole('admin') || hasPermission('roles', 'update') || hasPermission('roles', 'manage')
  const canDeleteRoles = hasRole('admin') || hasPermission('roles', 'delete') || hasPermission('roles', 'manage')

  // Load data when organization changes
  useEffect(() => {
    if (currentOrganization?.id && hasAdminAccess) {
      loadData()
    }
  }, [currentOrganization?.id, hasAdminAccess])

  const loadData = async () => {
    if (!currentOrganization?.id) return

    try {
      setLoading(true)
      setError(null)

      // Load roles and permissions in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        rolesApi.getAll(currentOrganization.id),
        permissionsApi.getAll(currentOrganization.id)
      ])

      setRoles(rolesResponse.data || rolesResponse.roles || [])
      setPermissions(permissionsResponse.data || permissionsResponse.permissions || {})
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load roles and permissions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async (roleData: any) => {
    if (!currentOrganization?.id) return

    try {
      await rolesApi.create({ ...roleData, organizationId: currentOrganization.id })
      setCreateModalOpen(false)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Error creating role:', err)
    }
  }

  const handleEditRole = async (roleData: any) => {
    if (!selectedRole || !currentOrganization?.id) return
    
    try {
      await rolesApi.update(selectedRole.id, { ...roleData, organizationId: currentOrganization.id })
      setEditModalOpen(false)
      setSelectedRole(null)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Error updating role:', err)
    }
  }

  const handleDeleteRole = async () => {
    if (!roleToDelete || !currentOrganization?.id) return

    try {
      setDeleteLoading(true)
      await rolesApi.delete(roleToDelete.id, currentOrganization.id)
      setDeleteModalOpen(false)
      setRoleToDelete(null)
      await loadData() // Refresh data
      toast.success(`Successfully deleted role "${roleToDelete.display_name || roleToDelete.name}"`)
    } catch (err: any) {
      console.error('Error deleting role:', err)
      toast.error(err.message || 'Failed to delete role')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEditModal = (role: Role) => {
    setSelectedRole(role)
    setEditModalOpen(true)
  }

  const openDeleteModal = (role: Role) => {
    setRoleToDelete(role)
    setDeleteModalOpen(true)
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-600" />
      case 'manager':
        return <Users className="w-5 h-5 text-blue-600" />
      case 'member':
        return <Settings className="w-5 h-5 text-gray-600" />
      default:
        return <Shield className="w-5 h-5 text-purple-600" />
    }
  }

  const getRoleBadge = (role: Role) => {
    const badgeColor = getRoleBadgeColor(role.name)
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
        {role.display_name || role.name}
      </span>
    )
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200'
    }
  }

  const getPermissionCount = (rolePermissions: Permission[]) => {
    return rolePermissions?.length || 0
  }

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false)
    await loadData() // Refresh data
    toast.success('Role created successfully')
  }

  const handleEditSuccess = async () => {
    setEditModalOpen(false)
    setSelectedRole(null)
    await loadData() // Refresh data
    toast.success('Role updated successfully')
  }

  // Check if user has admin access
  if (!hasAdminAccess) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Access Restricted</h3>
              <p className="text-yellow-700">You need administrator privileges to manage roles and permissions.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Roles</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-2">Manage user roles and their permissions for {currentOrganization?.name}</p>
        </div>
        {canCreateRoles && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-600">Loading roles...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No roles yet</h3>
            <p className="text-gray-500 mb-4">Create your first role to get started managing permissions.</p>
            {canCreateRoles && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Create Your First Role
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Permissions
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            {getRoleIcon(role.name)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {role.display_name || role.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getRoleBadge(role)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {role.description || 'No description provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPermissionCount(role.permissions || [])} permissions
                      </div>
                      <div className="text-sm text-gray-500">
                        {role.permissions && role.permissions.length > 0 
                          ? `${role.permissions.slice(0, 2).map(p => p.module).join(', ')}${role.permissions.length > 2 ? '...' : ''}`
                          : 'No permissions'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canUpdateRoles && (
                        <button
                          onClick={() => openEditModal(role)}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                          title="Edit Role"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canDeleteRoles && (
                        <button
                          onClick={() => openDeleteModal(role)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {!canUpdateRoles && !canDeleteRoles && (
                        <span className="text-gray-400 text-sm">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRoleModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        permissions={permissions}
      />

      {selectedRole && (
        <EditRoleModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedRole(null)
          }}
          onSuccess={handleEditSuccess}
          role={selectedRole}
          permissions={permissions}
        />
      )}

      {roleToDelete && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setRoleToDelete(null)
          }}
          onConfirm={handleDeleteRole}
          title="Delete Role"
          message={`Are you sure you want to delete the "${roleToDelete.display_name || roleToDelete.name}" role? This action cannot be undone and will affect all users with this role.`}
          confirmText="Delete Role"
          type="danger"
          isLoading={deleteLoading}
        />
      )}
    </div>
  )
}
