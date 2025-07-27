// API utilities for roles and permissions management

import { CreateRoleRequest, UpdateRoleRequest } from '@/lib/types'

// Roles API
export const rolesApi = {
  // Get all organization roles
  getAll: async (organizationId: string) => {
    const response = await fetch('/api/roles', {
      headers: {
        'x-organization-id': organizationId,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch roles')
    }
    return response.json()
  },

  // Get specific role by ID
  getById: async (id: string, organizationId: string) => {
    const response = await fetch(`/api/roles/${id}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch role')
    }
    return response.json()
  },

  // Create new role
  create: async (data: CreateRoleRequest & { organizationId: string }) => {
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create role')
    }
    return response.json()
  },

  // Update role
  update: async (id: string, data: UpdateRoleRequest & { organizationId: string }) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update role')
    }
    return response.json()
  },

  // Delete role
  delete: async (id: string, organizationId: string) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to delete role')
    }
    return response.json()
  },
}

// Permissions API
export const permissionsApi = {
  // Get all permissions grouped by module
  getAll: async (organizationId: string) => {
    const response = await fetch('/api/permissions', {
      headers: {
        'x-organization-id': organizationId,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch permissions')
    }
    return response.json()
  },
}
