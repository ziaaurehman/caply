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
  token: string;
  message?: string;
  user_id?: string;
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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
  getTeamMembers: async (
    organizationId: string,
    params?: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<TeamMembersResponse> => {
    const { deduplicateRequest, createRequestKey } = await import(
      "@/utils/requestDeduplication"
    );

    const requestParams = {
      organizationId,
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.search && { search: params.search }),
      ...(params?.status && { status: params.status }),
    };

    const requestKey = createRequestKey("/api/team-members", requestParams);

    return deduplicateRequest(requestKey, async () => {
      const url = new URL("/api/team-members", window.location.origin);
      url.searchParams.set("organizationId", organizationId);

      if (params?.page) url.searchParams.set("page", params.page.toString());
      if (params?.limit) url.searchParams.set("limit", params.limit.toString());
      if (params?.search) url.searchParams.set("search", params.search);
      if (params?.status) url.searchParams.set("status", params.status);

      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch team members");
      }
      const data = await response.json();
      return {
        members: data.members || [],
        invitations: data.invitations || [],
        pagination: data.pagination,
      };
    });
  },

  // Create new team member invitation
  createTeamMember: async (
    data: CreateTeamMemberData & { organizationId: string }
  ): Promise<void> => {
    const response = await fetch("/api/team-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": data.organizationId,
      },
      body: JSON.stringify({
        email: data.email,
        roleId: data.roleId,
        department: data.department,
        hourlyRate: data.hourlyRate,
        weeklyCapacity: data.weeklyCapacity,
        message: data.message,
        organizationId: data.organizationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to invite member");
    }
  },

  // Update existing team member
  updateTeamMember: async (
    id: string,
    data: UpdateTeamMemberData & { organizationId: string }
  ): Promise<void> => {
    const response = await fetch(`/api/team-members/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": data.organizationId,
      },
      body: JSON.stringify({
        roleId: data.roleId,
        department: data.department,
        hourlyRate: data.hourlyRate,
        weeklyCapacity: data.weeklyCapacity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update member");
    }
  },

  // Delete team member
  deleteTeamMember: async (
    id: string,
    organizationId: string
  ): Promise<void> => {
    const response = await fetch(`/api/team-members/${id}`, {
      method: "DELETE",
      headers: {
        "x-organization-id": organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to remove member");
    }
  },

  // Resend invitation
  resendInvitation: async (invitationId: string): Promise<void> => {
    const response = await fetch("/api/invitations/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invitationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to resend invitation");
    }
  },

  // Cancel invitation
  cancelInvitation: async (invitationId: string): Promise<void> => {
    const response = await fetch("/api/invitations/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invitationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to cancel invitation");
    }
  },

  // Get all roles
  getRoles: async (organizationId: string): Promise<RolesResponse> => {
    const response = await fetch("/api/roles", {
      headers: {
        "x-organization-id": organizationId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch roles");
    }
    const data = await response.json();
    return { roles: data.roles || [] };
  },

  // Check email provider configuration
  getEmailProvider: async (): Promise<EmailProviderResponse> => {
    const response = await fetch("/api/debug?check=email-provider");
    if (!response.ok) {
      return { provider: "console" };
    }
    const data = await response.json();
    return { provider: data.provider || "console" };
  },
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
  EmailProviderResponse,
};
