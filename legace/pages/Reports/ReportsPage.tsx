import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useProjectStore } from '../../store/projectStore';
import { useTimesheetStore } from '../../store/timesheetStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { cn, formatCurrency } from '../../lib/utils';

type ViewType = 'timesheets' | 'resources' | 'projects';
type PeriodType = 'weekly' | 'monthly';

const ReportsPage: React.FC = () => {
  const [view, setView] = useState<ViewType>('timesheets');
  const [period, setPeriod] = useState<PeriodType>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { projects, assignments } = useProjectStore();
  const { employees } = useEmployeeStore();
  const { entries } = useTimesheetStore();
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekNumber = getWeek(selectedDate, { weekStartsOn: 1 });
  
  const handlePreviousPeriod = () => {
    if (period === 'weekly') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setSelectedDate(newDate);
    }
  };
  
  const handleNextPeriod = () => {
    if (period === 'weekly') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setSelectedDate(newDate);
    }
  };
  
  const formatPeriod = () => {
    if (period === 'weekly') {
      // Using the more compact format: W21 - 19/05
      const weekNum = getWeek(selectedDate, { weekStartsOn: 1 });
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return `W${weekNum} - ${format(weekStart, 'dd/MM')}`;
    }
    return format(selectedDate, 'MMMM yyyy');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-800';
      case 'submitted':
        return 'bg-warning-100 text-warning-800';
      case 'missing':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const TimesheetsReport = () => {
    if (period === 'weekly') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Timesheet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approver
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map(employee => {
                    const employeeEntries = entries.filter(e => e.employeeId === employee.id);
                    const totalHours = employeeEntries.reduce((sum, e) => sum + e.hours, 0);
                    const status = employeeEntries.length > 0 ? employeeEntries[0].status : 'missing';
                    
                    return (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          W{weekNumber} – {format(weekStart, 'yyyy-MM-dd')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {status === 'missing' ? '—' : `${totalHours}h`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            getStatusColor(status)
                          )}>
                            {status === 'missing' ? '🔴 Missing' :
                             status === 'submitted' ? '🟡 Submitted' :
                             '✅ Approved'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {status === 'missing' ? '—' : format(new Date(), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {status === 'approved' ? 'Admin User' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Timesheet Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submission Rate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weeks Submitted
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weeks Missing
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approval Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => {
                  const employeeEntries = entries.filter(e => e.employeeId === employee.id);
                  const totalHours = employeeEntries.reduce((sum, e) => sum + e.hours, 0);
                  const submittedWeeks = new Set(employeeEntries.map(e => format(new Date(e.date), 'yyyy-ww'))).size;
                  const totalWeeks = 4; // Assuming 4 weeks per month
                  const submissionRate = Math.round((submittedWeeks / totalWeeks) * 100);
                  const approvedEntries = employeeEntries.filter(e => e.status === 'approved');
                  const approvalRate = Math.round((approvedEntries.length / employeeEntries.length) * 100) || 0;
                  
                  return (
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
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {totalHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          submissionRate >= 90 ? 'bg-success-100 text-success-800' :
                          submissionRate >= 75 ? 'bg-warning-100 text-warning-800' :
                          'bg-error-100 text-error-800'
                        )}>
                          {submissionRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {submittedWeeks} / {totalWeeks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-error-600">
                        {totalWeeks - submittedWeeks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          approvalRate >= 90 ? 'bg-success-100 text-success-800' :
                          approvalRate >= 75 ? 'bg-warning-100 text-warning-800' :
                          'bg-error-100 text-error-800'
                        )}>
                          {approvalRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const ResourcesReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {period === 'weekly' ? 'Week' : 'Month'}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Planned Hours
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Hours
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overload
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Underutilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map(employee => {
                const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
                const employeeEntries = entries.filter(e => e.employeeId === employee.id);
                
                // Calculate total planned hours from assignments
                const plannedHours = employeeAssignments.reduce((sum, a) => sum + a.totalHours, 0);
                // Calculate actual hours from timesheet entries
                const actualHours = employeeEntries.reduce((sum, e) => sum + e.hours, 0);
                
                const variance = plannedHours - actualHours;
                const utilization = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0;
                
                return (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {period === 'weekly' ? 'W14' : 'April 2025'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {plannedHours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {actualHours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={variance >= 0 ? 'text-success-600' : 'text-error-600'}>
                        {variance >= 0 ? '–' : '+'}
                        {Math.abs(variance)}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          utilization > 100 ? 'bg-error-100 text-error-800' :
                          utilization >= 90 ? 'bg-warning-100 text-warning-800' :
                          'bg-success-100 text-success-800'
                        )}>
                          {utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            utilization > 100 ? 'bg-error-500' :
                            utilization >= 90 ? 'bg-warning-500' :
                            'bg-success-500'
                          )}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-error-600">
                      {variance < 0 ? `${Math.abs(variance)}h` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-warning-600">
                      {variance > 0 ? `${variance}h` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
  
  const ProjectsReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Project Progress Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budgeted Hours
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Hours
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resources
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Distribution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map(project => {
                const projectAssignments = assignments.filter(a => a.projectId === project.id);
                const projectEntries = entries.filter(e => e.projectId === project.id);
                
                const progress = Math.round((project.actual.hours / project.budget.hours) * 100);
                const variance = project.budget.hours - project.actual.hours;
                
                const resourceHours = projectAssignments.reduce((acc, assignment) => {
                  const employee = employees.find(e => e.id === assignment.employeeId);
                  if (employee) {
                    acc[employee.name] = (acc[employee.name] || 0) + assignment.totalHours;
                  }
                  return acc;
                }, {} as Record<string, number>);
                
                return (
                  <tr key={project.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {project.budget.hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {project.actual.hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={variance >= 0 ? 'text-success-600' : 'text-error-600'}>
                        {variance >= 0 ? '–' : '+'}
                        {Math.abs(variance)}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          progress > 100 ? 'bg-error-100 text-error-800' :
                          progress >= 90 ? 'bg-warning-100 text-warning-800' :
                          'bg-success-100 text-success-800'
                        )}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            progress > 100 ? 'bg-error-500' :
                            progress >= 90 ? 'bg-warning-500' :
                            'bg-success-500'
                          )}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {Object.entries(resourceHours).map(([name, hours]) => (
                          <div key={name}>
                            {name} ({hours}h)
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        Development (180h)
                        <br />
                        Testing (50h)
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track timesheets, resource utilization, and project progress
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setView('timesheets')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                view === 'timesheets'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-l-md"
              )}
            >
              Timesheets
            </button>
            <button
              type="button"
              onClick={() => setView('resources')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-t border-b",
                view === 'resources'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              Resources
            </button>
            <button
              type="button"
              onClick={() => setView('projects')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                view === 'projects'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-r-md"
              )}
            >
              Projects
            </button>
          </div>
          
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                period === 'weekly'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-l-md"
              )}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={cn(
                "px-4 py-2 text-sm font-medium border",
                period === 'monthly'
                  ? "bg-primary-50 text-primary-700 border-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                "rounded-r-md"
              )}
            >
              Monthly
            </button>
          </div>
          
          <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm border border-gray-300 p-2">
            <button
              onClick={handlePreviousPeriod}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-medium">
              {formatPeriod()}
            </span>
            
            <button
              onClick={handleNextPeriod}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {view === 'timesheets' && <TimesheetsReport />}
      {view === 'resources' && <ResourcesReport />}
      {view === 'projects' && <ProjectsReport />}
    </div>
  );
};

export default ReportsPage;