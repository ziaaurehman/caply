import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamAPI } from "@/utils/api/team";
import type {
  TeamMember,
  CreateTeamMemberData,
  UpdateTeamMemberData,
  TeamMembersResponse,
  Role,
  RolesResponse,
  EmailProviderResponse,
} from "@/utils/api/team";

// Query Keys Factory
export const teamMemberKeys = {
  all: ["teamMembers"] as const,
  lists: () => [...teamMemberKeys.all, "list"] as const,
  list: (organizationId: string, filters?: TeamMemberFilters) =>
    [...teamMemberKeys.lists(), organizationId, filters] as const,
  details: () => [...teamMemberKeys.all, "detail"] as const,
  detail: (id: string, organizationId: string) =>
    [...teamMemberKeys.details(), id, organizationId] as const,
  roles: () => [...teamMemberKeys.all, "roles"] as const,
  rolesByOrg: (organizationId: string) =>
    [...teamMemberKeys.roles(), organizationId] as const,
  emailProvider: () => [...teamMemberKeys.all, "emailProvider"] as const,
};

// Types for filters
export interface TeamMemberFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ===== TEAM MEMBERS LIST =====

export function useTeamMembers(
  organizationId: string,
  filters: TeamMemberFilters = {}
) {
  return useQuery({
    queryKey: teamMemberKeys.list(organizationId, filters),
    queryFn: () => teamAPI.getTeamMembers(organizationId, filters),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== SINGLE TEAM MEMBER =====

export function useTeamMember(teamMemberId: string, organizationId: string) {
  return useQuery({
    queryKey: teamMemberKeys.detail(teamMemberId, organizationId),
    queryFn: () =>
      teamAPI.getTeamMembers(organizationId, { search: teamMemberId }),
    enabled: !!teamMemberId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== ROLES =====

export function useRoles(organizationId: string) {
  return useQuery({
    queryKey: teamMemberKeys.rolesByOrg(organizationId),
    queryFn: () => teamAPI.getRoles(organizationId),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== EMAIL PROVIDER =====

export function useEmailProvider() {
  return useQuery({
    queryKey: teamMemberKeys.emailProvider(),
    queryFn: () => teamAPI.getEmailProvider(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
}

// ===== MUTATIONS =====

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamMemberData & { organizationId: string }) =>
      teamAPI.createTeamMember(data),
    onSuccess: (data, variables) => {
      // Invalidate team members list for the organization
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to create team member:", error);
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTeamMemberData & { organizationId: string };
    }) => teamAPI.updateTeamMember(id, data),
    onSuccess: (data, variables) => {
      const { id, data: updateData } = variables;

      // Invalidate team members list to reflect changes
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(updateData.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to update team member:", error);
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => teamAPI.deleteTeamMember(id, organizationId),
    onSuccess: (_, variables) => {
      const { organizationId } = variables;
  queryClient.invalidateQueries({
        queryKey: teamMemberKeys.lists(),
      });
      // Invalidate team members list
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to delete team member:", error);
    },
  });
}

// ===== INVITATION MUTATIONS =====

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invitationId,
      organizationId,
    }: {
      invitationId: string;
      organizationId: string;
    }) => teamAPI.resendInvitation(invitationId),
    onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
        queryKey: teamMemberKeys.lists(),
      });
      // Invalidate team members list to refresh invitation data
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to resend invitation:", error);
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invitationId,
      organizationId,
    }: {
      invitationId: string;
      organizationId: string;
    }) => teamAPI.cancelInvitation(invitationId),
    onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
        queryKey: teamMemberKeys.lists(),
      });
      // Invalidate team members list to refresh invitation data
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to cancel invitation:", error);
    },
  });
}
