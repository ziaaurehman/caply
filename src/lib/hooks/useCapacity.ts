import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { capacityAPI } from "@/utils/api/capacity";
import { projectAPI } from "@/utils/api/project";
import type {
  ResourceAllocation,
  CapacityOverview,
  CapacitySettings,
  MemberCapacity,
} from "@/utils/api/capacity";

// Query Keys Factory
export const capacityKeys = {
  all: ["capacity"] as const,
  monthly: () => [...capacityKeys.all, "monthly"] as const,
  monthlyByOrg: (
    organizationId: string,

    month: string,
    params?: { only_active?: boolean }
  ) => [...capacityKeys.monthly(), organizationId, month, params] as const,
  allocations: () => [...capacityKeys.all, "allocations"] as const,
  allocationsByOrg: (
    organizationId: string,
    params?: {
      project_id?: string;
      start_date?: string;
      end_date?: string;
      filter_project_ids?: string[];
    }
  ) => [...capacityKeys.allocations(), organizationId, params] as const,
  overview: () => [...capacityKeys.all, "overview"] as const,
  overviewByOrg: (
    organizationId: string,
    params?: {
      project_id?: string;
      start_date?: string;
      end_date?: string;
      filter_project_ids?: string[];
      filter_user_ids?: string[];
      only_overallocated?: boolean;
      only_active?: boolean;
    }
  ) => [...capacityKeys.overview(), organizationId, params] as const,
  projects: () => [...capacityKeys.all, "projects"] as const,
  projectsByOrg: (organizationId: string) =>
    [...capacityKeys.projects(), organizationId] as const,
  tasks: () => [...capacityKeys.all, "tasks"] as const,
  tasksSummary: (
    organizationId: string,
    params: {
      user_id?: string;
      project_id?: string;
      project_ids?: string[];
      start_date?: string;
      end_date?: string;
      include_tasks?: boolean;
    }
  ) => [...capacityKeys.tasks(), "summary", organizationId, params] as const,
  settings: () => [...capacityKeys.all, "settings"] as const,
  settingsByProject: (projectId: string) =>
    [...capacityKeys.settings(), projectId] as const,
  memberCapacities: () => [...capacityKeys.all, "memberCapacities"] as const,
  memberCapacitiesByParams: (params?: {
    project_member_id?: string;
    project_id?: string;
  }) => [...capacityKeys.memberCapacities(), params] as const,
};

// ===== RESOURCE ALLOCATIONS =====

export function useAllocations(
  organizationId: string,
  params?: {
    project_id?: string;
    start_date?: string;
    end_date?: string;
    filter_project_ids?: string[];
  }
) {
  return useQuery({
    queryKey: capacityKeys.allocationsByOrg(organizationId, params),
    queryFn: () => capacityAPI.getAllocations(organizationId, params),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== CAPACITY OVERVIEW =====

export function useCapacityOverview(
  organizationId: string,
  params?: {
    project_id?: string;
    start_date?: string;
    end_date?: string;
    filter_project_ids?: string[];
    filter_user_ids?: string[];
    only_overallocated?: boolean;
    only_active?: boolean;
  }
) {
  return useQuery({
    queryKey: capacityKeys.overviewByOrg(organizationId, params),
    queryFn: () => capacityAPI.getOverview(organizationId, params),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}



// ===== MONTHLY VIEW =====
export function useMonthlyCapacity(
  organizationId: string,
  userId: string,
  month: string,
  params?: { only_active?: boolean }
) {
  return useQuery({
    queryKey: capacityKeys.monthlyByOrg(organizationId, "monthly", params),
    queryFn: () => capacityAPI.getMonthly(organizationId, userId, month, params),
    enabled: !!organizationId && !!month,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ===== CAPACITY PROJECTS =====

export function useCapacityProjects(organizationId: string) {
  return useQuery({
    queryKey: capacityKeys.projectsByOrg(organizationId),
    queryFn: () => projectAPI.getAllCapacityProjects(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== TASKS SUMMARY =====

export function useTasksSummary(
  organizationId: string,
  params: {
    user_id?: string;
    project_id?: string;
    project_ids?: string[];
    start_date?: string;
    end_date?: string;
    include_tasks?: boolean;
  }
) {
  return useQuery({
    queryKey: capacityKeys.tasksSummary(organizationId, params),
    queryFn: () => capacityAPI.getTasksSummary(organizationId, params),
    enabled: !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 6 * 60 * 1000, // 6 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== MEMBER CAPACITIES =====

export function useMemberCapacities(params?: {
  project_member_id?: string;
  project_id?: string;
}) {
  return useQuery({
    queryKey: capacityKeys.memberCapacitiesByParams(params),
    queryFn: () => capacityAPI.getMemberCapacities(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== SETTINGS =====

export function useCapacitySettings(projectId?: string) {
  return useQuery({
    queryKey: capacityKeys.settingsByProject(projectId || ""),
    queryFn: () => capacityAPI.getSettings(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== MUTATIONS =====

export function useCreateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      organization_id: string;
      project_id: string;
      organization_member_id: string;
      hours_per_week: number;
      start_date: string;
      end_date?: string | null;
      notes?: string | null;
    }) => capacityAPI.createAllocation(data),
    onSuccess: (data, variables) => {
      // Invalidate all allocations queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.allocations(),
        exact: false,
      });

      // Invalidate all overview queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.overview(),
        exact: false,
      });

      // Invalidate all monthly queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.monthly(),
        exact: false,
      });

      // Invalidate project queries (allocations affect project capacity)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to create allocation:", error);
    },
  });
}

export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      organizationId,
    }: {
      id: string;
      data: Partial<ResourceAllocation>;
      organizationId: string;
    }) => capacityAPI.updateAllocation(id, data, organizationId),
    onSuccess: (data, variables) => {
      // Invalidate all allocations queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.allocations(),
        exact: false,
      });

      // Invalidate all overview queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.overview(),
        exact: false,
      });

      // Invalidate all monthly queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.monthly(),
        exact: false,
      });

      // Invalidate project queries (allocations affect project capacity)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to update allocation:", error);
    },
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => capacityAPI.deleteAllocation(organizationId, id),
    onSuccess: (data, variables) => {
      // Invalidate all allocations queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.allocations(),
        exact: false,
      });

      // Invalidate all overview queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.overview(),
        exact: false,
      });

      // Invalidate all monthly queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.monthly(),
        exact: false,
      });

      // Invalidate project queries (allocations affect project capacity)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to delete allocation:", error);
    },
  });
}

export function useUpdateMemberCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<MemberCapacity, "id" | "created_at" | "updated_at">
    ) => capacityAPI.updateMemberCapacity(data),
    onSuccess: () => {
      // Invalidate all member capacities queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.memberCapacities(),
        exact: false,
      });

      // Invalidate overview and allocation queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.overview(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: capacityKeys.allocations(),
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to update member capacity:", error);
    },
  });
}

export function useUpdateCapacitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CapacitySettings> & { project_id: string }) =>
      capacityAPI.updateSettings(data),
    onSuccess: (data, variables) => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.settings(),
        exact: false,
      });

      // Invalidate overview and allocation queries
      queryClient.invalidateQueries({
        queryKey: capacityKeys.overview(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: capacityKeys.allocations(),
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to update capacity settings:", error);
    },
  });
}

// ===== COMBINED HOOKS FOR COMPLEX OPERATIONS =====

/**
 * Hook that fetches both allocations and overview data together
 * This is useful for the main capacity page that needs both datasets
 */
export function useCapacityData(
  organizationId: string,
  params?: {
    project_id?: string;
    start_date?: string;
    end_date?: string;
    filter_project_ids?: string[];
    filter_user_ids?: string[];
    only_overallocated?: boolean;
    only_active?: boolean;
  }
) {
  const allocationsQuery = useAllocations(organizationId, {
    project_id: params?.project_id,
    start_date: params?.start_date,
    end_date: params?.end_date,
    filter_project_ids: params?.filter_project_ids,
  });

  const overviewQuery = useCapacityOverview(organizationId, params);

  return {
    allocations: allocationsQuery.data?.allocations || [],
    capacityOverview: overviewQuery.data?.capacityOverview || [],
    summary: overviewQuery.data?.summary,
    isLoading: allocationsQuery.isLoading || overviewQuery.isLoading,
    isError: allocationsQuery.isError || overviewQuery.isError,
    error: allocationsQuery.error || overviewQuery.error,
    refetch: () => {
      allocationsQuery.refetch();
      overviewQuery.refetch();
    },
  };
}

// Hook for upserting weekly plans
export function useUpsertWeeklyPlan() {
  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: any;
    }) => capacityAPI.upsertWeeklyPlan(organizationId, data),
  });
}

// Hook for upserting daily overrides
export function useUpsertDailyOverrides() {
  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: any;
    }) => capacityAPI.upsertDailyOverrides(organizationId, data),
  });
}
