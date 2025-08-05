// Capacity API Types
export interface ResourceAllocation {
  id: string;
  project_member_id: string;
  project_id: string;
  allocated_hours_per_week: number;
  start_date: string;
  end_date?: string | null;
  role?: string | null;
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
  status: 'optimal' | 'nearOptimal' | 'overallocated' | 'underutilized';
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
  
  // Get allocations
  getAllocations: async (organizationId: string, params?: {
    project_id?: string;
    project_member_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AllocationsResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('organizationId', organizationId);
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.project_member_id) searchParams.set('project_member_id', params.project_member_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const response = await fetch(`/api/capacity/allocations?${searchParams.toString()}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch allocations');
    }
    const data = await response.json();
    return { allocations: data.allocations || [] };
  },

  // Create allocation
  createAllocation: async (allocation: Omit<ResourceAllocation, 'id' | 'created_at' | 'updated_at'> & { organization_id: string }): Promise<AllocationResponse> => {
    const response = await fetch('/api/capacity/allocations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': allocation.organization_id,
      },
      body: JSON.stringify(allocation),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create allocation');
    }
    const data = await response.json();
    return { allocation: data.allocation };
  },

  // Update allocation
  updateAllocation: async (id: string, allocation: Partial<ResourceAllocation>): Promise<AllocationResponse> => {
    const response = await fetch('/api/capacity/allocations', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...allocation }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update allocation');
    }
    const data = await response.json();
    return { allocation: data.allocation };
  },

  // Delete allocation
  deleteAllocation: async (id: string): Promise<void> => {
    const response = await fetch('/api/capacity/allocations', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete allocation');
    }
  },

  // ===== CAPACITY OVERVIEW =====
  
  // Get capacity overview
  getOverview: async (organizationId: string, params?: {
    project_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<OverviewResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('organizationId', organizationId);
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const response = await fetch(`/api/capacity/overview?${searchParams.toString()}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch capacity overview');
    }
    return await response.json();
  },

  // ===== CAPACITY SETTINGS =====
  
  // Get settings
  getSettings: async (project_id?: string): Promise<SettingsResponse> => {
    const searchParams = new URLSearchParams();
    if (project_id) searchParams.set('project_id', project_id);

    const response = await fetch(`/api/capacity/settings?${searchParams.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch capacity settings');
    }
    const data = await response.json();
    return { settings: data.settings || [] };
  },

  // Update settings
  updateSettings: async (settings: Partial<CapacitySettings> & { project_id: string }): Promise<SettingResponse> => {
    const response = await fetch('/api/capacity/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update capacity settings');
    }
    const data = await response.json();
    return { settings: data.settings };
  },

  // ===== MEMBER CAPACITY =====
  
  // Get member capacities
  getMemberCapacities: async (params?: {
    project_member_id?: string;
    project_id?: string;
  }): Promise<CapacitiesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.project_member_id) searchParams.set('project_member_id', params.project_member_id);
    if (params?.project_id) searchParams.set('project_id', params.project_id);

    const response = await fetch(`/api/capacity/members?${searchParams.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch member capacities');
    }
    const data = await response.json();
    return { capacities: data.capacities || [] };
  },

  // Update member capacity
  updateMemberCapacity: async (capacity: Omit<MemberCapacity, 'id' | 'created_at' | 'updated_at'>): Promise<CapacityResponse> => {
    const response = await fetch('/api/capacity/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(capacity),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update member capacity');
    }
    const data = await response.json();
    return { capacity: data.capacity };
  },
};
