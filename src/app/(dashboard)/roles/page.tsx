'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Shield, Users, Settings, Eye } from 'lucide-react'
import { rolesApi, permissionsApi } from '@/utils/api/roles'
import { Role, Permission } from '@/lib/types'
import CreateRoleModal from '@/components/modals/CreateRoleModal'
import EditRoleModal from '@/components/modals/EditRoleModal'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load roles and permissions in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        rolesApi.getAll(),
        permissionsApi.getAll()
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
    try {
      await rolesApi.create(roleData)
      setCreateModalOpen(false)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Error creating role:', err)
    }
  }

  const handleEditRole = async (roleData: any) => {
    if (!selectedRole) return
    
    try {
      await rolesApi.update(selectedRole.id, roleData)
      setEditModalOpen(false)
      setSelectedRole(null)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Error updating role:', err)
    }
  }

  const handleDeleteRole = async () => {
    if (!roleToDelete) return

    try {
      await rolesApi.delete(roleToDelete.id)
      setDeleteModalOpen(false)
      setRoleToDelete(null)
      await loadData() // Refresh data
    } catch (err) {
      console.error('Error deleting role:', err)
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

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  const getPermissionCount = (rolePermissions: Permission[]) => {
    return rolePermissions?.length || 0
  }

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false)
    await loadData() // Refresh data
  }

  const handleEditSuccess = async () => {
    setEditModalOpen(false)
    setSelectedRole(null)
    await loadData() // Refresh data
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
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
          <p className="text-gray-600 mt-2">Manage user roles and their permissions</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Organization Roles</h2>
        </div>

        {roles.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No roles found</h3>
            <p className="text-gray-600 mb-6">Create your first role to get started.</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Role
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(role.name)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {role.display_name || role.name}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getRoleBadgeColor(role.name)}`}>
                              {role.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {role.description || 'No description provided'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        {getPermissionCount(role.permissions || [])} permissions
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {Math.floor(Math.random() * 10) + 1} members
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(role)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        />
      )}
    </div>
  )
}
