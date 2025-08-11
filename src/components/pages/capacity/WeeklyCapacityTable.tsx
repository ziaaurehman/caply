"use client"

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { CapacityOverview, ResourceAllocation, capacityAPI } from '@/utils/api/capacity';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

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
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
}

export default function WeeklyCapacityTable({ capacityOverview, allocations, projects = [], organizationId, onWeekCellClick, onRefresh, onProjectClick, onAddResource }: WeeklyCapacityTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberTasks, setMemberTasks] = useState<Record<string, Record<string, { tasks_count: number; estimated_hours: number }>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<string>('');
  const [addProjectMemberId, setAddProjectMemberId] = useState<string | null>(null);
  const [addProjectMemberName, setAddProjectMemberName] = useState<string>('');

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
      // Lazy load tasks summary for this member across their allocation projects
      const overview = capacityOverview.find(o => o.member?.user?.id === memberId);
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
      entries: number;
      orgMemberId?: string;
    }>();

    capacityOverview.forEach(overview => {
      const userId = overview?.member?.user?.id || overview?.member?.id || crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
      if (!groups.has(userId)) {
        groups.set(userId, {
          user: overview?.member?.user,
          role: overview?.member?.role,
          capacity: overview?.capacity,
          allocations: [],
          totalAllocated: overview.totalAllocatedHours,
          entries: 1,
          orgMemberId: (overview as any)?.member?.organization_member_id
        });
      } else {
        const g = groups.get(userId)!;
        g.totalAllocated += overview.totalAllocatedHours;
        g.capacity = Math.max(g.capacity, overview.capacity);
        g.entries += 1;
      }
    });

    // Create map orgMemberId -> userKey
    const orgMemberIdToKey = new Map<string, string>();
    Array.from(groups.entries()).forEach(([key, g]) => {
      if (g.orgMemberId) orgMemberIdToKey.set(String(g.orgMemberId), key);
    });

    // Attach allocations using resource_allocations.organization_member_id
    allocations.forEach(allocation => {
      const orgMemberId = (allocation as any)?.resource_allocations?.organization_member_id;
      const key = orgMemberId ? orgMemberIdToKey.get(String(orgMemberId)) : undefined;
      if (key && groups.has(key)) {
        const g = groups.get(key)!;
        g.allocations.push(allocation);
      }
    });

    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [capacityOverview, allocations]);

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
          if (!deletingId || !organizationId) return;
          setIsDeleting(true);
          try {
            await capacityAPI.deleteAllocation(organizationId, deletingId);
            setDeletingId(null);
            onRefresh?.();
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
            const overallUtilization = `${member?.totalAllocated}h / ${member?.capacity}h`;
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
                        <button className="text-red-600 hover:text-red-700 mr-2" title="Remove from project" onClick={() => setDeletingId(allocation.id)}>
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
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {memberTasks[memberId]?.[allocation.project_id]
                          ? `${memberTasks[memberId][allocation.project_id].tasks_count} tasks – ${memberTasks[memberId][allocation.project_id].estimated_hours}h`
                          : '—'}
                      </div>
                    </td>
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
