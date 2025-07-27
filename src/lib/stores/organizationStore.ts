import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'

interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role_id: string
  status: string
  hourly_rate?: number
  weekly_capacity?: number
  department?: string
  hire_date?: string
  joined_at: string
  role: {
    id: string
    name: string
    display_name: string
    description: string
    permissions: Array<{
      resource: string
      action: string
    }>
  }
}

interface UserOrganization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  is_owner: boolean
  created_at: string
  membership_status: string
  membership: OrganizationMember
}

interface OrganizationStore {
  // State
  currentOrganization: UserOrganization | null
  userOrganizations: UserOrganization[]
  loading: boolean
  error: string | null

  // Actions
  setCurrentOrganization: (org: UserOrganization) => void
  fetchUserOrganizations: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  getUserPermissions: () => Array<{ resource: string; action: string }>
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (roleName: string) => boolean
  clearOrganizationData: () => void
}

export const useOrganizationStore = create<OrganizationStore>((set, get) => ({
  // Initial state
  currentOrganization: null,
  userOrganizations: [],
  loading: false,
  error: null,

  // Set current organization
  setCurrentOrganization: (org: UserOrganization) => {
    set({ currentOrganization: org, error: null })
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentOrganizationId', org.id)
    }
  },

  // Fetch all organizations for the current user
  fetchUserOrganizations: async () => {
    set({ loading: true, error: null })
    
    try {
      const response = await fetch('/api/organizations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      const organizations = data.organizations || []
      
      set({ 
        userOrganizations: organizations,
        loading: false
      })

      // Set current organization if not set
      const { currentOrganization } = get()
      if (!currentOrganization && organizations.length > 0) {
        // Try to get from localStorage first
        const storedOrgId = typeof window !== 'undefined' 
          ? localStorage.getItem('currentOrganizationId')
          : null
        
        const orgToSet = storedOrgId 
          ? organizations.find(org => org.id === storedOrgId) || organizations[0]
          : organizations[0]
        
        get().setCurrentOrganization(orgToSet)
      }

    } catch (error) {
      console.error('Error fetching organizations:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch organizations',
        loading: false
      })
    }
  },

  // Switch to a different organization
  switchOrganization: async (organizationId: string) => {
    const { userOrganizations } = get()
    const organization = userOrganizations.find(org => org.id === organizationId)
    
    if (!organization) {
      set({ error: 'Organization not found' })
      return
    }

    get().setCurrentOrganization(organization)
  },

  // Get current user's permissions in the current organization
  getUserPermissions: () => {
    const { currentOrganization } = get()
    return currentOrganization?.membership?.role?.permissions || []
  },

  // Check if user has a specific permission
  hasPermission: (resource: string, action: string) => {
    const permissions = get().getUserPermissions()
    return permissions.some(p => p.resource === resource && p.action === action)
  },

  // Check if user has a specific role
  hasRole: (roleName: string) => {
    const { currentOrganization } = get()
    return currentOrganization?.membership?.role?.name === roleName
  },

  // Clear organization data (on logout)
  clearOrganizationData: () => {
    set({
      currentOrganization: null,
      userOrganizations: [],
      loading: false,
      error: null
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentOrganizationId')
    }
  }
})) 