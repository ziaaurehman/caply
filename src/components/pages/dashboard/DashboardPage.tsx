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

export default function DashboardPage() {
  const router = useRouter();
  const { employees, fetchEmployees } = useEmployeeStore()
  const { projects, assignments, fetchProjects, fetchAssignments } = useProjectStore()

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
  const activeProjects = projects.filter(p => p.status === 'in-progress');
  const projectsOverBudget = 2; // Mock data
  const projectsBehindSchedule = 1; // Mock data

  // Helper functions for project overview
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress':
        return '🔵';
      case 'planned':
        return '🟡';
      case 'completed':
        return '🟢';
      case 'on-hold':
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
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your resources, projects, and capacity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Overview */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Active Projects</CardTitle>
            <Link href="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center">
              View all
              <ArrowRight size={16} className="ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 border-b">
                    <th className="text-left py-2">Project</th>
                    <th className="text-center py-2">Progress</th>
                    <th className="text-right py-2">Budget</th>
                    <th className="text-right py-2">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedProjects.slice(0, 5).map(project => (
                    <tr key={project.id} className="group hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-start">
                          <span className="mr-2 text-lg">
                            {getStatusIcon(project.status)}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.description}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 text-center">
                        <div className="text-sm">
                          <span className="font-medium">75%</span>
                        </div>
                      </td>
                      
                      <td className="py-3 text-right">
                        <div className="font-medium">
                          $10,000
                        </div>
                      </td>
                      
                      <td className="py-3 text-right">
                        <div className="font-medium">
                          30 days left
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Capacity Overview */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Team Capacity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {capacityData.slice(0, 5).map(member => (
                <div key={member.id} className="relative">
                  <div className="flex items-center mb-2">
                    <div className="flex items-center flex-1">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.position}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getUtilizationTextColor(member.utilization)}`}>
                        {member.utilization}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.allocated}h / {member.capacity}h
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(member.utilization)}`}
                        style={{ width: `${Math.min(100, member.utilization)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Resource Summary */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {projects.filter(p => p.status === 'in-progress').length}
                </div>
                <div className="text-sm text-gray-500">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {employees.length}
                </div>
                <div className="text-sm text-gray-500">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {utilizationRate}%
                </div>
                <div className="text-sm text-gray-500">Avg. Utilization</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
