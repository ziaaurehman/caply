// API utilities for roles and permissions management

import { CreateRoleRequest, UpdateRoleRequest } from '@/lib/types'

// Roles API
export const rolesApi = {
  // Get all organization roles
  getAll: async () => {
    const response = await fetch('/api/roles')
    if (!response.ok) {
      throw new Error('Failed to fetch roles')
    }
    return response.json()
  },

  // Get specific role by ID
  getById: async (id: string) => {
    const response = await fetch(`/api/roles/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch role')
    }
    return response.json()
  },

  // Create new role
  create: async (data: CreateRoleRequest) => {
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create role')
    }
    return response.json()
  },

  // Update role
  update: async (id: string, data: UpdateRoleRequest) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update role')
    }
    return response.json()
  },

  // Delete role
  delete: async (id: string) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
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
  getAll: async () => {
    const response = await fetch('/api/permissions')
    if (!response.ok) {
      throw new Error('Failed to fetch permissions')
    }
    return response.json()
  },
}
