import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useEmployeeStore } from '../../store/employeeStore';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../lib/utils';

const CapacityOverview: React.FC = () => {
  const { employees } = useEmployeeStore();
  const { assignments } = useProjectStore();
  
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
  
  const getUtilizationBg = (utilization: number) => {
    if (utilization > 100) return 'bg-error-50';
    if (utilization > 90) return 'bg-warning-50';
    if (utilization > 70) return 'bg-success-50';
    return 'bg-primary-50';
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Team Capacity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {capacityData.map(member => (
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
                  <div className={cn(
                    "text-sm font-medium",
                    getUtilizationTextColor(member.utilization)
                  )}>
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
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getUtilizationColor(member.utilization)
                    )}
                    style={{ width: `${Math.min(100, member.utilization)}%` }}
                  />
                </div>
                
                {/* Target line at 100% */}
                <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '100%' }} />
                
                {/* Utilization markers */}
                <div className="absolute top-4 left-0 right-0 flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
              
              {/* Status badge */}
              <div className="absolute right-0 -top-8">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  getUtilizationBg(member.utilization),
                  getUtilizationTextColor(member.utilization)
                )}>
                  {getUtilizationStatus(member.utilization)}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-error-500 mr-1" />
                <span>Overallocated (&gt;100%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-warning-500 mr-1" />
                <span>High (90-100%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-success-500 mr-1" />
                <span>Optimal (70-90%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-primary-500 mr-1" />
                <span>Available (&lt;70%)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CapacityOverview;