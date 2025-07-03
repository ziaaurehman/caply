import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClient } from "@/utils/supabase/client"
import type { AuthUser, Organization, OrganizationMember, Role, Permission, PermissionName, UserRole } from "@/lib/types"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AuthState {
  user: AuthUser | null
  supabaseUser: SupabaseUser | null
  organization: Organization | null
  organizationMembers: OrganizationMember[]
  userRole: Role | null
  userPermissions: Permission[]
  isLoading: boolean
  error: string | null
  availableOrganizations: Organization[]
  isAuthenticated: boolean
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  fetchUserFromNextAuth: (session: any) => Promise<void>
  fetchOrganization: () => Promise<void>
  fetchUserRole: () => Promise<void>
  
  // Enhanced permission helpers
  hasPermission: (permission: PermissionName, organizationId?: string) => boolean
  hasAnyPermission: (permissions: PermissionName[], organizationId?: string) => boolean
  hasRole: (role: UserRole) => boolean
  isSuperAdmin: () => boolean
  isSupportAdmin: () => boolean
  isOrgAdmin: () => boolean
  isManager: () => boolean
  
  // Setters
  setUser: (user: AuthUser | null) => void
  setOrganization: (org: Organization | null) => void
  setOrganizationMembers: (members: OrganizationMember[]) => void
  setUserRole: (role: Role | null) => void
  setUserPermissions: (permissions: Permission[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  clearError: () => void
  setAvailableOrganizations: (organizations: Organization[]) => void
  fetchUserData: () => Promise<void>
  signOut: () => Promise<void>
  
  // Support admin helpers
  switchOrganization: (organizationId: string) => Promise<void>
  getAllOrganizations: () => Promise<Organization[]>

  createDefaultOrganization: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      supabaseUser: null,
      organization: null,
      organizationMembers: [],
      userRole: null,
      userPermissions: [],
      isLoading: false,
      error: null,
      availableOrganizations: [],
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const supabase = createClient()
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }

          if (data.user) {
            set({ supabaseUser: data.user })
            await get().fetchUser()
          }
        } catch (error) {
          set({ error: 'Failed to login', isLoading: false })
        }
      },

      signup: async (email, password, fullName) => {
        set({ isLoading: true, error: null })
        try {
          const supabase = createClient()
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })
          
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }

          if (data.user && data.session) {
            set({ supabaseUser: data.user, isLoading: false })
            // The trigger automatically creates user profile and organization
            // Fetch user data after a short delay
            setTimeout(async () => {
              await get().fetchUser()
            }, 1000)
          } else {
            set({ 
              error: 'Please check your email to confirm your account before signing in.', 
              isLoading: false 
            })
          }
        } catch (error) {
          set({ error: 'Failed to sign up', isLoading: false })
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null })
        try {
          const supabase = createClient()
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }

          get().clearAuth()
        } catch (error) {
          set({ error: 'Failed to logout', isLoading: false })
        }
      },

      fetchUser: async () => {
        set({ isLoading: true, error: null })
        try {
          const supabase = createClient()
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          if (!authUser) {
            get().clearAuth()
            return
          }

          // Fetch user profile from the users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (error || !userProfile) {
            console.error('Error fetching user profile:', error)
            get().clearAuth()
            return
          }

          set({ 
            user: userProfile, 
            supabaseUser: authUser, 
            isLoading: false 
          })

          // Fetch organization and role data
          await get().fetchOrganization()
          await get().fetchUserRole()

        } catch (error) {
          console.error('Error fetching user:', error)
          set({ error: 'Failed to fetch user', isLoading: false })
        }
      },

      fetchUserFromNextAuth: async (session: any) => {
        if (!session?.user?.id) return

        set({ isLoading: true, error: null })
        try {
          const supabase = createClient()
          
          // Fetch user profile from the users table using NextAuth user ID
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (error || !userProfile) {
            console.error('Error fetching user profile:', error)
            set({ isLoading: false })
            return
          }

          set({ 
            user: userProfile, 
            supabaseUser: null, // Not using Supabase auth
            isLoading: false 
          })

          // Fetch organization and role data
          await get().fetchOrganization()
          await get().fetchUserRole()

        } catch (error) {
          console.error('Error fetching user from NextAuth:', error)
          set({ error: 'Failed to fetch user', isLoading: false })
        }
      },

      fetchOrganization: async () => {
        const { user } = get()
        if (!user) {
          console.log('fetchOrganization: No user found')
          return
        }

        console.log('fetchOrganization: Searching for organization membership for user:', user.id)

        try {
          const supabase = createClient()
          
          // Get user's organization membership
          const { data: membership, error: membershipError } = await supabase
            .from('organization_members')
            .select(`
              *,
              organization:organizations(*),
              role:roles(*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

          console.log('fetchOrganization: Query result:', { membership, membershipError })

          if (membershipError) {
            console.error('Error fetching organization membership:', membershipError)
            if (membershipError.code === 'PGRST116') {
              console.log('No organization membership found for user. Creating default organization...')
              await get().createDefaultOrganization(user.id)
              return
            }
            return
          }

          if (!membership) {
            console.log('No organization membership found for user. Creating default organization...')
            await get().createDefaultOrganization(user.id)
            return
          }

          console.log('fetchOrganization: Found membership:', membership)

          // Get all organization members
          const { data: members, error: membersError } = await supabase
            .from('organization_members')
            .select(`
              *,
              user:users(*),
              role:roles(*)
            `)
            .eq('organization_id', membership.organization_id)
            .eq('status', 'active')

          if (membersError) {
            console.error('Error fetching organization members:', membersError)
          }

          set({
            organization: membership.organization,
            organizationMembers: members || [],
            userRole: membership.role
          })

          console.log('fetchOrganization: Successfully set organization:', membership.organization)

        } catch (error) {
          console.error('Error fetching organization:', error)
        }
      },

      createDefaultOrganization: async (userId: string) => {
        console.log('createDefaultOrganization: Creating default organization for user:', userId)
        
        try {
          const supabase = createClient()
          
          // Create a default organization
          const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: 'My Organization',
              slug: `org-${Date.now()}`,
              logo_url: null,
              owner_id: userId
            })
            .select()
            .single()

          if (orgError) {
            console.error('Error creating organization:', orgError)
            return
          }

          console.log('createDefaultOrganization: Created organization:', organization)

          // Get the default admin role
          const { data: adminRole, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('name', 'admin')
            .single()

          if (roleError) {
            console.error('Error fetching admin role:', roleError)
            return
          }

          // Create organization membership
          const { data: membership, error: membershipError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: organization.id,
              user_id: userId,
              role_id: adminRole.id,
              status: 'active',
              joined_at: new Date().toISOString()
            })
            .select(`
              *,
              organization:organizations(*),
              role:roles(*)
            `)
            .single()

          if (membershipError) {
            console.error('Error creating organization membership:', membershipError)
            return
          }

          console.log('createDefaultOrganization: Created membership:', membership)

          // Set the organization in the store
          set({
            organization: membership.organization,
            organizationMembers: [membership],
            userRole: membership.role
          })

          console.log('createDefaultOrganization: Successfully set default organization')

        } catch (error) {
          console.error('Error creating default organization:', error)
        }
      },

      fetchUserRole: async () => {
        const { user, userRole } = get()
        if (!user || !userRole) return

        try {
          const supabase = createClient()
          
          // Get permissions for the user's role
          const { data: rolePermissions, error } = await supabase
            .from('role_permissions')
            .select(`
              permission:permissions(*)
            `)
            .eq('role_id', userRole.id)

          if (error) {
            console.error('Error fetching permissions:', error)
            return
          }

          const permissions: Permission[] = rolePermissions?.map((rp: any) => rp.permission).filter(Boolean) || []
          set({ userPermissions: permissions })

        } catch (error) {
          console.error('Error fetching user role:', error)
        }
      },

      // Enhanced permission helpers
      hasPermission: (permission: PermissionName, organizationId?: string) => {
        const { user, userPermissions } = get()
        
        // Check if user is super admin (has all permissions)
        if (user?.is_super_admin) {
          return true
        }
        
        // Check if user has the specific permission
        return userPermissions.some(p => p.name === permission)
      },

      hasAnyPermission: (permissions: PermissionName[], organizationId?: string) => {
        return permissions.some(permission => get().hasPermission(permission, organizationId))
      },

      hasRole: (role: UserRole) => {
        const { userRole } = get()
        return userRole?.name === role
      },

      isSuperAdmin: () => {
        const { user } = get()
        return user?.is_super_admin ?? false
      },

      isSupportAdmin: () => {
        const { userRole } = get()
        return userRole?.name === 'support_admin'
      },

      isOrgAdmin: () => {
        const { userRole } = get()
        return userRole?.name === 'admin'
      },

      isManager: () => {
        const { userRole } = get()
        return userRole?.name === 'manager'
      },

      // Setters
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      setOrganizationMembers: (organizationMembers) => set({ organizationMembers }),
      setUserRole: (userRole) => set({ userRole }),
      setUserPermissions: (userPermissions) => set({ userPermissions }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      clearAuth: () => set({ 
        user: null, 
        supabaseUser: null, 
        organization: null,
        organizationMembers: [],
        userRole: null,
        userPermissions: [],
        isLoading: false,
        error: null,
        availableOrganizations: [],
        isAuthenticated: false
      }),

      clearError: () => set({ error: null }),

      setAvailableOrganizations: (organizations) => set({ availableOrganizations: organizations }),

      fetchUserData: async () => {
        // Implementation needed
      },

      signOut: async () => {
        // Implementation needed
      },

      // Support admin helpers
      switchOrganization: async (organizationId: string) => {
        // Implementation needed
      },

      getAllOrganizations: async () => {
        // Implementation needed
        return []
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user,
        supabaseUser: state.supabaseUser,
        organization: state.organization,
        userRole: state.userRole,
        userPermissions: state.userPermissions
      }),
    },
  ),
)
