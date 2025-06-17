import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isWithinInterval } from 'date-fns';
import { Plus, Calendar, X, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useLeaveStore } from '../../store/leaveStore';
import { useAuthStore } from '../../store/authStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { cn } from '../../lib/utils';
import { LeaveRequest } from '../../lib/types';

const LeavePage: React.FC = () => {
  const { user } = useAuthStore();
  const { employees } = useEmployeeStore();
  const { requests, fetchRequests, addRequest } = useLeaveStore();
  
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  
  const [newRequest, setNewRequest] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    comment: '',
  });
  
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addRequest({
        employeeId: user!.id,
        ...newRequest,
      });
      
      setShowNewRequestModal(false);
      setNewRequest({
        type: 'vacation',
        startDate: '',
        endDate: '',
        comment: '',
      });
    } catch (error) {
      console.error('Failed to submit leave request:', error);
    }
  };
  
  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'vacation':
        return 'bg-primary-100 border-primary-500 text-primary-700';
      case 'sick-leave':
        return 'bg-error-100 border-error-500 text-error-700';
      case 'personal':
        return 'bg-warning-100 border-warning-500 text-warning-700';
      case 'unpaid-leave':
        return 'bg-gray-100 border-gray-500 text-gray-700';
      default:
        return 'bg-secondary-100 border-secondary-500 text-secondary-700';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-800';
      case 'rejected':
        return 'bg-error-100 text-error-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
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
  const filteredRequests = requests.filter(request => {
    const matchesEmployee = selectedEmployee === 'all' || request.employeeId === selectedEmployee;
    const matchesType = selectedLeaveType === 'all' || request.type === selectedLeaveType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    return matchesEmployee && matchesType && matchesStatus;
  });
  
  // Group employees with their leave requests
  const employeeLeaves = employees.map(employee => {
    const employeeRequests = filteredRequests.filter(request => request.employeeId === employee.id);
    return {
      employee,
      requests: employeeRequests,
    };
  });
  
  const exportCalendar = () => {
    // Implementation for exporting calendar data
    console.log('Exporting calendar...');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request and manage time off
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Employees</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="vacation">Vacation</option>
              <option value="sick-leave">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="unpaid-leave">Unpaid Leave</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setView('week')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                view === 'week'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-l-md"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-t border-b border-r",
                view === 'month'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-r-md"
              )}
            >
              Month
            </button>
          </div>
          
          <Button
            variant="outline"
            onClick={exportCalendar}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setShowNewRequestModal(true)}
            leftIcon={<Plus size={18} />}
          >
            New Request
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Team Calendar</CardTitle>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePreviousPeriod}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium">
                {format(startDate, 'MMMM d, yyyy')}
              </span>
              
              <button
                onClick={handleNextPeriod}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      className={cn(
                        "px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32",
                        format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-primary-50"
                      )}
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
                {employeeLeaves.map(({ employee, requests }) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={employee.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                              {employee.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.position}
                          </div>
                        </div>
                      </div>
                    </td>
                    {days.map((day, index) => {
                      const dayRequests = requests.filter(request =>
                        isWithinInterval(day, {
                          start: parseISO(request.startDate),
                          end: parseISO(request.endDate),
                        })
                      );
                      
                      return (
                        <td key={index} className="px-3 py-4">
                          {dayRequests.map(request => (
                            <div
                              key={request.id}
                              className={cn(
                                "p-2 rounded-md border text-sm mb-1 relative group cursor-pointer",
                                getLeaveTypeColor(request.type)
                              )}
                            >
                              <div className="font-medium">
                                {request.type.split('-').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </div>
                              <div className="mt-1">
                                <span className={cn(
                                  "px-1.5 py-0.5 text-xs rounded-full",
                                  getStatusColor(request.status)
                                )}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </div>
                              
                              {/* Tooltip */}
                              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm rounded-md p-2 z-10 w-48 -mt-2 left-full ml-2">
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-gray-300 text-xs mt-1">
                                  {format(parseISO(request.startDate), 'MMM d')} - {format(parseISO(request.endDate), 'MMM d, yyyy')}
                                </p>
                                {request.comment && (
                                  <p className="text-gray-300 text-xs mt-1">
                                    {request.comment}
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
        </CardContent>
      </Card>
      
      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                New Leave Request
              </h2>
              <button
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewRequest({
                    type: 'vacation',
                    startDate: '',
                    endDate: '',
                    comment: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Leave Type
                </label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as LeaveRequest['type'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick-leave">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="unpaid-leave">Unpaid Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Comment (Optional)
                </label>
                <textarea
                  value={newRequest.comment}
                  onChange={(e) => setNewRequest({ ...newRequest, comment: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Add any additional information..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewRequestModal(false);
                    setNewRequest({
                      type: 'vacation',
                      startDate: '',
                      endDate: '',
                      comment: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Calendar size={18} />}
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePage;