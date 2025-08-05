// Time Entries API Types
export interface TimeEntry {
  id: string;
  project_id: string;
  project_member_id: string;
  organization_id: string;
  date: string;
  hours: number;
  description?: string;
  task_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_members?: {
    id: string;
    role: string;
    projects: {
      id: string;
      name: string;
      code?: string;
    };
    organization_members: {
      id: string;
      users: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
      };
    };
  };
}

export interface TimeEntrySummary {
  totalHours: number;
  entriesCount: number;
  avgHoursPerDay: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
    percentage: number;
  }>;
  weeklyBreakdown: Array<{
    week: string;
    hours: number;
  }>;
}

// Response Types
interface TimeEntriesResponse {
  timeEntries: TimeEntry[];
  summary?: TimeEntrySummary;
}

interface TimeEntryResponse {
  timeEntry: TimeEntry;
}

// Time Entries API
export const timeEntriesAPI = {
  // Get time entries
  getTimeEntries: async (organizationId: string, params?: {
    project_id?: string;
    member_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TimeEntriesResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('organizationId', organizationId);
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.member_id) searchParams.set('member_id', params.member_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const response = await fetch(`/api/time-entries?${searchParams.toString()}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch time entries');
    }
    const data = await response.json();
    return { timeEntries: data.timeEntries || [] };
  },

  // Create time entry
  createTimeEntry: async (timeEntry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { organization_id: string }): Promise<TimeEntryResponse> => {
    const response = await fetch('/api/time-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': timeEntry.organization_id,
      },
      body: JSON.stringify(timeEntry),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create time entry');
    }
    const data = await response.json();
    return { timeEntry: data.timeEntry };
  },

  // Update time entry
  updateTimeEntry: async (id: string, timeEntry: Partial<TimeEntry> & { organization_id: string }): Promise<TimeEntryResponse> => {
    const response = await fetch(`/api/time-entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': timeEntry.organization_id,
      },
      body: JSON.stringify(timeEntry),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update time entry');
    }
    const data = await response.json();
    return { timeEntry: data.timeEntry };
  },

  // Delete time entry
  deleteTimeEntry: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/time-entries/${id}?organizationId=${organizationId}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete time entry');
    }
  },

  // Get time entries summary for capacity validation
  getCapacityUsage: async (organizationId: string, params: {
    project_member_id: string;
    start_date: string;
    end_date: string;
  }): Promise<{ totalHours: number; weeklyBreakdown: Array<{ week: string; hours: number }> }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('organizationId', organizationId);
    searchParams.set('member_id', params.project_member_id);
    searchParams.set('start_date', params.start_date);
    searchParams.set('end_date', params.end_date);

    const response = await fetch(`/api/time-entries/summary?${searchParams.toString()}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch capacity usage');
    }
    const data = await response.json();
    return data;
  }
};

export type {
  TimeEntriesResponse,
  TimeEntryResponse
};
