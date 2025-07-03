"use client"

import React, { useEffect } from "react"
import { Users, Clock, Briefcase, Calendar, AlertTriangle, CheckCircle, XCircle, Palmtree } from "lucide-react"
import StatCard from "./StatCard"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useEmployeeStore } from "@/lib/stores/employeeStore"
import { useProjectStore } from "@/lib/stores/projectStore"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Button from "@/components/ui/Button"
import ResourceAllocation from "./ResourceAllocation"
import ProjectOverview from "./ProjectOverview"
import CapacityOverview from "./CapacityOverview"
import { ManagerOrAbove, WithPermission } from "@/components/ui/rbac/ProtectedComponent"
import { useSession } from "next-auth/react"
import WelcomeMessage from "@/components/ui/WelcomeMessage"

export default function DashboardPage() {
  const router = useRouter();
  const { employees, fetchEmployees } = useEmployeeStore()
  const { projects, assignments, fetchProjects, fetchAssignments } = useProjectStore()
  const { data: session } = useSession()

  useEffect(() => {
    fetchEmployees()
    fetchProjects()
    fetchAssignments()
  }, [fetchEmployees, fetchProjects, fetchAssignments])

  // Calculate active employees (excluding those on leave today)
  const today = format(new Date(), 'yyyy-MM-dd');
  const employeesOnLeave = 2; // Mock data
  const activeEmployees = employees.length - employeesOnLeave;
  
  // Calculate total hours logged
  const totalHoursLogged = 1250; // Mock data
  const previousPeriodHours = 1100; // Mock data
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
  const activeProjects = projects.filter(p => p.status === 'active');
  const projectsOverBudget = 2; // Mock data
  const projectsBehindSchedule = 1; // Mock data

  // Helper functions for project overview
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🔵';
      case 'planned':
        return '🟡';
      case 'completed':
        return '🟢';
      case 'on_hold':
        return '⚪';
      default:
        return '⚫';
    }
  };

  // Helper functions for capacity overview
  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'bg-error-500';
    if (utilization > 90) return 'bg-warning-500';
    if (utilization > 70) return 'bg-success-500';
    return 'bg-primary-500';
  };
  
  const getUtilizationTextColor = (utilization: number) => {
    if (utilization > 100) return 'text-error-700';
    if (utilization > 90) return 'text-warning-700';
    if (utilization > 70) return 'text-success-700';
    return 'text-primary-700';
  };
  
  const getUtilizationStatus = (utilization: number) => {
    if (utilization > 100) return 'Overallocated';
    if (utilization > 90) return 'High';
    if (utilization > 70) return 'Optimal';
    return 'Available';
  };

  // Calculate capacity data for each employee
  const capacityData = employees.map(employee => {
    const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
    const allocatedHours = employeeAssignments.reduce((sum, a) => sum + a.hoursPerDay, 0);
    const utilizationRate = Math.round((allocatedHours / employee.capacityHours) * 100);
    
    return {
      id: employee.id,
      name: employee.name,
      avatar: employee.avatar,
      position: employee.position,
      capacity: employee.capacityHours,
      allocated: allocatedHours,
      utilization: utilizationRate,
      department: employee.department,
    };
  });

  // Sort projects
  const sortedProjects = [...projects]
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <WelcomeMessage />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        
        {/* Role-based action buttons */}
        <div className="flex space-x-3">
          <WithPermission resource="projects" action="create">
            <Link href="/projects/new">
              <Button variant="default">
                New Project
              </Button>
            </Link>
          </WithPermission>
          
          <ManagerOrAbove>
            <Link href="/reports">
              <Button variant="outline">
                View Reports
              </Button>
            </Link>
          </ManagerOrAbove>
        </div>
      </div>



      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Projects"
          value={activeProjects.length}
          icon={<Briefcase size={24} className="text-primary-600" />}
          alert={
            (projectsOverBudget > 0 || projectsBehindSchedule > 0)
              ? {
                  type: 'error',
                  message: `${projectsOverBudget} over budget, ${projectsBehindSchedule} behind`
                }
              : undefined
          }
          onClick={() => router.push('/projects')}
        />
        
        <StatCard
          title="Team Members"
          value={`${activeEmployees}/${employees.length}`}
          icon={<Users size={24} className="text-primary-600" />}
          alert={employeesOnLeave > 0 ? {
            type: 'warning',
            message: `${employeesOnLeave} on leave today`
          } : undefined}
          onClick={() => router.push('/employees')}
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
          onClick={() => router.push('/capacity')}
        />
        
        <StatCard
          title="Hours Logged"
          value={totalHoursLogged.toFixed(1)}
          icon={<Clock size={24} className="text-primary-600" />}
          change={{ 
            value: Math.abs(hoursChange).toFixed(1),
            positive: hoursChange > 0
          }}
          onClick={() => router.push('/timesheets')}
        />
      </div>
      
      {/* Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceAllocation />
        <ProjectOverview />
      </div>

      <CapacityOverview />
    </div>
  )
}
