import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, Permission, Organization, Invitation, UserProfile } from '@/lib/types';
import { DEFAULT_ROLES } from '@/utils/rbac/roles';
import { PERMISSIONS } from '@/utils/rbac/permissions';

interface RBACState {
  // Data
  roles: Role[];
  permissions: Permission[];
  organizations: Organization[];
  invitations: Invitation[];
  users: UserProfile[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
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
  acceptInvitation: (id: string, userDetails: { name: string; password: string }) => Promise<UserProfile>;
  
  // Utility actions
  getRoleById: (id: string) => Role | undefined;
  getUsersByRole: (roleId: string) => UserProfile[];
  getOrganizationUsers: (organizationId: string) => UserProfile[];
}

// Mock data
const mockOrganization: Organization = {
  id: '1',
  name: 'Demo Organization',
  domain: 'demo.caply.com',
  settings: {
    allowSelfRegistration: false,
    defaultRole: 'employee',
    emailDomainRestriction: [],
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockRoles: Role[] = DEFAULT_ROLES.map((role, index) => ({
  ...role,
  organizationId: mockOrganization.id,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}));

const mockUsers: UserProfile[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@demo.caply.com',
    avatar: '/avatars/john.jpg',
    roleId: 'admin',
    role: mockRoles.find(r => r.id === 'admin')!,
    organizationId: mockOrganization.id,
    organization: mockOrganization,
    isActive: true,
    lastLoginAt: '2023-10-01T10:00:00Z',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@demo.caply.com',
    avatar: '/avatars/jane.jpg',
    roleId: 'manager',
    role: mockRoles.find(r => r.id === 'manager')!,
    organizationId: mockOrganization.id,
    organization: mockOrganization,
    isActive: true,
    lastLoginAt: '2023-10-15T14:00:00Z',
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-10-15T14:00:00Z',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@demo.caply.com',
    roleId: 'employee',
    role: mockRoles.find(r => r.id === 'employee')!,
    organizationId: mockOrganization.id,
    organization: mockOrganization,
    isActive: true,
    lastLoginAt: '2023-10-20T09:00:00Z',
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2023-10-20T09:00:00Z',
  },
];

const mockInvitations: Invitation[] = [
  {
    id: '1',
    email: 'sarah@demo.caply.com',
    roleId: 'employee',
    role: mockRoles.find(r => r.id === 'employee')!,
    organizationId: mockOrganization.id,
    invitedBy: '1',
    invitedByUser: mockUsers[0],
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    createdAt: '2023-10-20T10:00:00Z',
    updatedAt: '2023-10-20T10:00:00Z',
  }
];

export const useRBACStore = create<RBACState>()(
  persist(
    (set, get) => ({
      // Initial state
      roles: [],
      permissions: PERMISSIONS,
      organizations: [mockOrganization],
      invitations: [],
      users: [],
      isLoading: false,
      error: null,

      // Organization actions
      createOrganization: async (orgData) => {
        set({ isLoading: true, error: null });
        try {
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

      // Role actions
      fetchRoles: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const filteredRoles = organizationId 
            ? mockRoles.filter(role => role.organizationId === organizationId)
            : mockRoles;
            
          set({ roles: filteredRoles, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch roles', isLoading: false });
        }
      },

      createRole: async (roleData) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newRole: Role = {
            ...roleData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if role is in use
          const usersWithRole = get().users.filter(user => user.roleId === id);
          if (usersWithRole.length > 0) {
            throw new Error('Cannot delete role that is assigned to users');
          }
          
          set(state => ({
            roles: state.roles.filter(role => role.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete role', isLoading: false });
          throw error;
        }
      },

      // User actions
      fetchUsers: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const filteredUsers = organizationId 
            ? mockUsers.filter(user => user.organizationId === organizationId)
            : mockUsers;
            
          set({ users: filteredUsers, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch users', isLoading: false });
        }
      },

      updateUserRole: async (userId, roleId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const role = get().roles.find(r => r.id === roleId);
          if (!role) {
            throw new Error('Role not found');
          }
          
          set(state => ({
            users: state.users.map(user =>
              user.id === userId 
                ? { ...user, roleId, role, updatedAt: new Date().toISOString() }
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

      // Invitation actions
      fetchInvitations: async (organizationId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const filteredInvitations = organizationId 
            ? mockInvitations.filter(inv => inv.organizationId === organizationId)
            : mockInvitations;
            
          set({ invitations: filteredInvitations, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch invitations', isLoading: false });
        }
      },

      createInvitation: async (invData) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const role = get().roles.find(r => r.id === invData.roleId);
          const invitedByUser = get().users.find(u => u.id === invData.invitedBy);
          
          if (!role || !invitedByUser) {
            throw new Error('Role or inviting user not found');
          }
          
          const newInvitation: Invitation = {
            ...invData,
            id: Date.now().toString(),
            role,
            invitedByUser,
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const invitation = get().invitations.find(inv => inv.id === id);
          if (!invitation) {
            throw new Error('Invitation not found');
          }
          
          // Create new user
          const newUser: UserProfile = {
            id: Date.now().toString(),
            name: userDetails.name,
            email: invitation.email,
            roleId: invitation.roleId,
            role: invitation.role,
            organizationId: invitation.organizationId,
            organization: invitation.invitedByUser.organization,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Update invitation status
          set(state => ({
            invitations: state.invitations.map(inv =>
              inv.id === id 
                ? { 
                    ...inv, 
                    status: 'accepted' as const,
                    acceptedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString() 
                  }
                : inv
            ),
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
        roles: state.roles,
        organizations: state.organizations,
        // Don't persist sensitive data like invitations and users in localStorage
      }),
    }
  )
); 