import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamAPI } from "@/utils/api/team";
import type {
  TeamMember,
  CreateTeamMemberData,
  UpdateTeamMemberData,
  TeamMembersResponse,
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

      // Add the new team member to cache
      queryClient.setQueryData(
        teamMemberKeys.detail(data.member.id, variables.organizationId),
        data
      );
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

      // Update the specific team member in cache
      queryClient.setQueryData(
        teamMemberKeys.detail(id, updateData.organizationId),
        data
      );

      // Invalidate team members list to reflect changes
      queryClient.invalidateQueries({
        queryKey: teamMemberKeys.list(updateData.organizationId),
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
      const { id, organizationId } = variables;

      // Remove the team member from cache
      queryClient.removeQueries({
        queryKey: teamMemberKeys.detail(id, organizationId),
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
