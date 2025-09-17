import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveAPI } from "@/utils/api/leave";
import type {
  LeaveRequest,
  LeaveBalance,
  LeavePolicy,
  LeaveCalendar,
  LeaveStats,
  LeaveSummary,
  CreateLeaveRequestData,
  UpdateLeaveRequestData,
  ApproveLeaveRequestData,
} from "@/utils/api/leave";

// Query Keys Factory
export const leaveKeys = {
  all: ["leave"] as const,
  requests: () => [...leaveKeys.all, "requests"] as const,
  requestsByOrg: (
    organizationId: string,
    params?: {
      user_id?: string;
      status?: string;
      leave_type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    }
  ) => [...leaveKeys.requests(), organizationId, params] as const,
  request: (id: string, organizationId: string) =>
    [...leaveKeys.requests(), id, organizationId] as const,
  balances: () => [...leaveKeys.all, "balances"] as const,
  balancesByOrg: (organizationId: string, userId?: string) =>
    [...leaveKeys.balances(), organizationId, userId] as const,
  policies: () => [...leaveKeys.all, "policies"] as const,
  policiesByOrg: (organizationId: string) =>
    [...leaveKeys.policies(), organizationId] as const,
  calendar: () => [...leaveKeys.all, "calendar"] as const,
  calendarByDateRange: (
    organizationId: string,
    startDate: string,
    endDate: string
  ) => [...leaveKeys.calendar(), organizationId, startDate, endDate] as const,
  stats: () => [...leaveKeys.all, "stats"] as const,
  statsByOrg: (organizationId: string, userId?: string) =>
    [...leaveKeys.stats(), organizationId, userId] as const,
  summary: () => [...leaveKeys.all, "summary"] as const,
  summaryByOrg: (organizationId: string) =>
    [...leaveKeys.summary(), organizationId] as const,
};

// ===== LEAVE REQUESTS =====

export function useLeaveRequests(
  organizationId: string,
  params?: {
    user_id?: string;
    status?: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: leaveKeys.requestsByOrg(organizationId, params),
    queryFn: () => leaveAPI.getLeaveRequests(organizationId, params),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useLeaveRequest(requestId: string, organizationId: string) {
  return useQuery({
    queryKey: leaveKeys.request(requestId, organizationId),
    queryFn: () => leaveAPI.getLeaveRequest(organizationId, requestId),
    enabled: !!requestId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== LEAVE BALANCES =====

export function useLeaveBalances(organizationId: string, userId?: string) {
  return useQuery({
    queryKey: leaveKeys.balancesByOrg(organizationId, userId),
    queryFn: () => leaveAPI.getLeaveBalances(organizationId, userId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== LEAVE POLICIES =====

export function useLeavePolicies(organizationId: string) {
  return useQuery({
    queryKey: leaveKeys.policiesByOrg(organizationId),
    queryFn: () => leaveAPI.getLeavePolicies(organizationId),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== LEAVE CALENDAR =====

export function useLeaveCalendar(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: leaveKeys.calendarByDateRange(organizationId, startDate, endDate),
    queryFn: () =>
      leaveAPI.getLeaveCalendar(organizationId, startDate, endDate),
    enabled: !!organizationId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== LEAVE STATS =====

export function useLeaveStats(organizationId: string, userId?: string) {
  return useQuery({
    queryKey: leaveKeys.statsByOrg(organizationId, userId),
    queryFn: () => leaveAPI.getLeaveStats(organizationId, userId),
    enabled: !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 6 * 60 * 1000, // 6 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== LEAVE SUMMARY =====

export function useLeaveSummary(organizationId: string) {
  return useQuery({
    queryKey: leaveKeys.summaryByOrg(organizationId),
    queryFn: () => leaveAPI.getLeaveSummary(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== MUTATIONS =====

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateLeaveRequestData;
    }) => leaveAPI.createLeaveRequest(organizationId, data),
    onSuccess: (data, variables) => {
      // Invalidate leave requests queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestsByOrg(variables.organizationId),
      });

      // Invalidate stats and summary
      queryClient.invalidateQueries({
        queryKey: leaveKeys.statsByOrg(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.summaryByOrg(variables.organizationId),
      });

      // Invalidate balances
      queryClient.invalidateQueries({
        queryKey: leaveKeys.balancesByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to create leave request:", error);
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      requestId,
      data,
    }: {
      organizationId: string;
      requestId: string;
      data: UpdateLeaveRequestData;
    }) => leaveAPI.updateLeaveRequest(organizationId, requestId, data),
    onSuccess: (data, variables) => {
      // Update the specific request in cache
      queryClient.setQueryData(
        leaveKeys.request(variables.requestId, variables.organizationId),
        data
      );

      // Invalidate leave requests queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestsByOrg(variables.organizationId),
      });

      // Invalidate stats and summary
      queryClient.invalidateQueries({
        queryKey: leaveKeys.statsByOrg(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.summaryByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to update leave request:", error);
    },
  });
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      requestId,
    }: {
      organizationId: string;
      requestId: string;
    }) => leaveAPI.deleteLeaveRequest(organizationId, requestId),
    onSuccess: (data, variables) => {
      // Remove the request from cache
      queryClient.removeQueries({
        queryKey: leaveKeys.request(
          variables.requestId,
          variables.organizationId
        ),
      });

      // Invalidate leave requests queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestsByOrg(variables.organizationId),
      });

      // Invalidate stats and summary
      queryClient.invalidateQueries({
        queryKey: leaveKeys.statsByOrg(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.summaryByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to delete leave request:", error);
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      requestId,
      data,
    }: {
      organizationId: string;
      requestId: string;
      data: ApproveLeaveRequestData;
    }) => leaveAPI.approveLeaveRequest(organizationId, requestId, data),
    onSuccess: (data, variables) => {
      // Update the specific request in cache
      queryClient.setQueryData(
        leaveKeys.request(variables.requestId, variables.organizationId),
        data
      );

      // Invalidate leave requests queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestsByOrg(variables.organizationId),
      });

      // Invalidate stats and summary
      queryClient.invalidateQueries({
        queryKey: leaveKeys.statsByOrg(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.summaryByOrg(variables.organizationId),
      });

      // Invalidate balances if approved
      if (data.leave_request.status === "approved") {
        queryClient.invalidateQueries({
          queryKey: leaveKeys.balancesByOrg(variables.organizationId),
        });
      }
    },
    onError: (error) => {
      console.error("Failed to approve leave request:", error);
    },
  });
}

export function useUpdateLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      balanceId,
      data,
    }: {
      organizationId: string;
      balanceId: string;
      data: { total_days?: number; used_days?: number };
    }) => leaveAPI.updateLeaveBalance(organizationId, balanceId, data),
    onSuccess: (data, variables) => {
      // Invalidate balances queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.balancesByOrg(variables.organizationId),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: leaveKeys.summaryByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to update leave balance:", error);
    },
  });
}

// ===== LEAVE POLICY MUTATIONS =====

export function useCreateLeavePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: Omit<
        LeavePolicy,
        "id" | "organization_id" | "created_at" | "updated_at"
      >;
    }) => leaveAPI.createLeavePolicy(organizationId, data),
    onSuccess: (data, variables) => {
      // Invalidate policies queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.policiesByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to create leave policy:", error);
    },
  });
}

export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      policyId,
      data,
    }: {
      organizationId: string;
      policyId: string;
      data: Partial<
        Omit<
          LeavePolicy,
          "id" | "organization_id" | "created_at" | "updated_at"
        >
      >;
    }) => leaveAPI.updateLeavePolicy(organizationId, policyId, data),
    onSuccess: (data, variables) => {
      // Invalidate policies queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.policiesByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to update leave policy:", error);
    },
  });
}

export function useDeleteLeavePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      policyId,
    }: {
      organizationId: string;
      policyId: string;
    }) => leaveAPI.deleteLeavePolicy(organizationId, policyId),
    onSuccess: (data, variables) => {
      // Invalidate policies queries
      queryClient.invalidateQueries({
        queryKey: leaveKeys.policiesByOrg(variables.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to delete leave policy:", error);
    },
  });
}

// ===== COMBINED HOOKS FOR COMPLEX OPERATIONS =====

/**
 * Hook that fetches all leave-related data for the main page
 */
export function useLeaveData(organizationId: string) {
  const requestsQuery = useLeaveRequests(organizationId, {
    page: 1,
    limit: 100,
  });

  const statsQuery = useLeaveStats(organizationId);
  const summaryQuery = useLeaveSummary(organizationId);

  return {
    leaveRequests: requestsQuery.data?.leave_requests || [],
    stats: statsQuery.data?.stats,
    summary: summaryQuery.data?.summary || [],
    isLoading:
      requestsQuery.isLoading || statsQuery.isLoading || summaryQuery.isLoading,
    isError:
      requestsQuery.isError || statsQuery.isError || summaryQuery.isError,
    error: requestsQuery.error || statsQuery.error || summaryQuery.error,
    refetch: () => {
      requestsQuery.refetch();
      statsQuery.refetch();
      summaryQuery.refetch();
    },
  };
}
