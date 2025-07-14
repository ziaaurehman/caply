interface TeamMember {
  id: string;
  user_id: string;
  role_id: string;
  hourly_rate?: number;
  weekly_capacity: number;
  department?: string;
  hire_date?: string;
  status: string;
  joined_at: string;
  users: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    position?: string;
    phone?: string;
    is_active: boolean;
  };
  roles: {
    id: string;
    name: string;
    display_name: string;
    description: string;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role_id: string;
  status: string;
  expires_at: string;
  created_at: string;
  roles: {
    id: string;
    name: string;
    display_name: string;
    description: string;
  };
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  module: string;
  action: string;
}

interface CreateTeamMemberData {
  email: string;
  roleId: string;
  department?: string;
  hourlyRate?: number;
  weeklyCapacity: number;
  message?: string;
}

interface UpdateTeamMemberData {
  roleId?: string;
  department?: string;
  hourlyRate?: number;
  weeklyCapacity?: number;
}

interface TeamMembersResponse {
  members: TeamMember[];
  invitations: PendingInvitation[];
}

interface RolesResponse {
  roles: Role[];
}

interface EmailProviderResponse {
  provider: string;
}

// Team Members API
export const teamAPI = {
  // Get all team members and pending invitations
  getTeamMembers: async (): Promise<TeamMembersResponse> => {
    const response = await fetch('/api/team-members');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch team members');
    }
    const data = await response.json();
    return {
      members: data.members || [],
      invitations: data.invitations || []
    };
  },

  // Create new team member invitation
  createTeamMember: async (data: CreateTeamMemberData): Promise<void> => {
    const response = await fetch('/api/team-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        roleId: data.roleId,
        department: data.department,
        hourlyRate: data.hourlyRate,
        weeklyCapacity: data.weeklyCapacity,
        message: data.message
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to invite member');
    }
  },

  // Update existing team member
  updateTeamMember: async (id: string, data: UpdateTeamMemberData): Promise<void> => {
    const response = await fetch(`/api/team-members/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roleId: data.roleId,
        department: data.department,
        hourlyRate: data.hourlyRate,
        weeklyCapacity: data.weeklyCapacity
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update member');
    }
  },

  // Delete team member
  deleteTeamMember: async (id: string): Promise<void> => {
    const response = await fetch(`/api/team-members/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove member');
    }
  },

  // Get all roles
  getRoles: async (): Promise<RolesResponse> => {
    const response = await fetch('/api/roles');
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    const data = await response.json();
    return { roles: data.roles || [] };
  },

  // Check email provider configuration
  getEmailProvider: async (): Promise<EmailProviderResponse> => {
    const response = await fetch('/api/debug?check=email-provider');
    if (!response.ok) {
      return { provider: 'console' };
    }
    const data = await response.json();
    return { provider: data.provider || 'console' };
  }
};

export type {
  TeamMember,
  PendingInvitation,
  Role,
  Permission,
  CreateTeamMemberData,
  UpdateTeamMemberData,
  TeamMembersResponse,
  RolesResponse,
  EmailProviderResponse
};
