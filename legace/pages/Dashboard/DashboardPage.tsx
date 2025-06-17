import React, { useEffect } from 'react';
import { Users, Clock, Briefcase, Calendar, AlertTriangle, CheckCircle, XCircle, Palmtree } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import ProjectOverview from '../../components/dashboard/ProjectOverview';
import CapacityOverview from '../../components/dashboard/CapacityOverview';
import ResourceAllocation from '../../components/dashboard/ResourceAllocation';
import { useEmployeeStore } from '../../store/employeeStore';
import { useProjectStore } from '../../store/projectStore';
import { useTimesheetStore } from '../../store/timesheetStore';
import { useLeaveStore } from '../../store/leaveStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { projects, assignments, fetchProjects, fetchAssignments } = useProjectStore();
  const { entries, fetchEntries } = useTimesheetStore();
  const { requests, fetchRequests } = useLeaveStore();
  
  useEffect(() => {
    fetchEmployees();
    fetchProjects();
    fetchAssignments();
    fetchEntries();
    fetchRequests();
  }, [fetchEmployees, fetchProjects, fetchAssignments, fetchEntries, fetchRequests]);
  
  // Calculate active employees (excluding those on leave today)
  const today = format(new Date(), 'yyyy-MM-dd');
  const employeesOnLeave = requests.filter(request => 
    request.status === 'approved' &&
    request.startDate <= today &&
    request.endDate >= today
  );
  const activeEmployees = employees.length - employeesOnLeave.length;
  
  // Calculate total hours logged
  const totalHoursLogged = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const previousPeriodHours = 450; // Mock data
  const hoursChange = totalHoursLogged - previousPeriodHours;
  
  // Calculate resource utilization
  const totalCapacity = employees.reduce((sum, employee) => sum + employee.capacityHours, 0);
  const totalAllocated = assignments.reduce((sum, assignment) => sum + assignment.hoursPerDay, 0);
  const utilizationRate = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
  
  // Calculate overallocated resources
  const overallocatedEmployees = employees.filter(employee => {
    const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
    const allocatedHours = employeeAssignments.reduce((sum, a) => sum + a.hoursPerDay, 0);
    return allocatedHours > employee.capacityHours;
  });
  
  // Project metrics
  const activeProjects = projects.filter(p => p.status === 'in-progress');
  const projectsOverBudget = activeProjects.filter(p => p.actual.cost > p.budget.cost);
  const projectsBehindSchedule = activeProjects.filter(p => {
    const progress = (p.actual.hours / p.budget.hours) * 100;
    const timeProgress = 70; // Mock time progress percentage
    return progress < timeProgress - 10; // 10% threshold
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your resources, projects, and capacity.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Members" 
          value={`${activeEmployees}/${employees.length}`}
          icon={<Users size={24} className="text-primary-600" />}
          alert={employeesOnLeave.length > 0 ? {
            type: 'warning',
            message: `${employeesOnLeave.length} on leave today`
          } : undefined}
          onClick={() => navigate('/employees')}
        />
        
        <StatCard 
          title="Active Projects" 
          value={activeProjects.length}
          icon={<Briefcase size={24} className="text-primary-600" />}
          alert={
            projectsOverBudget.length > 0 || projectsBehindSchedule.length > 0
              ? {
                  type: 'error',
                  message: `${projectsOverBudget.length} over budget, ${projectsBehindSchedule.length} behind`
                }
              : undefined
          }
          onClick={() => navigate('/projects')}
        />
        
        <StatCard 
          title="Resource Utilization" 
          value={`${utilizationRate}%`}
          icon={<Calendar size={24} className="text-primary-600" />}
          alert={
            overallocatedEmployees.length > 0
              ? {
                  type: 'warning',
                  message: `${overallocatedEmployees.length} overallocated`
                }
              : utilizationRate > 90
              ? {
                  type: 'success',
                  message: 'Optimal utilization'
                }
              : undefined
          }
          onClick={() => navigate('/capacity')}
        />
        
        <StatCard 
          title="Hours Logged" 
          value={totalHoursLogged.toFixed(1)}
          icon={<Clock size={24} className="text-primary-600" />}
          change={{ 
            value: Math.abs(hoursChange).toFixed(1),
            positive: hoursChange > 0
          }}
          onClick={() => navigate('/timesheets')}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectOverview />
        <CapacityOverview />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <ResourceAllocation />
      </div>
    </div>
  );
};

export default DashboardPage;