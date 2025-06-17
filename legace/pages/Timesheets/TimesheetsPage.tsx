import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, AlertCircle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useProjectStore } from '../../store/projectStore';
import { useTimesheetStore } from '../../store/timesheetStore';
import { useAuthStore } from '../../store/authStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { cn } from '../../lib/utils';

interface TimesheetEntry {
  projectId: string;
  taskId: string;
  description: string;
  hours: number[];
  total: number;
}

interface TimesheetGroup {
  projectId: string;
  entries: TimesheetEntry[];
  isExpanded?: boolean;
}

const TimesheetsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects } = useProjectStore();
  const { employees } = useEmployeeStore();
  const { entries, fetchEntries, approveTimesheets, rejectTimesheets } = useTimesheetStore();
  
  const [view, setView] = useState<'my-timesheet' | 'approve-timesheets'>('my-timesheet');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timesheetGroups, setTimesheetGroups] = useState<TimesheetGroup[]>([]);
  const [expandedTimesheets, setExpandedTimesheets] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);
  
  // Calculate week dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Monday to Friday
  
  // Calculate daily totals across all projects and tasks
  const dailyTotals = Array(5).fill(0).map((_, dayIndex) => 
    timesheetGroups.reduce((sum, group) => 
      sum + group.entries.reduce((taskSum, entry) => 
        taskSum + (entry.hours[dayIndex] || 0), 0
      ), 0
    )
  );
  
  const weeklyTotal = dailyTotals.reduce((sum, hours) => sum + hours, 0);
  
  const handlePreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };
  
  const handleNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };
  
  const handleHourChange = (groupIndex: number, entryIndex: number, dayIndex: number, value: string) => {
    if (isSubmitted) return;
    
    const hours = Math.min(24, Math.max(0, Number(value) || 0));
    
    setTimesheetGroups(prev => {
      const newGroups = [...prev];
      const group = { ...newGroups[groupIndex] };
      const entry = { ...group.entries[entryIndex] };
      entry.hours = [...entry.hours];
      entry.hours[dayIndex] = hours;
      entry.total = entry.hours.reduce((sum, h) => sum + h, 0);
      group.entries[entryIndex] = entry;
      newGroups[groupIndex] = group;
      return newGroups;
    });
  };
  
  const handleAddProject = () => {
    if (isSubmitted) return;
    
    setTimesheetGroups(prev => [
      ...prev,
      {
        projectId: '',
        entries: [{
          projectId: '',
          taskId: '',
          description: '',
          hours: Array(5).fill(0),
          total: 0,
        }],
        isExpanded: true,
      },
    ]);
  };
  
  const handleAddTask = (groupIndex: number) => {
    if (isSubmitted) return;
    
    setTimesheetGroups(prev => {
      const newGroups = [...prev];
      const group = { ...newGroups[groupIndex] };
      group.entries = [
        ...group.entries,
        {
          projectId: group.projectId,
          taskId: '',
          description: '',
          hours: Array(5).fill(0),
          total: 0,
        },
      ];
      newGroups[groupIndex] = group;
      return newGroups;
    });
  };
  
  const handleRemoveProject = (groupIndex: number) => {
    if (isSubmitted) return;
    
    setTimesheetGroups(prev => prev.filter((_, i) => i !== groupIndex));
  };
  
  const handleRemoveTask = (groupIndex: number, entryIndex: number) => {
    if (isSubmitted) return;
    
    setTimesheetGroups(prev => {
      const newGroups = [...prev];
      const group = { ...newGroups[groupIndex] };
      group.entries = group.entries.filter((_, i) => i !== entryIndex);
      
      // Remove the entire group if no tasks remain
      if (group.entries.length === 0) {
        return prev.filter((_, i) => i !== groupIndex);
      }
      
      newGroups[groupIndex] = group;
      return newGroups;
    });
  };
  
  const handleSubmit = () => {
    if (weeklyTotal > 40) {
      if (!confirm('Weekly total exceeds 40 hours. Submit anyway?')) {
        return;
      }
    }
    setIsSubmitted(true);
  };
  
  const handleApprove = async (timesheetId: string) => {
    try {
      await approveTimesheets([timesheetId]);
      fetchEntries();
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
    }
  };
  
  const handleReject = async () => {
    if (!selectedTimesheetId || !rejectReason) return;
    
    try {
      await rejectTimesheets([selectedTimesheetId], rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTimesheetId(null);
      fetchEntries();
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
    }
  };
  
  const toggleTimesheet = (timesheetId: string) => {
    setExpandedTimesheets(prev =>
      prev.includes(timesheetId)
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };
  
  const toggleProjectGroup = (groupIndex: number) => {
    setTimesheetGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        isExpanded: !newGroups[groupIndex].isExpanded,
      };
      return newGroups;
    });
  };
  
  const isOverCapacity = weeklyTotal > 40;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-800';
      case 'rejected':
        return 'bg-error-100 text-error-800';
      case 'submitted':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record and manage time entries
          </p>
        </div>
        
        {isManagerOrAdmin && (
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setView('my-timesheet')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                view === 'my-timesheet'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-l-md"
              )}
            >
              My Timesheet
            </button>
            <button
              type="button"
              onClick={() => setView('approve-timesheets')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-t border-b border-r",
                view === 'approve-timesheets'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-r-md"
              )}
            >
              Approve Timesheets
            </button>
          </div>
        )}
      </div>
      
      {view === 'my-timesheet' ? (
        <>
          <div className="flex justify-end items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm border border-gray-300 p-2">
              <button
                onClick={handlePreviousWeek}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={isSubmitted}
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </span>
              
              <button
                onClick={handleNextWeek}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={isSubmitted}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            {!isSubmitted && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                leftIcon={<Check size={18} />}
              >
                Submit Timesheet
              </Button>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Time Entries</CardTitle>
                {isOverCapacity && (
                  <div className="flex items-center text-warning-600">
                    <AlertCircle size={16} className="mr-1" />
                    <span className="text-sm">
                      Weekly total exceeds capacity (40 hours)
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                        Project / Task
                      </th>
                      {weekDates.map((date, index) => (
                        <th
                          key={index}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                        >
                          <div>{format(date, 'EEE')}</div>
                          <div className="text-gray-400 font-normal">
                            {format(date, 'MMM d')}
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timesheetGroups.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <button
                                onClick={() => toggleProjectGroup(groupIndex)}
                                className="mr-2 text-gray-400 hover:text-gray-600"
                              >
                                {group.isExpanded ? (
                                  <ChevronDown size={20} />
                                ) : (
                                  <ChevronRight size={20} />
                                )}
                              </button>
                              <select
                                value={group.projectId}
                                onChange={(e) => {
                                  if (!isSubmitted) {
                                    setTimesheetGroups(prev => {
                                      const newGroups = [...prev];
                                      newGroups[groupIndex] = {
                                        ...group,
                                        projectId: e.target.value,
                                        entries: group.entries.map(entry => ({
                                          ...entry,
                                          projectId: e.target.value,
                                        })),
                                      };
                                      return newGroups;
                                    });
                                  }
                                }}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                disabled={isSubmitted}
                              >
                                <option value="">Select project...</option>
                                {projects.map(project => (
                                  <option key={project.id} value={project.id}>
                                    {project.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          {Array(5).fill(0).map((_, index) => (
                            <td key={index} className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                              {group.entries.reduce((sum, entry) => sum + (entry.hours[index] || 0), 0)}h
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-center font-medium">
                            {group.entries.reduce((sum, entry) => sum + entry.total, 0)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {!isSubmitted && (
                              <button
                                onClick={() => handleRemoveProject(groupIndex)}
                                className="text-error-600 hover:text-error-900"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                        
                        {group.isExpanded && group.entries.map((entry, entryIndex) => (
                          <tr key={`${groupIndex}-${entryIndex}`} className="bg-white">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="ml-8">
                                <input
                                  type="text"
                                  value={entry.description}
                                  onChange={(e) => {
                                    if (!isSubmitted) {
                                      setTimesheetGroups(prev => {
                                        const newGroups = [...prev];
                                        newGroups[groupIndex].entries[entryIndex] = {
                                          ...entry,
                                          description: e.target.value,
                                        };
                                        return newGroups;
                                      });
                                    }
                                  }}
                                  placeholder="Task description..."
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                  disabled={isSubmitted}
                                />
                              </div>
                            </td>
                            {entry.hours.map((hours, dayIndex) => (
                              <td key={dayIndex} className="px-3 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  value={hours || ''}
                                  onChange={(e) => handleHourChange(groupIndex, entryIndex, dayIndex, e.target.value)}
                                  className={cn(
                                    "block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-center",
                                    isSubmitted && "bg-gray-50"
                                  )}
                                  disabled={isSubmitted}
                                />
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-center font-medium">
                              {entry.total}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {!isSubmitted && (
                                <button
                                  onClick={() => handleRemoveTask(groupIndex, entryIndex)}
                                  className="text-error-600 hover:text-error-900"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        
                        {group.isExpanded && !isSubmitted && (
                          <tr>
                            <td colSpan={8} className="px-6 py-2">
                              <button
                                onClick={() => handleAddTask(groupIndex)}
                                className="ml-8 text-sm text-primary-600 hover:text-primary-800 flex items-center"
                              >
                                <Plus size={16} className="mr-1" />
                                Add Task
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    
                    <tr className="bg-gray-50 font-medium">
                      <td className="px-6 py-4 whitespace-nowrap">
                        Daily Total
                      </td>
                      {dailyTotals.map((total, index) => (
                        <td key={index} className="px-3 py-4 whitespace-nowrap text-center">
                          {total}h
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {weeklyTotal}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" />
                    </tr>
                  </tbody>
                </table>
                
                {!isSubmitted && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={handleAddProject}
                      leftIcon={<Plus size={18} />}
                    >
                      Add Project
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries
                    .filter(entry => entry.status === 'submitted')
                    .map(entry => {
                      const employee = employees.find(e => e.id === entry.employeeId);
                      const isExpanded = expandedTimesheets.includes(entry.id);
                      
                      return (
                        <React.Fragment key={entry.id}>
                          <tr className={cn(isExpanded && "bg-gray-50")}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleTimesheet(entry.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={20} />
                                ) : (
                                  <ChevronRight size={20} />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {employee?.avatar ? (
                                  <img
                                    src={employee.avatar}
                                    alt={employee.name}
                                    className="h-8 w-8 rounded-full"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-primary-700 font-medium">
                                      {employee?.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee?.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {employee?.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(entry.date), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              {entry.hours}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                getStatusColor(entry.status)
                              )}>
                                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(entry.id)}
                                className="text-success-600 hover:text-success-900 mr-2"
                              >
                                <Check size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTimesheetId(entry.id);
                                  setShowRejectModal(true);
                                }}
                                className="text-error-600 hover:text-error-900"
                              >
                                <X size={16} />
                              </Button>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4">
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Project
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Task
                                        </th>
                                        {weekDates.map((date, index) => (
                                          <th
                                            key={index}
                                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                          >
                                            {format(date, 'EEE')}
                                          </th>
                                        ))}
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {entry.taskId && (
                                        <tr>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {projects.find(p => p.id === entry.projectId)?.name}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {entry.description}
                                          </td>
                                          {Array(5).fill(0).map((_, index) => (
                                            <td key={index} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                                              {entry.hours}h
                                            </td>
                                          ))}
                                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {entry.hours * 5}h
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Reject Timesheet
              </h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedTimesheetId(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700">
                Reason for rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                rows={4}
                placeholder="Please provide a reason for rejecting this timesheet..."
              />
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedTimesheetId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                >
                  Reject Timesheet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetsPage;