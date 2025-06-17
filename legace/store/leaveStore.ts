import { create } from 'zustand';
import { LeaveRequest } from '../lib/types';

type LeaveState = {
  requests: LeaveRequest[];
  isLoading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<LeaveRequest>;
  updateRequest: (id: string, request: Partial<LeaveRequest>) => Promise<LeaveRequest>;
  deleteRequest: (id: string) => Promise<void>;
  approveRequest: (id: string, approverId: string, comment?: string) => Promise<void>;
  rejectRequest: (id: string, approverId: string, comment: string) => Promise<void>;
};

// Mock data for demo purposes
const mockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '1',
    type: 'vacation',
    startDate: '2025-06-24',
    endDate: '2025-06-28',
    status: 'approved',
    comment: 'Summer vacation',
    approverComment: 'Approved. Enjoy your vacation!',
    approvedBy: '4',
    createdAt: '2025-05-15T10:00:00Z',
    updatedAt: '2025-05-16T14:30:00Z',
  },
  {
    id: '2',
    employeeId: '2',
    type: 'sick-leave',
    startDate: '2025-06-26',
    endDate: '2025-06-27',
    status: 'approved',
    comment: 'Doctor appointment',
    approvedBy: '4',
    createdAt: '2025-06-25T08:00:00Z',
    updatedAt: '2025-06-25T09:15:00Z',
  },
  {
    id: '3',
    employeeId: '3',
    type: 'personal',
    startDate: '2025-06-25',
    endDate: '2025-06-25',
    status: 'pending',
    comment: 'Personal appointment',
    createdAt: '2025-06-18T11:30:00Z',
    updatedAt: '2025-06-18T11:30:00Z',
  },
  {
    id: '4',
    employeeId: '4',
    type: 'unpaid-leave',
    startDate: '2025-06-27',
    endDate: '2025-06-27',
    status: 'approved',
    comment: 'Personal matters',
    approvedBy: '1',
    createdAt: '2025-06-20T14:00:00Z',
    updatedAt: '2025-06-20T15:30:00Z',
  },
  // Additional leave requests
  {
    id: '5',
    employeeId: '1',
    type: 'personal',
    startDate: '2025-07-01',
    endDate: '2025-07-01',
    status: 'pending',
    comment: 'Family event',
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2025-06-15T09:00:00Z',
  },
  {
    id: '6',
    employeeId: '2',
    type: 'vacation',
    startDate: '2025-07-15',
    endDate: '2025-07-26',
    status: 'approved',
    comment: 'Annual summer vacation',
    approverComment: 'Approved',
    approvedBy: '4',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-02T11:00:00Z',
  },
  {
    id: '7',
    employeeId: '3',
    type: 'sick-leave',
    startDate: '2025-06-28',
    endDate: '2025-06-30',
    status: 'approved',
    comment: 'Recovery from surgery',
    approverComment: 'Get well soon',
    approvedBy: '4',
    createdAt: '2025-06-27T08:00:00Z',
    updatedAt: '2025-06-27T09:00:00Z',
  },
  {
    id: '8',
    employeeId: '4',
    type: 'vacation',
    startDate: '2025-08-01',
    endDate: '2025-08-15',
    status: 'pending',
    comment: 'Summer holidays',
    createdAt: '2025-06-25T15:00:00Z',
    updatedAt: '2025-06-25T15:00:00Z',
  },
  {
    id: '9',
    employeeId: '1',
    type: 'unpaid-leave',
    startDate: '2025-07-08',
    endDate: '2025-07-09',
    status: 'rejected',
    comment: 'Personal project',
    approverComment: 'Critical project deadline',
    approvedBy: '4',
    createdAt: '2025-06-20T11:00:00Z',
    updatedAt: '2025-06-21T10:00:00Z',
  },
  {
    id: '10',
    employeeId: '2',
    type: 'personal',
    startDate: '2025-07-05',
    endDate: '2025-07-05',
    status: 'approved',
    comment: 'Moving day',
    approverComment: 'Approved',
    approvedBy: '4',
    createdAt: '2025-06-15T14:00:00Z',
    updatedAt: '2025-06-16T09:00:00Z',
  }
];

export const useLeaveStore = create<LeaveState>((set, get) => ({
  requests: [],
  isLoading: false,
  error: null,

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ requests: mockLeaveRequests, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch leave requests', isLoading: false });
    }
  },

  addRequest: async (request) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const newRequest: LeaveRequest = {
        ...request,
        id: (get().requests.length + 1).toString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => ({
        requests: [...state.requests, newRequest],
        isLoading: false,
      }));

      return newRequest;
    } catch (error) {
      set({ error: 'Failed to add leave request', isLoading: false });
      throw error;
    }
  },

  updateRequest: async (id, requestData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedRequests = get().requests.map(request =>
        request.id === id
          ? { ...request, ...requestData, updatedAt: new Date().toISOString() }
          : request
      );

      set({ requests: updatedRequests, isLoading: false });

      const updatedRequest = updatedRequests.find(request => request.id === id);
      if (!updatedRequest) {
        throw new Error('Request not found');
      }

      return updatedRequest;
    } catch (error) {
      set({ error: 'Failed to update leave request', isLoading: false });
      throw error;
    }
  },

  deleteRequest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedRequests = get().requests.filter(request => request.id !== id);
      set({ requests: updatedRequests, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to delete leave request', isLoading: false });
      throw error;
    }
  },

  approveRequest: async (id, approverId, comment) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedRequests = get().requests.map(request =>
        request.id === id
          ? {
              ...request,
              status: 'approved',
              approvedBy: approverId,
              approverComment: comment,
              updatedAt: new Date().toISOString(),
            }
          : request
      );

      set({ requests: updatedRequests, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to approve leave request', isLoading: false });
      throw error;
    }
  },

  rejectRequest: async (id, approverId, comment) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedRequests = get().requests.map(request =>
        request.id === id
          ? {
              ...request,
              status: 'rejected',
              approvedBy: approverId,
              approverComment: comment,
              updatedAt: new Date().toISOString(),
            }
          : request
      );

      set({ requests: updatedRequests, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to reject leave request', isLoading: false });
      throw error;
    }
  },
}));