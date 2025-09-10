interface LeaveRequest {
  id: string;
  organization_id: string;
  user_id: string;
  // API returns `type` from DB column
  type: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'training' | 'maternity' | 'paternity' | 'bereavement' | 'other';
  start_date: string;
  end_date: string;
  // API returns `days_requested` from DB column
  days_requested: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  // API returns `rejection_reason` from DB column
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface LeaveBalance {
  id: string;
  organization_id: string;
  user_id: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface LeavePolicy {
  id: string;
  organization_id: string;
  leave_type: string;
  max_days_per_year: number;
  max_consecutive_days: number;
  requires_approval: boolean;
  advance_notice_days: number;
  carry_over_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LeaveCalendar {
  date: string;
  is_working_day: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  leave_requests: LeaveRequest[];
}

interface CreateLeaveRequestData {
  leave_type: LeaveRequest['type'];
  start_date: string;
  end_date: string;
  reason?: string;
}

interface UpdateLeaveRequestData {
  leave_type?: LeaveRequest['type'];
  start_date?: string;
  end_date?: string;
  reason?: string;
}

interface ApproveLeaveRequestData {
  status: 'approved' | 'rejected';
  comment?: string;
  rejected_reason?: string;
}

interface LeaveStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_days_requested: number;
  total_days_approved: number;
  upcoming_requests: number;
}

interface LeaveSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  total_leave_days: number;
  used_leave_days: number;
  remaining_leave_days: number;
  pending_requests: number;
  upcoming_requests: number;
}

// Response Types
interface LeaveRequestsResponse {
  leave_requests: LeaveRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface LeaveRequestResponse {
  leave_request: LeaveRequest;
}

interface LeaveBalancesResponse {
  leave_balances: LeaveBalance[];
}

interface LeaveBalanceResponse {
  leave_balance: LeaveBalance;
}

interface LeavePoliciesResponse {
  leave_policies: LeavePolicy[];
}

interface LeavePolicyResponse {
  leave_policy: LeavePolicy;
}

interface LeaveCalendarResponse {
  calendar: LeaveCalendar[];
  start_date: string;
  end_date: string;
}

interface LeaveStatsResponse {
  stats: LeaveStats;
}

interface LeaveSummaryResponse {
  summary: LeaveSummary[];
}

// API Functions
export const leaveAPI = {
  // Leave Requests
  async getLeaveRequests(organizationId: string, params?: {
    user_id?: string;
    status?: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<LeaveRequestsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('organizationId', organizationId);
    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.leave_type) searchParams.append('leave_type', params.leave_type);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`/api/leave/requests?${searchParams.toString()}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave requests');
    }

    return response.json();
  },

  async getLeaveRequest(organizationId: string, requestId: string): Promise<LeaveRequestResponse> {
    const response = await fetch(`/api/leave/requests/${requestId}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave request');
    }

    return response.json();
  },

  async createLeaveRequest(organizationId: string, data: CreateLeaveRequestData): Promise<LeaveRequestResponse> {
    const response = await fetch(`/api/leave/requests?organizationId=${organizationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create leave request');
    }

    return response.json();
  },

  async updateLeaveRequest(organizationId: string, requestId: string, data: UpdateLeaveRequestData): Promise<LeaveRequestResponse> {
    const response = await fetch(`/api/leave/requests/${requestId}?organizationId=${organizationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave request');
    }

    return response.json();
  },

  async deleteLeaveRequest(organizationId: string, requestId: string): Promise<void> {
    const response = await fetch(`/api/leave/requests/${requestId}?organizationId=${organizationId}`, {
      method: 'DELETE',
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete leave request');
    }
  },

  async approveLeaveRequest(organizationId: string, requestId: string, data: ApproveLeaveRequestData): Promise<LeaveRequestResponse> {
    const response = await fetch(`/api/leave/requests/${requestId}/approve?organizationId=${organizationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to approve leave request');
    }

    return response.json();
  },

  // Leave Balances
  async getLeaveBalances(organizationId: string, userId?: string): Promise<LeaveBalancesResponse> {
    const searchParams = new URLSearchParams();
    if (userId) searchParams.append('user_id', userId);

    const response = await fetch(`/api/leave/balances?${searchParams.toString()}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave balances');
    }

    return response.json();
  },

  async updateLeaveBalance(organizationId: string, balanceId: string, data: {
    total_days?: number;
    used_days?: number;
  }): Promise<LeaveBalanceResponse> {
    const response = await fetch(`/api/leave/balances/${balanceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave balance');
    }

    return response.json();
  },

  // Leave Policies
  async getLeavePolicies(organizationId: string): Promise<LeavePoliciesResponse> {
    const response = await fetch('/api/leave/policies', {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave policies');
    }

    return response.json();
  },

  async createLeavePolicy(organizationId: string, data: Omit<LeavePolicy, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<LeavePolicyResponse> {
    const response = await fetch('/api/leave/policies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create leave policy');
    }

    return response.json();
  },

  async updateLeavePolicy(organizationId: string, policyId: string, data: Partial<Omit<LeavePolicy, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>): Promise<LeavePolicyResponse> {
    const response = await fetch(`/api/leave/policies/${policyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave policy');
    }

    return response.json();
  },

  async deleteLeavePolicy(organizationId: string, policyId: string): Promise<void> {
    const response = await fetch(`/api/leave/policies/${policyId}`, {
      method: 'DELETE',
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete leave policy');
    }
  },

  // Leave Calendar
  async getLeaveCalendar(organizationId: string, startDate: string, endDate: string): Promise<LeaveCalendarResponse> {
    const searchParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    const response = await fetch(`/api/leave/calendar?${searchParams.toString()}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave calendar');
    }

    return response.json();
  },

  // Leave Stats
  async getLeaveStats(organizationId: string, userId?: string): Promise<LeaveStatsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('organizationId', organizationId);
    if (userId) searchParams.append('user_id', userId);

    const response = await fetch(`/api/leave/stats?${searchParams.toString()}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave stats');
    }

    return response.json();
  },

  // Leave Summary
  async getLeaveSummary(organizationId: string): Promise<LeaveSummaryResponse> {
    const response = await fetch(`/api/leave/summary?organizationId=${organizationId}`, {
      headers: {
        'X-Organization-ID': organizationId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leave summary');
    }

    return response.json();
  },
};

// Export types
export type {
  LeaveRequest,
  LeaveBalance,
  LeavePolicy,
  LeaveCalendar,
  CreateLeaveRequestData,
  UpdateLeaveRequestData,
  ApproveLeaveRequestData,
  LeaveStats,
  LeaveSummary,
  LeaveRequestsResponse,
  LeaveRequestResponse,
  LeaveBalancesResponse,
  LeaveBalanceResponse,
  LeavePoliciesResponse,
  LeavePolicyResponse,
  LeaveCalendarResponse,
  LeaveStatsResponse,
  LeaveSummaryResponse,
};
