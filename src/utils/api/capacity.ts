// Capacity API Types
// After rework, frontend uses project_assignments as allocations
export interface ResourceAllocation {
  id: string;
  resource_allocation_id: string;
  project_id: string;
  hours_per_week: number;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CapacityOverview {
  member: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
    role: string;
    project: {
      id: string;
      name: string;
      code?: string;
    };
  };
  allocations: ResourceAllocation[];
  capacity: number;
  totalAllocatedHours: number;
  availableHours: number;
  utilizationPercent: number;
  status: "optimal" | "nearOptimal" | "overallocated" | "underutilized";
}

export interface CapacitySettings {
  id: string;
  project_id: string;
  default_weekly_capacity: number;
  default_work_days_per_week: number;
  allow_overallocation: boolean;
  overallocation_threshold: number;
  notification_settings: {
    email_on_overallocation: boolean;
    email_on_capacity_changes: boolean;
    weekly_capacity_reports: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface MemberCapacity {
  // kept for type compatibility (not used after rework)
  id: string;
  project_member_id: string;
  weekly_capacity_hours: number;
  work_days_per_week: number;
  availability_start_date?: string;
  availability_end_date?: string;
  time_zone: string;
  notes?: string;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

// Response Types
interface AllocationsResponse {
  allocations: ResourceAllocation[];
}

interface AllocationResponse {
  allocation: ResourceAllocation;
}

interface OverviewResponse {
  capacityOverview: CapacityOverview[];
  summary: {
    totalMembers: number;
    overallocatedMembers: number;
    optimalMembers: number;
    underutilizedMembers: number;
    totalCapacity: number;
    totalAllocated: number;
    totalAvailable: number;
  };
}

interface SettingsResponse {
  settings: CapacitySettings[];
}

interface SettingResponse {
  settings: CapacitySettings;
}

interface CapacitiesResponse {
  capacities: MemberCapacity[];
}

interface CapacityResponse {
  capacity: MemberCapacity;
}

// Capacity API
export const capacityAPI = {
  // ===== RESOURCE ALLOCATIONS =====

  // Get allocations (project_assignments)
  getAllocations: async (
    organizationId: string,
    params?: {
      project_id?: string;
      start_date?: string;
      end_date?: string;
      filter_project_ids?: string[];
    }
  ): Promise<AllocationsResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set("organizationId", organizationId);
    if (params?.project_id) searchParams.set("project_id", params.project_id);
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    params?.filter_project_ids?.forEach((id) =>
      searchParams.append("filter_project_id", id)
    );

    const response = await fetch(
      `/api/capacity/allocations?${searchParams.toString()}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch allocations");
    }
    const data = await response.json();
    return { allocations: data.allocations || [] };
  },

  // Create allocation (project assignment). Requires organization_member_id
  createAllocation: async (allocation: {
    organization_id: string;
    project_id: string;
    organization_member_id: string;
    hours_per_week: number;
    start_date: string;
    end_date?: string | null;
    notes?: string | null;
    default_hours_per_day?: number;
    allow_weekends?: boolean;
  }): Promise<AllocationResponse> => {
    const { organization_id, ...rest } = allocation as any;
    const response = await fetch("/api/capacity/allocations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organization_id,
      },
      body: JSON.stringify({ organizationId: organization_id, ...rest }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create allocation");
    }
    const data = await response.json();
    return { allocation: data.allocation };
  },

  // Update allocation (project assignment)
  updateAllocation: async (
    id: string,
    allocation: Partial<ResourceAllocation>,
    organizationId?: string
  ): Promise<AllocationResponse> => {
    const response = await fetch(`/api/capacity/allocations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
      body: JSON.stringify(allocation),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update allocation");
    }
    const data = await response.json();
    return { allocation: data.allocation };
  },

  // Delete allocation (project assignment)
  deleteAllocation: async (
    organizationId: string,
    id: string
  ): Promise<void> => {
    const response = await fetch(`/api/capacity/allocations/${id}`, {
      method: "DELETE",
      headers: {
        "x-organization-id": organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete allocation");
    }
  },

  // ===== CAPACITY OVERVIEW =====

  // Get capacity overview (still supported by server route; will compute from new tables)
  getOverview: async (
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
  ): Promise<OverviewResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set("organizationId", organizationId);
    if (params?.project_id) searchParams.set("project_id", params.project_id);
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    params?.filter_project_ids?.forEach((id) =>
      searchParams.append("filter_project_id", id)
    );
    params?.filter_user_ids?.forEach((id) =>
      searchParams.append("filter_user_id", id)
    );
    if (params?.only_overallocated !== undefined)
      searchParams.set("only_overallocated", String(params.only_overallocated));
    if (params?.only_active !== undefined)
      searchParams.set("only_active", String(params.only_active));

    const response = await fetch(
      `/api/capacity/overview?${searchParams.toString()}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch capacity overview");
    }
    return await response.json();
  },

  // ===== CAPACITY SETTINGS ===== (deprecated in rework; kept to avoid breaking calls)
  getSettings: async (_project_id?: string): Promise<SettingsResponse> => ({
    settings: [],
  }),
  updateSettings: async (
    _settings: Partial<CapacitySettings> & { project_id: string }
  ): Promise<SettingResponse> => ({ settings: {} as any }),

  // ===== MEMBER CAPACITY =====

  // Get member capacities
  getMemberCapacities: async (params?: {
    project_member_id?: string;
    project_id?: string;
  }): Promise<CapacitiesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.project_member_id)
      searchParams.set("project_member_id", params.project_member_id);
    if (params?.project_id) searchParams.set("project_id", params.project_id);

    const response = await fetch(
      `/api/capacity/members?${searchParams.toString()}`
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch member capacities");
    }
    const data = await response.json();
    return { capacities: data.capacities || [] };
  },

  // Update member capacity
  updateMemberCapacity: async (
    capacity: Omit<MemberCapacity, "id" | "created_at" | "updated_at">
  ): Promise<CapacityResponse> => {
    const response = await fetch("/api/capacity/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(capacity),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update member capacity");
    }
    const data = await response.json();
    return { capacity: data.capacity };
  },

  // ===== TASKS SUMMARY =====
  getTasksSummary: async (
    organizationId: string,
    params: {
      user_id?: string;
      project_id?: string;
      project_ids?: string[];
      start_date?: string;
      end_date?: string;
      include_tasks?: boolean;
    }
  ): Promise<{
    summary: Array<{
      project_id: string;
      project_name?: string;
      tasks_count: number;
      estimated_hours: number;
      tasks?: Array<{
        id: string;
        title: string;
        estimated_hours?: number;
        due_date?: string;
      }>;
    }>;
  }> => {
    const sp = new URLSearchParams();
    sp.set("organizationId", organizationId);
    if (params.user_id) sp.set("user_id", params.user_id);
    if (params.project_id) sp.set("project_id", params.project_id);
    params.project_ids?.forEach((id) => sp.append("project_id", id));
    if (params.start_date) sp.set("start_date", params.start_date);
    if (params.end_date) sp.set("end_date", params.end_date);
    if (params.include_tasks) sp.set("include_tasks", "true");

    const res = await fetch(`/api/capacity/tasks/summary?${sp.toString()}`, {
      headers: { "x-organization-id": organizationId },
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "Failed to fetch tasks summary");
    }
    return res.json();
  },

  // ===== MONTHLY VIEW =====
  getMonthly: async (
    organizationId: string,
    month: string,
    params?: { only_active?: boolean }
  ): Promise<{
    resources: Array<{
      resource_allocation_id: string;
      organization_member_id: string;
      user: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
        position?: string;
      };
      weekly_capacity_hours: number;
      weeks: Array<{
        week_start_date: string;
        used: number;
        total: number;
        utilizationPercent: number;
        status: string;
        projects: Array<{
          project: { id: string; name: string; code?: string; status?: string };
          weekly_hours: number;
          default_hours_per_day: number;
          allow_weekends: boolean;
        }>;
      }>;
    }>;
    weeks: Array<{ week_start_date: string }>;
  }> => {
    const sp = new URLSearchParams();
    sp.set("organizationId", organizationId);
    sp.set("month", month);
    if (params?.only_active !== undefined)
      sp.set("only_active", String(params.only_active));

    const res = await fetch(`/api/capacity/monthly?${sp.toString()}`, {
      headers: { "x-organization-id": organizationId },
    });
    debugger
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "Failed to fetch monthly capacity");
    }
    return res.json();
  },

  // ===== WEEKLY PLAN UPSERT =====
  upsertWeeklyPlan: async (
    organizationId: string,
    data: {
      resource_allocation_id: string;
      project_id: string;
      week_start_date: string;
      default_hours_per_day?: number;
      allow_weekends?: boolean;
      is_linked?: boolean;
    }
  ): Promise<{ success: boolean; weekly_plan_id: string }> => {
    const res = await fetch("/api/capacity/weekly-plans", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ organizationId, ...data }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "Failed to upsert weekly plan");
    }
    return res.json();
  },

  // ===== DAILY OVERRIDES UPSERT =====
  upsertDailyOverrides: async (
    organizationId: string,
    data: {
      weekly_plan_id: string;
      overrides: Array<{ day_of_week: number; actual_hours: number }>;
      unlink_week?: boolean;
    }
  ): Promise<{ success: boolean }> => {
    const res = await fetch("/api/capacity/daily-overrides", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ organizationId, ...data }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "Failed to upsert daily overrides");
    }
    return res.json();
  },
};
