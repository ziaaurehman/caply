import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter, Download, ChevronLeft, Calendar, X, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useEmployeeStore } from '../../store/employeeStore';
import { useProjectStore } from '../../store/projectStore';
import ProjectAllocationModal from './ProjectAllocationModal';

type WeeklyAllocation = {
  [key: string]: {
    total: number;
    projects: {
      id: string;
      name: string;
      hours: number;
      assignmentId: string;
    }[];
  };
};

type EditingCell = {
  employeeId: string;
  projectId: string;
  weekNumber: string;
  value: string;
};

const CapacityPlanningPage: React.FC = () => {
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showOverallocatedOnly, setShowOverallocatedOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [addingProjectTo, setAddingProjectTo] = useState<string | null>(null);

  const { employees } = useEmployeeStore();
  const { projects, assignments, updateAssignment, deleteAssignment } = useProjectStore();

  const getWeeksInMonth = () => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const weeks = [];
    
    while (date.getMonth() === selectedMonth) {
      const weekNumber = Math.ceil((date.getDate() + date.getDay()) / 7);
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        weekNumber: `W${String(weekNumber).padStart(2, '0')}`,
        start: new Date(weekStart),
        end: new Date(weekEnd),
      });
      
      date.setDate(date.getDate() + 7);
    }
    
    return weeks;
  };
  
  const formatWeekDate = (date: Date) => {
    return date.getDate().toString().padStart(2, '0') + ' ' + 
           date.toLocaleString('default', { month: 'short' });
  };
  
  const weeks = getWeeksInMonth();
  
  const calculateWeeklyAllocations = (): WeeklyAllocation => {
    const allocations: WeeklyAllocation = {};
    
    employees.forEach(employee => {
      allocations[employee.id] = {
        total: 0,
        projects: [],
      };
      
      const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
      employeeAssignments.forEach(assignment => {
        const project = projects.find(p => p.id === assignment.projectId);
        if (project) {
          const weeklyHours = assignment.hoursPerDay * 5;
          allocations[employee.id].projects.push({
            id: project.id,
            name: project.name,
            hours: weeklyHours,
            assignmentId: assignment.id,
          });
          allocations[employee.id].total += weeklyHours;
        }
      });
    });
    
    return allocations;
  };

  const handleCellEdit = async (
    employeeId: string,
    projectId: string,
    weekNumber: string,
    newHours: number
  ) => {
    const assignment = assignments.find(a => 
      a.employeeId === employeeId && a.projectId === projectId
    );

    if (assignment) {
      const dailyHours = newHours / 5;
      await updateAssignment(assignment.id, { hoursPerDay: dailyHours });
    }

    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editingCell) return;

    if (e.key === 'Enter') {
      const hours = parseFloat(editingCell.value);
      if (!isNaN(hours) && hours >= 0) {
        handleCellEdit(
          editingCell.employeeId,
          editingCell.projectId,
          editingCell.weekNumber,
          hours
        );
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const getAllocationStatus = (allocated: number, capacity: number) => {
    const ratio = allocated / capacity;
    if (ratio > 1) return 'overallocated';
    if (ratio === 1) return 'optimal';
    if (ratio >= 0.8) return 'nearOptimal';
    return 'underutilized';
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-success-100 text-success-800';
      case 'nearOptimal':
        return 'bg-primary-100 text-primary-800';
      case 'underutilized':
        return 'bg-warning-100 text-warning-800';
      case 'overallocated':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getCapacityBarColor = (allocated: number, capacity: number) => {
    const ratio = allocated / capacity;
    if (ratio > 1) return 'bg-error-500';
    if (ratio === 1) return 'bg-success-500';
    if (ratio >= 0.8) return 'bg-primary-500';
    return 'bg-warning-500';
  };
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const filteredEmployees = employees.filter(employee => {
    if (showActiveOnly && employee.availability !== 'full-time') return false;
    if (showOverallocatedOnly) {
      const allocation = weeklyAllocations[employee.id];
      return allocation.total > employee.capacityHours;
    }
    return true;
  });
  
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };
  
  const weeklyAllocations = calculateWeeklyAllocations();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacity Planning</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage resource allocation across projects
          </p>
        </div>
        
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm border border-gray-300 p-2">
            <button
              onClick={handlePreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="text-sm border-0 focus:ring-0"
              >
                {months.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="text-sm border-0 focus:ring-0"
              >
                {Array.from({ length: 3 }, (_, i) => selectedYear - 1 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <Button
            variant="outline"
            leftIcon={<Filter size={18} />}
            onClick={() => setShowOverallocatedOnly(!showOverallocatedOnly)}
          >
            {showOverallocatedOnly ? 'Show All' : 'Show Overallocated'}
          </Button>
          
          <Button
            variant="outline"
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Resource Allocation Overview</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="activeOnly" className="text-sm text-gray-600">
                  Show active resources only
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Capacity
                  </th>
                  {weeks.map(week => (
                    <th key={week.weekNumber} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div>{week.weekNumber}</div>
                      <div className="text-gray-400 font-normal">
                        {formatWeekDate(week.start)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map(employee => {
                  const allocation = weeklyAllocations[employee.id];
                  const status = getAllocationStatus(allocation.total, employee.capacityHours);
                  
                  return (
                    <React.Fragment key={employee.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleEmployee(employee.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedEmployees.includes(employee.id) ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {employee.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employee.position}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getStatusColor(status)
                            }`}>
                              {allocation.total}h / {employee.capacityHours}h
                            </span>
                            {status === 'overallocated' && (
                              <span className="text-xs text-error-600">
                                ({Math.round((allocation.total / employee.capacityHours - 1) * 100)}% over)
                              </span>
                            )}
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`${getCapacityBarColor(allocation.total, employee.capacityHours)} h-2 rounded-full`}
                              style={{
                                width: `${Math.min(100, (allocation.total / employee.capacityHours) * 100)}%`
                              }}
                            />
                          </div>
                        </td>
                        {weeks.map(week => (
                          <td key={week.weekNumber} className="px-6 py-4 whitespace-nowrap">
                            <div className={`h-8 w-full rounded ${getCapacityBarColor(allocation.total, employee.capacityHours)} relative group`}>
                              <div className="text-xs text-white font-medium text-center leading-8">
                                {allocation.total}h
                              </div>
                              
                              <div className="absolute hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-48 -mt-2 left-1/2 transform -translate-x-1/2">
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  Week {week.weekNumber}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Allocated: {allocation.total}h
                                  <br />
                                  Capacity: {employee.capacityHours}h
                                  <br />
                                  {status === 'overallocated' ? (
                                    <span className="text-error-600">
                                      Overallocated by {allocation.total - employee.capacityHours}h
                                    </span>
                                  ) : (
                                    <span className="text-success-600">
                                      Available: {employee.capacityHours - allocation.total}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                      
                      {expandedEmployees.includes(employee.id) && (
                        <>
                          {allocation.projects.map(project => (
                            <tr key={`${employee.id}-${project.id}`} className="bg-gray-50">
                              <td className="px-6 py-2 whitespace-nowrap">
                                <div className="ml-8 flex items-center justify-between">
                                  <span className="text-sm text-gray-500">{project.name}</span>
                                  <button
                                    onClick={() => {
                                      if (confirm('Remove this project assignment?')) {
                                        deleteAssignment(project.assignmentId);
                                      }
                                    }}
                                    className="text-error-500 hover:text-error-700"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-500">
                                  {project.hours}h / week
                                </span>
                              </td>
                              {weeks.map(week => (
                                <td key={week.weekNumber} className="px-6 py-2 whitespace-nowrap">
                                  {editingCell?.employeeId === employee.id &&
                                   editingCell?.projectId === project.id &&
                                   editingCell?.weekNumber === week.weekNumber ? (
                                    <input
                                      type="number"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({
                                        ...editingCell,
                                        value: e.target.value,
                                      })}
                                      onKeyDown={handleCellKeyDown}
                                      onBlur={() => {
                                        const hours = parseFloat(editingCell.value);
                                        if (!isNaN(hours) && hours >= 0) {
                                          handleCellEdit(
                                            employee.id,
                                            project.id,
                                            week.weekNumber,
                                            hours
                                          );
                                        }
                                      }}
                                      className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setEditingCell({
                                        employeeId: employee.id,
                                        projectId: project.id,
                                        weekNumber: week.weekNumber,
                                        value: project.hours.toString(),
                                      })}
                                      className="text-sm text-gray-500 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                    >
                                      {project.hours}h
                                    </div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td colSpan={2 + weeks.length} className="px-6 py-2">
                              <button
                                onClick={() => setAddingProjectTo(employee.id)}
                                className="ml-8 text-sm text-primary-600 hover:text-primary-800 flex items-center"
                              >
                                <Plus size={16} className="mr-1" />
                                Add Project
                              </button>
                            </td>
                          </tr>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {addingProjectTo && (
        <ProjectAllocationModal
          isOpen={true}
          onClose={() => setAddingProjectTo(null)}
          employeeId={addingProjectTo}
        />
      )}
    </div>
  );
};

export default CapacityPlanningPage;