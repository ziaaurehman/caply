"use client"

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { CapacityOverview, ResourceAllocation } from '@/utils/api/capacity';

interface WeeklyCapacityTableProps {
  capacityOverview: CapacityOverview[];
  allocations: ResourceAllocation[];
  projects?: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
}

export default function WeeklyCapacityTable({ capacityOverview, allocations, projects = [] }: WeeklyCapacityTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Generate weeks data (showing 5 weeks starting from current week)
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];
    const today = new Date();
    
    // Get the start of the current week (Monday)
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 0
    currentWeekStart.setDate(today.getDate() - daysToSubtract);

    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() + (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekNumber = `W${String(i + 1).padStart(2, '0')}`;
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const startDateStr = `${String(weekStart.getDate()).padStart(2, '0')} ${monthNames[weekStart.getMonth()]}`;

      weeks.push({
        weekNumber,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        label: startDateStr
      });
    }

    return weeks;
  }, []);

  const toggleMemberExpansion = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const getUtilizationColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return 'bg-red-500'; // Overallocated
    if (percentage >= 80) return 'bg-yellow-500'; // Near capacity
    if (percentage >= 60) return 'bg-green-500'; // Optimal
    return 'bg-yellow-500'; // Underutilized
  };

  const getUtilizationTextColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return 'text-red-700'; // Overallocated
    if (percentage >= 80) return 'text-yellow-700'; // Near capacity
    if (percentage >= 60) return 'text-green-700'; // Optimal
    return 'text-yellow-700'; // Underutilized
  };

  const getStatusLabel = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return '(25% over)';
    return '';
  };

  // Group members by user
  const groupedMembers = useMemo(() => {
    const groups = new Map<string, {
      user: any;
      role: string;
      capacity: number;
      allocations: ResourceAllocation[];
      totalAllocated: number;
    }>();

    capacityOverview.forEach(overview => {
      const userId = overview?.member?.user?.id;
      if (!groups.has(userId)) {
        groups.set(userId, {
          user: overview?.member?.user,
          role: overview?.member?.role,
          capacity: overview?.capacity,
          allocations: [],
          totalAllocated: overview.totalAllocatedHours
        });
      }
    });

    // Add allocations to each member
    allocations.forEach(allocation => {
      // Find the member this allocation belongs to
      capacityOverview.forEach(overview => {
        if (overview?.allocations?.some(a => a.id === allocation.id)) {
          const userId = overview?.member?.user?.id;
          const group = groups.get(userId);
          if (group) {
            group?.allocations?.push(allocation);
          }
        }
      });
    });

    return Array.from(groups.values());
  }, [capacityOverview, allocations]);

  const getAllocationForWeek = (memberAllocations: ResourceAllocation[], weekData: WeekData) => {
    // For now, return a simplified allocation for each week
    // In a real implementation, you'd check date ranges
    const totalAllocated = memberAllocations.reduce((sum, alloc) => sum + alloc.allocated_hours_per_week, 0);
    return totalAllocated;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              RESOURCE
            </th>
            <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              WEEKLY CAPACITY
            </th>
            {weeksData.map((week) => (
              <th key={week.weekNumber} className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>{week.weekNumber}</div>
                <div className="text-xs text-gray-400">{week.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {groupedMembers.map((member) => {
            const isExpanded = expandedMembers.has(member?.user?.id);
            const overallUtilization = `${member?.totalAllocated}h / ${member?.capacity}h`;
            const statusLabel = getStatusLabel(member?.totalAllocated, member?.capacity);
              
            return (
              <React.Fragment key={member?.user?.id}>
                {/* Member Header Row */}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMemberExpansion(member?.user?.id)}
                        className="mr-2 p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-gray-900">{member?.user?.full_name}</div>
                        <div className="text-sm text-gray-500">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <span className={`font-medium ${getUtilizationTextColor(member.totalAllocated, member.capacity)}`}>
                        {overallUtilization}
                      </span>
                      {statusLabel && (
                        <span className="ml-2 text-xs text-red-600">
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  </td>
                  {weeksData.map((week) => {
                    const weekAllocation = getAllocationForWeek(member.allocations, week);
                    return (
                      <td key={week.weekNumber} className="px-4 py-4 text-center relative group">
                        <div 
                          className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(weekAllocation, member.capacity)}`}
                        >
                          {weekAllocation}h
                        </div>
                        {/* Tooltip */}
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="font-medium">Week {week.weekNumber}</div>
                          <div>Allocated: {weekAllocation}h</div>
                          <div>Capacity: {member.capacity}h</div>
                          <div>Available: {member.capacity - weekAllocation}h</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Project Allocation Rows (when expanded) */}
                {isExpanded && member.allocations.map((allocation) => (
                  <tr key={allocation.id} className="bg-white">
                    <td className="px-6 py-3 pl-16">
                      <div className="flex items-center">
                        <X className="h-4 w-4 text-red-500 mr-2" />
                        <div className="text-sm text-gray-700">
                          {projects.find(p => p.id === allocation.project_id)?.name || 'Project Allocation'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {allocation.allocated_hours_per_week}h / week
                      </div>
                    </td>
                    {weeksData.map((week) => (
                      <td key={week.weekNumber} className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-600">
                          {allocation.allocated_hours_per_week}h
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Add Resource Row (when expanded) */}
                {isExpanded && (
                  <tr className="bg-white">
                    <td className="px-6 py-3 pl-16">
                      <button className="flex items-center text-orange-600 hover:text-orange-700 text-sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Resource
                      </button>
                    </td>
                    <td className="px-4 py-3"></td>
                    {weeksData.map((week) => (
                      <td key={week.weekNumber} className="px-4 py-3"></td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
