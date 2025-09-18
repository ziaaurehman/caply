"use client"

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { CapacityOverview, ResourceAllocation, capacityAPI } from '@/utils/api/capacity';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { toast } from 'sonner';

interface WeeklyCapacityTableProps {
  capacityOverview: CapacityOverview[];
  allocations: ResourceAllocation[];
  projects?: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
  organizationId?: string;
  onWeekCellClick?: (args: { userId: string; week: WeekData; member: any; allocations: ResourceAllocation[] }) => void;
  onRefresh?: () => void;
  onProjectClick?: (projectId: string) => void;
  onAddResource?: () => void;
  viewMode?: 'overview' | 'weekly' | 'monthly';
  selectedMonth?: number;
  selectedYear?: number;
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
}

export default function WeeklyCapacityTable({ capacityOverview, allocations, projects = [], organizationId, onWeekCellClick, onRefresh, onProjectClick, onAddResource, viewMode = 'overview', selectedMonth = new Date().getMonth(), selectedYear = new Date().getFullYear() }: WeeklyCapacityTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberTasks, setMemberTasks] = useState<Record<string, Record<string, { tasks_count: number; estimated_hours: number }>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<string>('');
  const [addProjectMemberId, setAddProjectMemberId] = useState<string | null>(null);
  const [addProjectMemberName, setAddProjectMemberName] = useState<string>('');
  
  // Local state for optimistic updates
  const [localAllocations, setLocalAllocations] = useState<ResourceAllocation[]>([]);
  const [localCapacityOverview, setLocalCapacityOverview] = useState<CapacityOverview[]>([]);

  // Initialize local state when props change
  useMemo(() => {
    setLocalAllocations(allocations);
    setLocalCapacityOverview(capacityOverview);
  }, [allocations, capacityOverview]);

  // Generate weeks data based on view mode and selected month/year
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];
    
    if (viewMode === 'monthly') {
      // For monthly view, show weeks of the selected month
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
      
      // Get the first Monday of the month (or previous Monday if month starts mid-week)
      const firstMonday = new Date(monthStart);
      const dayOfWeek = monthStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      firstMonday.setDate(monthStart.getDate() - daysToSubtract);
      
      // Generate weeks for the month
      let currentWeek = new Date(firstMonday);
      let weekCount = 0;
      
      while (currentWeek <= monthEnd && weekCount < 6) {
        const weekEnd = new Date(currentWeek);
        weekEnd.setDate(currentWeek.getDate() + 6);
        
        const weekNumber = `W${String(weekCount + 1).padStart(2, '0')}`;
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const startDateStr = `${String(currentWeek.getDate()).padStart(2, '0')} ${monthNames[currentWeek.getMonth()]}`;
        
        weeks.push({
          weekNumber,
          startDate: currentWeek.toISOString(),
          endDate: weekEnd.toISOString(),
          label: startDateStr
        });
        
        currentWeek.setDate(currentWeek.getDate() + 7);
        weekCount++;
      }
    } else if (viewMode === 'weekly') {
      // For weekly view, show 4 weeks from the start of the selected month
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(monthStart);
        weekStart.setDate(monthStart.getDate() + (i * 7));
        
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
    } else {
      // For overview, show 5 weeks from current week
      const today = new Date();
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
    }
    
    return weeks;
  }, [viewMode, selectedMonth, selectedYear]);



  // Optimistically remove allocation from local state
  const removeAllocationOptimistically = (allocationId: string) => {
    // Remove from local allocations
    setLocalAllocations(prev => prev.filter(alloc => alloc.id !== allocationId));
    
    // Update local capacity overview to reflect the removal
    setLocalCapacityOverview(prev => prev.map(overview => {
      const updatedAllocations = (overview.allocations || []).filter(alloc => alloc.id !== allocationId);
      if (updatedAllocations.length !== overview.allocations?.length) {
        // Recalculate total allocated hours
        const newTotalAllocated = updatedAllocations.reduce((sum, alloc) => sum + Number(alloc.hours_per_week || 0), 0);
        return {
          ...overview,
          allocations: updatedAllocations,
          totalAllocatedHours: newTotalAllocated,
          availableHours: Math.max(0, overview.capacity - newTotalAllocated),
          utilizationPercent: overview.capacity > 0 ? (newTotalAllocated / overview.capacity) * 100 : 0
        };
      }
      return overview;
    }));
  };

  // Restore allocation if API call fails
  const restoreAllocation = (allocation: ResourceAllocation) => {
    setLocalAllocations(prev => [...prev, allocation]);
    
    // Restore in capacity overview
    setLocalCapacityOverview(prev => prev.map(overview => {
      const updatedAllocations = [...(overview.allocations || []), allocation];
      const newTotalAllocated = updatedAllocations.reduce((sum, alloc) => sum + Number(alloc.hours_per_week || 0), 0);
      return {
        ...overview,
        allocations: updatedAllocations,
        totalAllocatedHours: newTotalAllocated,
        availableHours: Math.max(0, overview.capacity - newTotalAllocated),
        utilizationPercent: overview.capacity > 0 ? (newTotalAllocated / overview.capacity) * 100 : 0
      };
    }));
  };

  const toggleMemberExpansion = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
      // Lazy load tasks summary for this member across their allocation projects
      const overview = localCapacityOverview.find(o => o.member?.user?.id === memberId);
      const projectIds = Array.from(new Set((overview?.allocations || []).map(a => a.project_id)));
      if (organizationId && projectIds.length > 0) {
        capacityAPI.getTasksSummary(organizationId, { user_id: memberId, project_ids: projectIds, include_tasks: false })
          .then(res => {
            const map: Record<string, { tasks_count: number; estimated_hours: number }> = {};
            res.summary.forEach(s => { map[s.project_id] = { tasks_count: s.tasks_count, estimated_hours: s.estimated_hours }; });
            setMemberTasks(prev => ({ ...prev, [memberId]: map }));
          })
          .catch(() => {});
      }
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
    if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`;
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
      entries: number;
      orgMemberId?: string;
    }>();

    localCapacityOverview.forEach(overview => {
      const userId = overview?.member?.user?.id || overview?.member?.id || crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
      if (!groups.has(userId)) {
        groups.set(userId, {
          user: overview?.member?.user,
          role: overview?.member?.role,
          capacity: overview?.capacity,
          allocations: [],
          totalAllocated: 0, // We'll calculate this from allocations
          entries: 1,
          orgMemberId: (overview as any)?.member?.organization_member_id
        });
      } else {
        const g = groups.get(userId)!;
        g.capacity = Math.max(g.capacity, overview.capacity);
        g.entries += 1;
      }
    });

    // Create map orgMemberId -> userKey
    const orgMemberIdToKey = new Map<string, string>();
    Array.from(groups.entries()).forEach(([key, g]) => {
      if (g.orgMemberId) orgMemberIdToKey.set(String(g.orgMemberId), key);
    });

    // Attach allocations and calculate total allocated hours
    localAllocations.forEach(allocation => {
      // Try different possible paths for organization_member_id
      const orgMemberId = (allocation as any)?.organization_member_id || 
                         (allocation as any)?.resource_allocations?.organization_member_id ||
                         (allocation as any)?.project_member_id;
      
      const key = orgMemberId ? orgMemberIdToKey.get(String(orgMemberId)) : undefined;
      if (key && groups.has(key)) {
        const g = groups.get(key)!;
        g.allocations.push(allocation);
        // Add to total allocated hours
        g.totalAllocated += Number(allocation.hours_per_week || 0);
      }
    });

    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [localCapacityOverview, localAllocations]);

  const getAllocationForWeek = (memberAllocations: ResourceAllocation[], weekData: WeekData) => {
    const start = new Date(weekData.startDate);
    const end = new Date(weekData.endDate);
    const totalAllocated = memberAllocations.reduce((sum, alloc) => {
      const allocStart = new Date(alloc.start_date);
      const allocEnd = alloc.end_date ? new Date(alloc.end_date) : undefined;
      const overlaps = (!allocEnd || allocEnd >= start) && allocStart <= end;
      return overlaps ? sum + (alloc.hours_per_week || 0) : sum;
    }, 0);
    return totalAllocated;
  };

  return (
    <div className="overflow-x-auto">
      <ConfirmationModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (!deletingId || !organizationId) {
            console.log('Delete failed: missing deletingId or organizationId', { deletingId, organizationId });
            return;
          }
          
          console.log('Starting delete process for allocation:', deletingId);
          setIsDeleting(true);
          
          // Store the allocation to restore if API fails
          const allocationToDelete = localAllocations.find(alloc => alloc.id === deletingId);
          
          // Optimistically remove from UI immediately
          removeAllocationOptimistically(deletingId);
          
          try {
            console.log('Calling deleteAllocation API...');
            await capacityAPI.deleteAllocation(organizationId, deletingId);
            console.log('Delete API call successful');
            
            setDeletingId(null);
            // No need to refresh - UI is already updated optimistically
          } catch (error) {
            console.error('Error deleting allocation:', error);
            
            // Restore the allocation if API call failed
            if (allocationToDelete) {
              restoreAllocation(allocationToDelete);
            }
            
            // Show error toast
            toast.error('Failed to remove project allocation. Please try again.');
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Remove Project Allocation"
        message="This will remove the member's allocation from the project. Continue?"
        confirmText="Remove"
        type="danger"
        isLoading={isDeleting}
      />
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
          {groupedMembers.map((member, idx) => {
            const memberId = member?.id ? String(member.id) : member?.user?.id ? String(member.user.id) : `member-${idx}`;
            const isExpanded = expandedMembers.has(memberId);
            const utilizationPercentage = (member?.totalAllocated / member?.capacity) * 100;
            const statusLabel = getStatusLabel(member?.totalAllocated, member?.capacity);
              
            return (
              <React.Fragment key={memberId}>
                {/* Member Header Row */}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMemberExpansion(memberId)}
                        className="mr-2 p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-gray-900">{member?.user?.full_name || 'Unknown User'}{member.entries > 1 ? ` (${member.entries})` : ''}</div>
                        <div className="text-sm text-gray-500">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getUtilizationTextColor(member.totalAllocated, member.capacity)}`}>
                            {member?.totalAllocated}h / {member?.capacity}h
                          </span>
                          {statusLabel && (
                            <span className="text-xs text-red-600">
                              {statusLabel}
                            </span>
                          )}
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getUtilizationColor(member.totalAllocated, member.capacity)}`}
                            style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  {weeksData.map((week) => {
                    const weekAllocation = getAllocationForWeek(member.allocations, week);
                    return (
                      <td
                        key={week.weekNumber}
                        className="px-4 py-4 text-center relative group cursor-pointer"
                        onClick={() => onWeekCellClick?.({ userId: member.user.id, week, member, allocations: member.allocations })}
                      >
                        <div 
                          className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(weekAllocation, member.capacity)}`}
                        >
                          {weekAllocation}h
                        </div>
                        {/* Tooltip */}
                        <div className="invisible  group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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
                        <button 
                          className="text-red-600 hover:text-red-700 mr-2" 
                          title="Remove from project" 
                          onClick={() => {
                            console.log('Delete button clicked for allocation:', allocation.id, allocation);
                            setDeletingId(allocation.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button className="text-sm text-gray-700 cursor-pointer hover:underline" onClick={() => onProjectClick?.(allocation.project_id)}>
                          {projects.find(p => p.id === allocation.project_id)?.name || 'Project Allocation'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{allocation.hours_per_week}h / week</div>
                    </td>
                    {/* Tasks column */}
                   
                    {weeksData.map((week, i) => (
                      <td key={week.weekNumber} className="px-4 py-3 text-center">
                        {editingId === allocation.id && i === 0 ? (
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded text-center"
                            value={editingHours}
                            onChange={(e) => setEditingHours(e.target.value)}
                            step={0.5}
                            min={0}
                            max={168}
                            onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                                const newVal = Number(editingHours || 0);
                            await capacityAPI.updateAllocation(allocation.id, { hours_per_week: newVal } as any, organizationId);
                                setEditingId(null);
                                onRefresh?.();
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                            onBlur={async () => {
                              const newVal = Number(editingHours || 0);
                          await capacityAPI.updateAllocation(allocation.id, { hours_per_week: newVal } as any, organizationId);
                              setEditingId(null);
                              onRefresh?.();
                            }}
                          />
                        ) : (
                          <button
                            className="text-sm text-gray-600"
                            title="Click to edit hours"
                            onClick={() => { setEditingId(allocation.id); setEditingHours(String(allocation.hours_per_week)); }}
                          >
                            {allocation.hours_per_week}h
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Add Resource Row (when expanded) */}
                 {isExpanded && (
                  <tr className="bg-white">
                    <td className="px-6 py-3 pl-16">
                      <button className="flex items-center text-orange-600 hover:text-orange-700 text-sm" onClick={() => { setAddProjectMemberId(member.orgMemberId || ''); setAddProjectMemberName(member?.user?.full_name || 'Member'); }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Project
                      </button>
                    </td>
                    <td className="px-4 py-3"></td>
                    {weeksData.map((week) => (
                      <td key={week.weekNumber} className="px-4 py-3"></td>
                    ))}
                  </tr>
                )}
                {/* Modal moved outside table to avoid hydration errors */}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {addProjectMemberId && (
        <AddProjectModal
          memberId={addProjectMemberId}
          isOpen={true}
          onClose={() => setAddProjectMemberId(null)}
          onCreated={() => { setAddProjectMemberId(null); onRefresh?.(); }}
          organizationId={organizationId!}
          projects={projects}
          memberName={addProjectMemberName}
        />
      )}
    </div>
  );
}

function AddProjectModal({ memberId, organizationId, onClose, onCreated, projects, memberName, isOpen }: { memberId: string; organizationId: string; onClose: () => void; onCreated: () => void; projects: Array<{ id: string; name: string }>; memberName: string; isOpen: boolean; }) {
  const [projectId, setProjectId] = useState<string>('');
  const [hoursPerDay, setHoursPerDay] = useState<number>(2); // convert to week
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="font-semibold">Add Project Assignment</div>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-gray-600">{memberName}</div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Project</label>
            <select className="w-full border rounded px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Hours Per Day</label>
            <input type="number" min={0} max={24} step={0.5} className="w-full border rounded px-3 py-2" value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Start Date</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
            disabled={!projectId || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const hoursPerWeek = Math.round(hoursPerDay * 5 * 100) / 100; // default 5 days/week
                await capacityAPI.createAllocation({
                  organization_id: organizationId,
                  project_id: projectId,
                  organization_member_id: memberId,
                  hours_per_week: hoursPerWeek,
                  start_date: startDate,
                });
                onCreated();
              } finally {
                setIsSubmitting(false);
              }
            }}
          >Add Assignment</button>
        </div>
      </div>
    </div>
  );
}
