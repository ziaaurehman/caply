"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useEmployeeStore } from '@/lib/stores/employeeStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import { cn } from '@/lib/utils';
// import dynamic from 'next/dynamic';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const ResourceAllocation: React.FC = () => {
  const { employees } = useEmployeeStore();
  const { projects } = useProjectStore();
  
  // Mock assignments data for now
  const mockAssignments = [
    { projectId: '1', employeeId: '1', totalHours: 120, hoursPerDay: 8 },
    { projectId: '1', employeeId: '2', totalHours: 80, hoursPerDay: 6 },
    { projectId: '2', employeeId: '3', totalHours: 200, hoursPerDay: 7 },
    { projectId: '2', employeeId: '1', totalHours: 60, hoursPerDay: 4 },
  ];
  
  // Calculate project allocation data
  const projectAllocation = projects.map((project: any) => {
    const projectAssignments = mockAssignments.filter((a: any) => a.projectId === project.id);
    const totalHours = projectAssignments.reduce((sum: number, a: any) => sum + a.totalHours, 0);
    
    return {
      name: project.name,
      value: totalHours,
      status: project.status,
    };
  });
  
  // Calculate skill distribution
  const skillDistribution = employees.reduce((acc: any[], employee: any) => {
    const employeeAssignments = mockAssignments.filter((a: any) => a.employeeId === employee.id);
    const hours = employeeAssignments.reduce((sum: number, a: any) => sum + a.totalHours, 0);
    
    const existingSkill = acc.find((s: any) => s.name === employee.position);
    if (existingSkill) {
      existingSkill.value += hours;
      existingSkill.count += 1;
    } else {
      acc.push({
        name: employee.position,
        value: hours,
        count: 1,
      });
    }
    
    return acc;
  }, []);
  
  // Calculate workload distribution
  const workloadDistribution = [
    {
      name: 'Overallocated',
      value: employees.filter((employee: any) => {
        const employeeAssignments = mockAssignments.filter((a: any) => a.employeeId === employee.id);
        const allocatedHours = employeeAssignments.reduce((sum: number, a: any) => sum + a.hoursPerDay, 0);
        return allocatedHours > employee.capacityHours;
      }).length,
      color: '#EF4444', // error-500
    },
    {
      name: 'Optimal',
      value: employees.filter((employee: any) => {
        const employeeAssignments = mockAssignments.filter((a: any) => a.employeeId === employee.id);
        const allocatedHours = employeeAssignments.reduce((sum: number, a: any) => sum + a.hoursPerDay, 0);
        return allocatedHours >= employee.capacityHours * 0.7 && allocatedHours <= employee.capacityHours;
      }).length,
      color: '#22C55E', // success-500
    },
    {
      name: 'Available',
      value: employees.filter((employee: any) => {
        const employeeAssignments = mockAssignments.filter((a: any) => a.employeeId === employee.id);
        const allocatedHours = employeeAssignments.reduce((sum: number, a: any) => sum + a.hoursPerDay, 0);
        return allocatedHours < employee.capacityHours * 0.7;
      }).length,
      color: '#3B82F6', // primary-500
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600 mt-1">
            {payload[0].value} {label === 'Workload' ? 'team members' : 'hours'}
          </p>
          {payload[0].payload.count && (
            <p className="text-sm text-gray-500">
              {payload[0].payload.count} team members
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Project Resource Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Allocation */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Project Allocation</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectAllocation.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          entry.status === 'active' ? '#3B82F6' :
                          entry.status === 'completed' ? '#22C55E' :
                          entry.status === 'on_hold' ? '#F59E0B' :
                          '#6B7280'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skill Distribution */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Skill Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={skillDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {skillDistribution.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          [
                            '#3B82F6', // primary-500
                            '#14B8A6', // secondary-500
                            '#F59E0B', // warning-500
                            '#EC4899', // pink-500
                            '#8B5CF6', // purple-500
                          ][index % 5]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workload Distribution */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Workload Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {workloadDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {projects.filter((p: any) => p.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">Active Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {skillDistribution.length}
            </div>
            <div className="text-sm text-gray-500">Unique Roles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {workloadDistribution.find(w => w.name === 'Optimal')?.value || 0}
            </div>
            <div className="text-sm text-gray-500">Optimally Allocated</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceAllocation;