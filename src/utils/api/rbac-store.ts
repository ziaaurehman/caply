import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, Permission } from '@/lib/types';
import { rbacService, UserPermissionData } from './rbac';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roleId: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: {
    allowSelfRegistration: boolean;
    defaultRole: string;
    emailDomainRestriction: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  roleId: string;
  role: Role;
  organizationId: string;
  invitedBy: string;
  invitedByUser: User;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface RBACState {
  // Current user data
  currentUser: UserPermissionData | null;
  
  // Data
  roles: Role[];
  permissions: Permission[];
  organizations: Organization[];
  invitations: Invitation[];
  users: User[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions - User Permissions
  fetchCurrentUserPermissions: (userId: string, forceRefresh?: boolean) => Promise<void>;
  hasPermission: (permission: string) => Promise<boolean>;
  hasAnyPermission: (permissions: string[]) => Promise<boolean>;
  hasAllPermissions: (permissions: string[]) => Promise<boolean>;
  hasRole: (roleName: string) => Promise<boolean>;
  isSuperAdmin: () => boolean;
  canAccessModule: (moduleName: string) => Promise<boolean>;
  getAccessibleModules: () => Promise<string[]>;
  
  // Actions - Organizations
  createOrganization: (org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Organization>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  
  // Actions - Roles
  fetchRoles: (organizationId?: string) => Promise<void>;
  createRole: (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Role>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  
  // Actions - Users
  fetchUsers: (organizationId?: string) => Promise<void>;
  updateUserRole: (userId: string, roleId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  
  // Actions - Invitations
  fetchInvitations: (organizationId?: string) => Promise<void>;
  createInvitation: (invitation: Omit<Invitation, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'expiresAt'>) => Promise<Invitation>;
  cancelInvitation: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<void>;
  acceptInvitation: (id: string, userDetails: { name: string; password: string }) => Promise<User>;
  
  // Utility actions
  getRoleById: (id: string) => Role | undefined;
  getUsersByRole: (roleId: string) => User[];
  getOrganizationUsers: (organizationId: string) => User[];
  clearCache: () => void;
  refreshUserPermissions: (userId: string) => Promise<void>;
}

export const useRBACStore = create<RBACState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      roles: [],
      permissions: [],
      organizations: [],
      invitations: [],
      users: [],
      isLoading: false,
      error: null,

      // User Permission actions
      fetchCurrentUserPermissions: async (userId: string, forceRefresh = false) => {
        set({ isLoading: true, error: null });
        try {
          const userData = await rbacService.getUserPermissions(userId);
          if (userData) {
            set({ 
              currentUser: userData,
              permissions: userData.permissions,
              isLoading: false 
            });
          } else {
            set({ error: 'Failed to fetch user permissions', isLoading: false });
          }
        } catch (error) {
          set({ error: 'Failed to fetch user permissions', isLoading: false });
        }
      },

      hasPermission: async (permission: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        return await rbacService.hasPermission({ userId: currentUser.userId, permission });
      },

      hasAnyPermission: async (permissions: string[]) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        return await rbacService.hasAnyPermission(currentUser.userId, permissions);
      },

      hasAllPermissions: async (permissions: string[]) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        return await rbacService.hasAllPermissions(currentUser.userId, permissions);
      },

      hasRole: async (roleName: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        return await rbacService.hasRole(currentUser.userId, roleName);
      },

      isSuperAdmin: () => {
        const { currentUser } = get();
        return currentUser?.isSuperAdmin || false;
      },

      canAccessModule: async (moduleName: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        return await rbacService.canAccessModule(currentUser.userId, moduleName);
      },

      getAccessibleModules: async () => {
        const { currentUser } = get();
        if (!currentUser) return [];
        
        return await rbacService.getAccessibleModules(currentUser.userId);
      },

      clearCache: () => {
        // No caching in the consolidated version
        set({ currentUser: null });
      },

      refreshUserPermissions: async (userId: string) => {
        await get().fetchCurrentUserPermissions(userId, true);
      },

      // Organization actions (mock implementation for now)
      createOrganization: async (orgData) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newOrg: Organization = {
            ...orgData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({
            organizations: [...state.organizations, newOrg],
            isLoading: false,
          }));
          
          return newOrg;
        } catch (error) {
          set({ error: 'Failed to create organization', isLoading: false });
          throw error;
        }
      },

      updateOrganization: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            organizations: state.organizations.map(org =>
              org.id === id 
                ? { ...org, ...updates, updatedAt: new Date().toISOString() }
                : org
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update organization', isLoading: false });
          throw error;
        }
      },

      // Role actions (mock implementation for now)
      fetchRoles: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call to fetch roles
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // For now, return empty array - implement API call
          set({ roles: [], isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch roles', isLoading: false });
        }
      },

      createRole: async (roleData) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newRole: Role = {
            ...roleData,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          set(state => ({
            roles: [...state.roles, newRole],
            isLoading: false,
          }));
          
          return newRole;
        } catch (error) {
          set({ error: 'Failed to create role', isLoading: false });
          throw error;
        }
      },

      updateRole: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            roles: state.roles.map(role =>
              role.id === id 
                ? { ...role, ...updates, updatedAt: new Date().toISOString() }
                : role
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update role', isLoading: false });
          throw error;
        }
      },

      deleteRole: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            roles: state.roles.filter(role => role.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to delete role', isLoading: false });
          throw error;
        }
      },

      // User actions (mock implementation for now)
      fetchUsers: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({ users: [], isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch users', isLoading: false });
        }
      },

      updateUserRole: async (userId, roleId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            users: state.users.map(user =>
              user.id === userId 
                ? { ...user, roleId, updatedAt: new Date().toISOString() }
                : user
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update user role', isLoading: false });
          throw error;
        }
      },

      deactivateUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            users: state.users.map(user =>
              user.id === userId 
                ? { ...user, isActive: false, updatedAt: new Date().toISOString() }
                : user
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to deactivate user', isLoading: false });
          throw error;
        }
      },

      activateUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            users: state.users.map(user =>
              user.id === userId 
                ? { ...user, isActive: true, updatedAt: new Date().toISOString() }
                : user
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to activate user', isLoading: false });
          throw error;
        }
      },

      // Invitation actions (mock implementation for now)
      fetchInvitations: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({ invitations: [], isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch invitations', isLoading: false });
        }
      },

      createInvitation: async (invData) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newInvitation: Invitation = {
            ...invData,
            id: Date.now().toString(),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Invitation;
          
          set(state => ({
            invitations: [...state.invitations, newInvitation],
            isLoading: false,
          }));
          
          return newInvitation;
        } catch (error) {
          set({ error: 'Failed to create invitation', isLoading: false });
          throw error;
        }
      },

      cancelInvitation: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            invitations: state.invitations.map(inv =>
              inv.id === id 
                ? { ...inv, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
                : inv
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to cancel invitation', isLoading: false });
          throw error;
        }
      },

      resendInvitation: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            invitations: state.invitations.map(inv =>
              inv.id === id 
                ? { 
                    ...inv, 
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date().toISOString() 
                  }
                : inv
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to resend invitation', isLoading: false });
          throw error;
        }
      },

      acceptInvitation: async (id, userDetails) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newUser: User = {
            id: Date.now().toString(),
            name: userDetails.name,
            email: '',
            roleId: '',
            role: {} as Role,
            organizationId: '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({
            users: [...state.users, newUser],
            isLoading: false,
          }));
          
          return newUser;
        } catch (error) {
          set({ error: 'Failed to accept invitation', isLoading: false });
          throw error;
        }
      },

      // Utility functions
      getRoleById: (id) => {
        return get().roles.find(role => role.id === id);
      },

      getUsersByRole: (roleId) => {
        return get().users.filter(user => user.roleId === roleId);
      },

      getOrganizationUsers: (organizationId) => {
        return get().users.filter(user => user.organizationId === organizationId);
      },
    }),
    {
      name: 'rbac-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        // Don't persist sensitive data like invitations and users in localStorage
      }),
    }
  )
); 