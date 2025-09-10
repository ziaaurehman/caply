"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isWithinInterval } from 'date-fns';
import { Plus, Calendar, X, Filter, ChevronLeft, ChevronRight, Download, AlertTriangle, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { useOrganizationStore } from '@/lib/stores/organizationStore';
import { leaveAPI, LeaveRequest, LeaveStats, LeaveSummary } from '@/utils/api/leave';
import { teamAPI } from '@/utils/api/team';

interface TeamMember {
  id: string;
  user_id: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  roles: {
    name: string;
    display_name: string;
  };
}

export default function LeaveManagementPage() {
  const { currentOrganization } = useOrganizationStore();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [summary, setSummary] = useState<LeaveSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'my-leaves' | 'approve'>('my-leaves');
  
  // Filters and view state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  
  // Modal state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  
  // New request form
  const [newRequest, setNewRequest] = useState<{
    leave_type: LeaveRequest['type'];
    start_date: string;
    end_date: string;
    reason?: string;
  }>({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Approval form
  const [approvalData, setApprovalData] = useState<{
    status: 'approved' | 'rejected';
    comment?: string;
    rejected_reason?: string;
  }>({
    status: 'approved',
    comment: '',
    rejected_reason: '',
  });

  const fetchData = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch leave requests
      const requestsResponse = await leaveAPI.getLeaveRequests(currentOrganization.id, {
        page: 1,
        limit: 100,
      });
      setLeaveRequests(requestsResponse.leave_requests);

      // Fetch team members
      const teamResponse = await teamAPI.getTeamMembers(currentOrganization.id);
      setTeamMembers(teamResponse.members || []);

      // Fetch stats
      const statsResponse = await leaveAPI.getLeaveStats(currentOrganization.id);
      setStats(statsResponse.stats);

      // Fetch summary
      const summaryResponse = await leaveAPI.getLeaveSummary(currentOrganization.id);
      setSummary(summaryResponse.summary);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id, fetchData]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id) return;

    try {
      await leaveAPI.createLeaveRequest(currentOrganization.id, newRequest);
      await fetchData();
      setShowNewRequestModal(false);
      setNewRequest({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    }
  };

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !selectedRequest) return;

    try {
      await leaveAPI.approveLeaveRequest(currentOrganization.id, selectedRequest.id, approvalData);
      await fetchData();
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalData({
        status: 'approved',
        comment: '',
        rejected_reason: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process leave request');
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'vacation':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'sick':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'personal':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'unpaid':
        return 'bg-gray-100 border-gray-500 text-gray-700';
      case 'maternity':
        return 'bg-pink-100 border-pink-500 text-pink-700';
      case 'paternity':
        return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'bereavement':
        return 'bg-indigo-100 border-indigo-500 text-indigo-700';
      default:
        return 'bg-orange-100 border-orange-500 text-orange-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePreviousPeriod = () => {
    setSelectedDate(view === 'week' ? subWeeks(selectedDate, 1) : subWeeks(selectedDate, 4));
  };

  const handleNextPeriod = () => {
    setSelectedDate(view === 'week' ? addWeeks(selectedDate, 1) : addWeeks(selectedDate, 4));
  };

  // Calculate days to display
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: view === 'week' ? 5 : 20 }, (_, i) => addDays(startDate, i));

  // Filter requests based on selected filters
  const filteredRequests = leaveRequests.filter(request => {
    const matchesEmployee = selectedEmployee === 'all' || request.user_id === selectedEmployee;
    const matchesType = selectedLeaveType === 'all' || request.type === selectedLeaveType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    return matchesEmployee && matchesType && matchesStatus;
  });

  // Group team members with their leave requests
  const memberLeaves = teamMembers.map(member => {
    const memberRequests = filteredRequests.filter(request => request.user_id === member.user_id);
    return {
      member,
      requests: memberRequests,
    };
  });

  const exportCalendar = () => {
    // Implementation for exporting calendar data
    console.log('Exporting calendar...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-6 w-1/4 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Leave Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Request and manage time off for your team
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("my-leaves")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-leaves"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Leaves
            </button>
                        <button
                          onClick={() => setActiveTab("approve")}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "approve"
                              ? "border-orange-500 text-orange-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Approve
                        </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === "my-leaves" ? (
          <MyLeavesView
            leaveRequests={leaveRequests}
            teamMembers={teamMembers}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            selectedLeaveType={selectedLeaveType}
            setSelectedLeaveType={setSelectedLeaveType}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            view={view}
            setView={setView}
            onNewRequest={() => setShowNewRequestModal(true)}
            onExport={exportCalendar}
            onRequestClick={(request) => {
              setSelectedRequest(request);
              setShowApprovalModal(true);
            }}
          />
        ) : (
          <ApproveLeavesView
            leaveRequests={leaveRequests}
            teamMembers={teamMembers}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            selectedLeaveType={selectedLeaveType}
            setSelectedLeaveType={setSelectedLeaveType}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            onRequestClick={(request) => {
              setSelectedRequest(request);
              setShowApprovalModal(true);
            }}
          />
        )}
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  New Leave Request
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Submit a new leave request for approval
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewRequest({
                    leave_type: 'vacation',
                    start_date: '',
                    end_date: '',
                    reason: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <div className="relative">
                    <select
                      value={newRequest.leave_type}
                      onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value as LeaveRequest['type'] })}
                      className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                    >
                      <option value="vacation">Vacation</option>
                      <option value="sick_leave">Sick Leave</option>
                      <option value="personal">Personal Leave</option>
                      <option value="unpaid_leave">Unpaid Leave</option>
                      <option value="maternity">Maternity Leave</option>
                      <option value="paternity">Paternity Leave</option>
                      <option value="bereavement">Bereavement Leave</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                      className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value })}
                      className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={newRequest.reason || ''}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                    className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
                    placeholder="Brief reason for leave..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewRequestModal(false);
                      setNewRequest({
                        leave_type: 'vacation',
                        start_date: '',
                        end_date: '',
                        reason: '',
                      });
                    }}
                    className="px-6 py-2.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    leftIcon={<Calendar className="h-4 w-4" />}
                    className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500 px-6 py-2.5"
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Review Leave Request
              </h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalData({
                    status: 'approved',
                    comment: '',
                    rejected_reason: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Request Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Type:</span> {selectedRequest.type.replace('_', ' ')}</p>
                  <p><span className="font-medium">Dates:</span> {format(parseISO(selectedRequest.start_date), 'MMM d')} - {format(parseISO(selectedRequest.end_date), 'MMM d, yyyy')}</p>
                  <p><span className="font-medium">Days:</span> {selectedRequest.days_requested}</p>
                  {selectedRequest.reason && (
                    <p><span className="font-medium">Reason:</span> {selectedRequest.reason}</p>
                  )}
                  {/* No separate comments field in current schema */}
                </div>
              </div>
              
              <form onSubmit={handleApproveRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Decision
                  </label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="approved"
                        checked={approvalData.status === 'approved'}
                        onChange={(e) => setApprovalData({ ...approvalData, status: e.target.value as 'approved' | 'rejected' })}
                        className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Approve</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="rejected"
                        checked={approvalData.status === 'rejected'}
                        onChange={(e) => setApprovalData({ ...approvalData, status: e.target.value as 'approved' | 'rejected' })}
                        className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Reject</span>
                    </label>
                  </div>
                </div>
                
                {approvalData.status === 'rejected' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rejection Reason
                    </label>
                    <input
                      type="text"
                      value={approvalData.rejected_reason || ''}
                      onChange={(e) => setApprovalData({ ...approvalData, rejected_reason: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                      placeholder="Reason for rejection"
                      required={approvalData.status === 'rejected'}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={approvalData.comment || ''}
                    onChange={(e) => setApprovalData({ ...approvalData, comment: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="Additional comments..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                      setApprovalData({
                        status: 'approved',
                        comment: '',
                        rejected_reason: '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className={`${
                      approvalData.status === 'approved' 
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    }`}
                  >
                    {approvalData.status === 'approved' ? 'Approve' : 'Reject'} Request
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// My Leaves View Component
function MyLeavesView({
  leaveRequests,
  teamMembers,
  selectedEmployee,
  setSelectedEmployee,
  selectedLeaveType,
  setSelectedLeaveType,
  selectedStatus,
  setSelectedStatus,
  selectedDate,
  setSelectedDate,
  view,
  setView,
  onNewRequest,
  onExport,
  onRequestClick,
}: {
  leaveRequests: LeaveRequest[];
  teamMembers: TeamMember[];
  selectedEmployee: string;
  setSelectedEmployee: (value: string) => void;
  selectedLeaveType: string;
  setSelectedLeaveType: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  view: 'week' | 'month';
  setView: (view: 'week' | 'month') => void;
  onNewRequest: () => void;
  onExport: () => void;
  onRequestClick: (request: LeaveRequest) => void;
}) {
  const handlePreviousPeriod = () => {
    setSelectedDate(view === 'week' ? subWeeks(selectedDate, 1) : subWeeks(selectedDate, 4));
  };

  const handleNextPeriod = () => {
    setSelectedDate(view === 'week' ? addWeeks(selectedDate, 1) : addWeeks(selectedDate, 4));
  };

  // Calculate days to display
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: view === 'week' ? 5 : 20 }, (_, i) => addDays(startDate, i));

  // Filter requests based on selected filters
  const filteredRequests = leaveRequests.filter(request => {
    const matchesEmployee = selectedEmployee === 'all' || request.user_id === selectedEmployee;
    const matchesType = selectedLeaveType === 'all' || request.type === selectedLeaveType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    return matchesEmployee && matchesType && matchesStatus;
  });

  // Group team members with their leave requests
  const memberLeaves = teamMembers.map(member => {
    const memberRequests = filteredRequests.filter(request => request.user_id === member.user_id);
    return {
      member,
      requests: memberRequests,
    };
  });

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'vacation':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'sick':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'personal':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'unpaid':
        return 'bg-gray-100 border-gray-500 text-gray-700';
      case 'maternity':
        return 'bg-pink-100 border-pink-500 text-pink-700';
      case 'paternity':
        return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'bereavement':
        return 'bg-indigo-100 border-indigo-500 text-indigo-700';
      default:
        return 'bg-orange-100 border-orange-500 text-orange-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Employees</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.user_id}>
                  {member.users.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Types</option>
              <option value="vacation">Vacation</option>
              <option value="sick_leave">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="unpaid_leave">Unpaid Leave</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
              <option value="bereavement">Bereavement</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-4 py-2 text-sm font-medium border ${
                view === 'week'
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              } rounded-l-md`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
                view === 'month'
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              } rounded-r-md`}
            >
              Month
            </button>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <Button
              variant="outline"
              onClick={onExport}
              leftIcon={<Download className="h-4 w-4" />}
              size="sm"
            >
              Export
            </Button>
            
            <Button
              onClick={onNewRequest}
              leftIcon={<Plus className="h-4 w-4" />}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
            >
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Team Calendar</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePreviousPeriod}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <span className="text-sm font-medium">
                {format(startDate, 'MMMM d, yyyy')}
              </span>
              
              <button
                onClick={handleNextPeriod}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Employee
                </th>
                {days.map((day, index) => (
                  <th
                    key={index}
                    className={`px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 ${
                      format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-orange-50" : ""
                    }`}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-gray-400 font-normal">
                      {format(day, 'MMM d')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {memberLeaves.map(({ member, requests }) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.users.avatar_url ? (
                        <Image
                          src={member.users.avatar_url}
                          alt={member.users.full_name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-700 font-medium">
                            {member.users.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member.users.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.roles.display_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  {days.map((day, index) => {
                    const dayRequests = requests.filter(request =>
                      isWithinInterval(day, {
                        start: parseISO(request.start_date),
                        end: parseISO(request.end_date),
                      })
                    );
                    
                    return (
                      <td key={index} className="px-3 py-4">
                        {dayRequests.map(request => (
                          <div
                            key={request.id}
                            className={`p-2 rounded-md border text-sm mb-1 relative group cursor-pointer ${getLeaveTypeColor(request.type)}`}
                            onClick={() => onRequestClick(request)}
                          >
                            <div className="font-medium">
                              {request.type.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </div>
                            <div className="mt-1">
                              <span className={`px-1.5 py-0.5 text-xs rounded-full ${getStatusColor(request.status)}`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm rounded-md p-2 z-10 w-48 -mt-2 left-full ml-2">
                              <p className="font-medium">{member.users.full_name}</p>
                              <p className="text-gray-300 text-xs mt-1">
                                {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                              </p>
                              {request.reason && (
                                <p className="text-gray-300 text-xs mt-1">
                                  {request.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Approve Leaves View Component
function ApproveLeavesView({
  leaveRequests,
  teamMembers,
  selectedEmployee,
  setSelectedEmployee,
  selectedLeaveType,
  setSelectedLeaveType,
  selectedStatus,
  setSelectedStatus,
  onRequestClick,
}: {
  leaveRequests: LeaveRequest[];
  teamMembers: TeamMember[];
  selectedEmployee: string;
  setSelectedEmployee: (value: string) => void;
  selectedLeaveType: string;
  setSelectedLeaveType: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  onRequestClick: (request: LeaveRequest) => void;
}) {
  // Filter requests based on selected filters
  const filteredRequests = leaveRequests.filter(request => {
    const matchesEmployee = selectedEmployee === 'all' || request.user_id === selectedEmployee;
    const matchesType = selectedLeaveType === 'all' || request.type === selectedLeaveType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    return matchesEmployee && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Employees</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.user_id}>
                  {member.users.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Types</option>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
              <option value="bereavement">Bereavement</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EMPLOYEE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LEAVE TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DATES
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DAYS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const member = teamMembers.find(m => m.user_id === request.user_id);
                if (!member) return null;
                
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {member.users.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {member.users.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.users.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.type.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.days_requested} days
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onRequestClick(request)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onRequestClick(request)}
                              className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onRequestClick(request)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
