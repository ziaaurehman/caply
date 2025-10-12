// Timesheets API Types for Weekly Timesheet System
export interface TimesheetSubmission {
  id: string;
  organization_id: string;
  user_id: string;
  project_member_id: string;
  week_start_date: string;
  week_end_date: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  total_hours: number;
  created_at: string;
  updated_at: string;
  timesheet_entries?: TimesheetEntry[];
  project_member?: {
    id: string;
    organization_members: {
      users: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
      };
    };
  };
}

export interface TimesheetEntry {
  id: string;
  timesheet_submission_id: string;
  project_id: string;
  task_description: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  monday_notes?: string;
  tuesday_motes?: string;
  wednesday_notes?: string;
  thursday_notes?: string;
  friday_notes?: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    name: string;
    code?: string;
    isPlanned?: boolean; // We'll compute this from capacity planning
  };
}

export interface CapacityProject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  isPlanned: boolean;
  totalHoursPerWeek: number;
  assignments: {
    id: string;
    hoursPerWeek: number;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  }[];
}

interface CapacityProjectsResponse {
  projects: CapacityProject[];
  success: boolean;
}

export interface WeekTimesheetData {
  submission: TimesheetSubmission | null;
  projects: any[]; // We'll get from capacity planning
}

// Response Types
interface TimesheetResponse {
  submission: TimesheetSubmission | null;
  success: boolean;
}

interface SubmissionsResponse {
  submissions: TimesheetSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
}

// Timesheets API
export const timesheetsAPI = {
  // Get current week's draft timesheet
  getDraftTimesheet: async (
    organizationId: string,
    weekStart: string
  ): Promise<TimesheetResponse> => {
    const params = new URLSearchParams({
      organizationId,
      weekStart,
    });

    const response = await fetch(`/api/timesheets/get-draft?${params}`, {
      headers: {
        "x-organization-id": organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch timesheet draft");
    }

    return await response.json();
  },

  // Save draft timesheet
  saveDraftTimesheet: async (
    organizationId: string,
    data: {
      submissionId?: string;
      weekStart: string;
      entries: any[];
      totalHours: number;
    }
  ): Promise<TimesheetResponse> => {
    const response = await fetch("/api/timesheets/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        organizationId,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save timesheet draft");
    }

    return await response.json();
  },

  // Submit timesheet for approval
  submitTimesheet: async (
    organizationId: string,
    submissionId: string
  ): Promise<TimesheetResponse> => {
    const response = await fetch("/api/timesheets/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        organizationId,
        submissionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to submit timesheet");
    }

    return await response.json();
  },

  getSubmissionsForApproval: async (
    organizationId: string,
    params?: {
      status?: "submitted" | "approved" | "rejected";
      user_id?: string;
      week_start?: string;
      week_end?: string;
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<SubmissionsResponse> => {
    const finalSearchParm: { [key: string]: string | number | undefined } = {};
    if (params?.status) finalSearchParm["status"] = params.status;
    if (params?.user_id) finalSearchParm["user_id"] = params.user_id;
    if (params?.week_start) finalSearchParm["week_start"] = params.week_start;
    if (params?.week_end) finalSearchParm["week_end"] = params.week_end;
    if (params?.page) finalSearchParm["page"] = params.page;
    if (params?.limit) finalSearchParm["limit"] = params.limit;
    if (params?.search) finalSearchParm["search"] = params.search;
    const searchParams = new URLSearchParams({
      organizationId,
      ...finalSearchParm,
    });

    const response = await fetch(
      `/api/timesheets/submissions?${searchParams}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch submissions");
    }

    return await response.json();
  },

  // Approve or reject submission
  resolveSubmission: async (
    organizationId: string,
    submissionId: string,
    action: "approve" | "reject",
    rejectionReason?: string
  ): Promise<TimesheetResponse> => {
    const response = await fetch("/api/timesheets/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        organizationId,
        submissionId,
        action,
        rejectionReason,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${action} submission`);
    }

    return await response.json();
  },

  // Get projects for dropdown (from capacity planning)
  getTimesheetProjects: async (
    organizationId: string
  ): Promise<{ projects: any[] }> => {
    const response = await fetch(
      `/api/capacity/projects/all?organizationId=${organizationId}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch projects");
    }

    return await response.json();
  },

  // Get projects with capacity for current user
  getCapacityProjects: async (
    organizationId: string
  ): Promise<CapacityProjectsResponse> => {
    const params = new URLSearchParams({
      organizationId,
    });

    const response = await fetch(
      `/api/timesheets/capacity-projects?${params}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch capacity projects");
    }

    return await response.json();
  },

  // Update individual timesheet entry
  updateTimesheetEntry: async (
    organizationId: string,
    entryId: string,
    data: {
      project_id?: string;
      task_description?: string;
      monday_hours?: number;
      tuesday_hours?: number;
      wednesday_hours?: number;
      thursday_hours?: number;
      friday_hours?: number;
      monday_notes?: string;
      tuesday_notes?: string;
      wednesday_notes?: string;
      thursday_notes?: string;
      friday_notes?: string;
    }
  ): Promise<{ entry: TimesheetEntry; success: boolean }> => {
    const response = await fetch("/api/timesheets/update-entry", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        organizationId,
        entryId,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update timesheet entry");
    }

    return await response.json();
  },

  // Delete individual timesheet entry
  deleteTimesheetEntry: async (
    organizationId: string,
    entryId: string
  ): Promise<{ success: boolean; message: string }> => {
    const params = new URLSearchParams({
      organizationId,
      entryId,
    });

    const response = await fetch(`/api/timesheets/delete-entry?${params}`, {
      method: "DELETE",
      headers: {
        "x-organization-id": organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete timesheet entry");
    }

    return await response.json();
  },
};

export type {
  TimesheetResponse,
  SubmissionsResponse,
  CapacityProjectsResponse,
};
