"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, X } from "lucide-react";
import {
  type CapacityOverview,
  type ResourceAllocation,
  capacityAPI,
} from "@/utils/api/capacity";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WeeklyCapacityTableProps {
  capacityOverview: CapacityOverview[];
  allocations: ResourceAllocation[];
  projects?: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
  organizationId?: string;
  onWeekCellClick?: (args: {
    userId: string;
    week: WeekData;
    member: any;
    allocations: ResourceAllocation[];
  }) => void;
  onRefresh?: () => void;
  onProjectClick?: (projectId: string) => void;
  onAddResource?: () => void;
  viewMode?: "overview" | "weekly" | "monthly";
  selectedMonth?: number;
  selectedYear?: number;
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
  type?: "week" | "day";
  isWeekend?: boolean;
}

export default function WeeklyCapacityTable({
  capacityOverview,
  allocations,
  projects = [],
  organizationId,
  onWeekCellClick,
  onRefresh,
  onProjectClick,
  onAddResource,
  viewMode = "overview",
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
}: WeeklyCapacityTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberTasks, setMemberTasks] = useState<
    Record<
      string,
      Record<string, { tasks_count: number; estimated_hours: number }>
    >
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<string>("");
  const [addProjectMemberId, setAddProjectMemberId] = useState<string | null>(
    null
  );
  const [addProjectMemberName, setAddProjectMemberName] = useState<string>("");

  // New state for editing allocations
  const [editingAllocation, setEditingAllocation] =
    useState<ResourceAllocation | null>(null);

  // Local state for optimistic updates
  const [localAllocations, setLocalAllocations] = useState<
    ResourceAllocation[]
  >([]);
  const [localCapacityOverview, setLocalCapacityOverview] = useState<
    CapacityOverview[]
  >([]);

  // Initialize local state when props change
  useMemo(() => {
    setLocalAllocations(allocations);
    setLocalCapacityOverview(capacityOverview);
  }, [allocations, capacityOverview]);

  // Generate time columns (weeks or days) based on view mode and selected month/year
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];

    // Create a date based on the selected month and year
    const selectedDate = new Date(selectedYear, selectedMonth, 1);

    if (viewMode === "monthly") {
      // For monthly view, show 5 weeks starting from the week containing the 1st of the selected month
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      for (let i = 0; i < 5; i++) {
        const currentWeekStart = new Date(weekStart);
        currentWeekStart.setDate(weekStart.getDate() + i * 7);

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);

        const weekNumber = `W${String(i + 1).padStart(2, "0")}`;
        const monthNames = [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ];
        const startDateStr = `${String(currentWeekStart.getDate()).padStart(2, "0")} ${monthNames[currentWeekStart.getMonth()]}`;

        weeks.push({
          weekNumber,
          startDate: currentWeekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          label: startDateStr,
          type: "week",
        });
      }
    } else if (viewMode === "weekly") {
      // Weekly view shows per-day columns for the week containing the 1st of the selected month
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const dayEnd = new Date(day);
        const weekday = day.getDay(); // 0 Sun, 6 Sat
        const isWeekend = weekday === 0 || weekday === 6;
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const monthNames = [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ];
        const dayLabel = `${String(day.getDate()).padStart(2, "0")} ${monthNames[day.getMonth()]}`;
        weeks.push({
          weekNumber: dayNames[weekday],
          startDate: day.toISOString(),
          endDate: dayEnd.toISOString(),
          label: dayLabel,
          type: "day",
          isWeekend,
        });
      }
    } else {
      // For overview, show 5 weeks starting from the week containing the 1st of the selected month
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      for (let i = 0; i < 5; i++) {
        const currentWeekStart = new Date(weekStart);
        currentWeekStart.setDate(weekStart.getDate() + i * 7);

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);

        const weekNumber = `W${String(i + 1).padStart(2, "0")}`;
        const monthNames = [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ];
        const startDateStr = `${String(currentWeekStart.getDate()).padStart(2, "0")} ${monthNames[currentWeekStart.getMonth()]}`;

        weeks.push({
          weekNumber,
          startDate: currentWeekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          label: startDateStr,
          type: "week",
        });
      }
    }

    return weeks;
  }, [viewMode, selectedMonth, selectedYear]);

  // Optimistically remove allocation from local state
  const removeAllocationOptimistically = (allocationId: string) => {
    // Remove from local allocations
    setLocalAllocations((prev) =>
      prev.filter((alloc) => alloc.id !== allocationId)
    );

    // Update local capacity overview to reflect the removal
    setLocalCapacityOverview((prev) =>
      prev.map((overview) => {
        const updatedAllocations = (overview.allocations || []).filter(
          (alloc) => alloc.id !== allocationId
        );
        if (updatedAllocations.length !== overview.allocations?.length) {
          // Recalculate total allocated hours
          const newTotalAllocated = updatedAllocations.reduce(
            (sum, alloc) => sum + Number(alloc.hours_per_week || 0),
            0
          );
          return {
            ...overview,
            allocations: updatedAllocations,
            totalAllocatedHours: newTotalAllocated,
            availableHours: Math.max(0, overview.capacity - newTotalAllocated),
            utilizationPercent:
              overview.capacity > 0
                ? (newTotalAllocated / overview.capacity) * 100
                : 0,
          };
        }
        return overview;
      })
    );
  };

  // Restore allocation if API call fails
  const restoreAllocation = (allocation: ResourceAllocation) => {
    setLocalAllocations((prev) => [...prev, allocation]);

    // Restore in capacity overview
    setLocalCapacityOverview((prev) =>
      prev.map((overview) => {
        const updatedAllocations = [
          ...(overview.allocations || []),
          allocation,
        ];
        const newTotalAllocated = updatedAllocations.reduce(
          (sum, alloc) => sum + Number(alloc.hours_per_week || 0),
          0
        );
        return {
          ...overview,
          allocations: updatedAllocations,
          totalAllocatedHours: newTotalAllocated,
          availableHours: Math.max(0, overview.capacity - newTotalAllocated),
          utilizationPercent:
            overview.capacity > 0
              ? (newTotalAllocated / overview.capacity) * 100
              : 0,
        };
      })
    );
  };

  const toggleMemberExpansion = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
      // Lazy load tasks summary for this member across their allocation projects
      const overview = localCapacityOverview.find(
        (o) => o.member?.user?.id === memberId
      );
      const projectIds = Array.from(
        new Set((overview?.allocations || []).map((a) => a.project_id))
      );
      if (organizationId && projectIds.length > 0) {
        capacityAPI
          .getTasksSummary(organizationId, {
            user_id: memberId,
            project_ids: projectIds,
            include_tasks: false,
          })
          .then((res) => {
            const map: Record<
              string,
              { tasks_count: number; estimated_hours: number }
            > = {};
            res.summary.forEach((s) => {
              map[s.project_id] = {
                tasks_count: s.tasks_count,
                estimated_hours: s.estimated_hours,
              };
            });
            setMemberTasks((prev) => ({ ...prev, [memberId]: map }));
          })
          .catch(() => {});
      }
    }
    setExpandedMembers(newExpanded);
  };

  const getUtilizationColor = (allocated: number, capacity: number) => {
    if (allocated === 0) return "bg-gray-100 text-gray-600";

    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "bg-red-600 text-white"; // Overallocated - darker red for better contrast
    if (percentage >= 80) return "bg-amber-600 text-white"; // Near capacity - darker amber for better contrast
    if (percentage >= 60) return "bg-green-600 text-white"; // Optimal - darker green for better contrast
    return "bg-amber-600 text-white"; // Underutilized - darker amber for better contrast
  };

  const getUtilizationTextColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "text-red-700"; // Overallocated
    if (percentage >= 80) return "text-amber-700"; // Near capacity - changed from yellow to amber
    if (percentage >= 60) return "text-green-700"; // Optimal
    return "text-amber-700"; // Underutilized - changed from yellow to amber
  };

  const getStatusLabel = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`;
    return "";
  };

  // Group members by user
  const groupedMembers = useMemo(() => {
    const groups = new Map<
      string,
      {
        user: any;
        role: string;
        capacity: number;
        allocations: ResourceAllocation[];
        totalAllocated: number;
        entries: number;
        orgMemberId?: string;
      }
    >();

    localCapacityOverview.forEach((overview) => {
      const userId =
        overview?.member?.user?.id ||
        overview?.member?.id ||
        crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2);
      if (!groups.has(userId)) {
        groups.set(userId, {
          user: overview?.member?.user,
          role: overview?.member?.role,
          capacity: overview?.capacity,
          allocations: [],
          totalAllocated: 0, // We'll calculate this from allocations
          entries: 1,
          orgMemberId: (overview as any)?.member?.organization_member_id,
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
    localAllocations.forEach((allocation) => {
      // Try different possible paths for organization_member_id
      const orgMemberId =
        (allocation as any)?.organization_member_id ||
        (allocation as any)?.resource_allocations?.organization_member_id ||
        (allocation as any)?.project_member_id;

      const key = orgMemberId
        ? orgMemberIdToKey.get(String(orgMemberId))
        : undefined;
      if (key && groups.has(key)) {
        const g = groups.get(key)!;
        g.allocations.push(allocation);
        // Add to total allocated hours
        g.totalAllocated += Number(allocation.hours_per_week || 0);
      }
    });

    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [localCapacityOverview, localAllocations]);

  const getAllocationForWeek = (
    memberAllocations: ResourceAllocation[],
    weekData: WeekData
  ) => {
    const start = new Date(weekData.startDate);
    const end = new Date(weekData.endDate);
    // If this column represents a day, compute per-day allocation from weekly hours (5-day workweek)
    if (weekData.type === "day") {
      const isWeekend = weekData.isWeekend === true;
      if (isWeekend) return 0;
      const dailyAllocated = memberAllocations.reduce((sum, alloc) => {
        const allocStart = new Date(alloc.start_date);
        const allocEnd = alloc.end_date ? new Date(alloc.end_date) : undefined;
        const activeOnDay =
          (!allocEnd || allocEnd >= start) && allocStart <= end;
        if (!activeOnDay) return sum;
        const hoursPerWeek = Number(alloc.hours_per_week || 0);
        const perDay = hoursPerWeek / 5; // assume 5 working days
        return sum + perDay;
      }, 0);
      // round to single decimal for display
      return Math.round(dailyAllocated * 10) / 10;
    }
    // Weekly-type column: sum weekly hours for allocations overlapping the week
    const totalAllocated = memberAllocations.reduce((sum, alloc) => {
      const allocStart = new Date(alloc.start_date);
      const allocEnd = alloc.end_date ? new Date(alloc.end_date) : undefined;
      const overlaps = (!allocEnd || allocEnd >= start) && allocStart <= end;
      return overlaps ? sum + (alloc.hours_per_week || 0) : sum;
    }, 0);
    return totalAllocated;
  };

  return (
    <div className="overflow-x-auto  bg-gray-50 min-h-[400px]">
      <ConfirmationModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (!deletingId || !organizationId) {
            console.log("Delete failed: missing deletingId or organizationId", {
              deletingId,
              organizationId,
            });
            return;
          }

          console.log("Starting delete process for allocation:", deletingId);
          setIsDeleting(true);

          // Store the allocation to restore if API fails
          const allocationToDelete = localAllocations.find(
            (alloc) => alloc.id === deletingId
          );

          // Optimistically remove from UI immediately
          removeAllocationOptimistically(deletingId);

          try {
            console.log("Calling deleteAllocation API...");
            await capacityAPI.deleteAllocation(organizationId, deletingId);
            console.log("Delete API call successful");

            setDeletingId(null);
            // No need to refresh - UI is already updated optimistically
          } catch (error) {
            console.error("Error deleting allocation:", error);

            // Restore the allocation if API call failed
            if (allocationToDelete) {
              restoreAllocation(allocationToDelete);
            }

            // Show error toast
            toast.error(
              "Failed to remove project allocation. Please try again."
            );
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
      <table className="min-w-full bg-gray-50">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              RESOURCE
            </th>
            <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              WEEKLY CAPACITY
            </th>
            {weeksData.map((week) => (
              <th
                key={`${week.weekNumber}-${week.startDate}`}
                className={`text-center px-4 py-4 text-xs font-medium uppercase tracking-wider ${week.type === "day" && week.isWeekend ? "text-gray-400" : "text-gray-500"}`}
              >
                <div>{week.weekNumber}</div>
                <div className="text-xs text-gray-400">{week.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 ">
          {groupedMembers.map((member, idx) => {
            const memberId = member?.id
              ? String(member.id)
              : member?.user?.id
                ? String(member.user.id)
                : `member-${idx}`;
            const isExpanded = expandedMembers.has(memberId);
            const utilizationPercentage =
              (member?.totalAllocated / member?.capacity) * 100;
            const statusLabel = getStatusLabel(
              member?.totalAllocated,
              member?.capacity
            );

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
                        <div className="font-medium text-gray-900">
                          {member?.user?.full_name || "Unknown User"}
                          {member.entries > 1 ? ` (${member.entries})` : ""}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={`font-medium ${getUtilizationTextColor(member.totalAllocated, member.capacity)}`}
                          >
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
                            style={{
                              width: `${Math.min(utilizationPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  {weeksData.map((week) => {
                    const allocationForCell = getAllocationForWeek(
                      member.allocations,
                      week
                    );
                    const capacityForCell =
                      week.type === "day"
                        ? Math.round((member.capacity / 5) * 10) / 10
                        : member.capacity;
                    const availableForCell = Math.max(
                      0,
                      capacityForCell - allocationForCell
                    );
                    const isWeekend = week.type === "day" && week.isWeekend;
                    const isToday = (() => {
                      if (week.type !== "day") return false;
                      const d = new Date(week.startDate);
                      const now = new Date();
                      return (
                        d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate()
                      );
                    })();
                    return (
                      <td
                        key={`${week.weekNumber}-${week.startDate}`}
                        className={`px-4 py-4 text-center relative group cursor-pointer ${isWeekend ? "bg-gray-50" : ""} ${isToday ? "ring-2 ring-orange-300" : ""}`}
                        onClick={() =>
                          onWeekCellClick?.({
                            userId: member.user.id,
                            week,
                            member,
                            allocations: member.allocations,
                          })
                        }
                      >
                        {isWeekend ? (
                          <div className="flex items-center justify-center">
                            <div className="w-full h-1 bg-gray-300 rounded"></div>
                          </div>
                        ) : (
                          <div
                            className={`inline-block px-3 py-1 rounded text-sm font-medium ${getUtilizationColor(allocationForCell, capacityForCell)}`}
                          >
                            {`${allocationForCell}h`}
                          </div>
                        )}
                        {/* Tooltip */}
                        <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 -mt-4 px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg shadow-xl z-[60] min-w-max">
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white"></div>
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-5 border-r-5 border-b-5 border-l-transparent border-r-transparent border-b-gray-300"></div>
                          {week.type === "day" ? (
                            <>
                              <div className="font-semibold text-gray-900 mb-2">
                                {week.weekNumber} •{" "}
                                {new Date(week.startDate).toLocaleDateString()}
                              </div>
                              {isWeekend ? (
                                <div className="text-gray-600 italic">
                                  Weekend - No work scheduled
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                      Allocated:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {allocationForCell}h
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                      Capacity:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {capacityForCell}h
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                                    <span className="text-gray-600">
                                      Available:
                                    </span>
                                    <span className="font-medium text-green-600">
                                      {availableForCell}h
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-gray-900 mb-2">
                                Week {week.weekNumber}
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">
                                    Allocated:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {allocationForCell}h
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">
                                    Capacity:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {capacityForCell}h
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                                  <span className="text-gray-600">
                                    Available:
                                  </span>
                                  <span className="font-medium text-green-600">
                                    {availableForCell}h
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Project Allocation Rows (when expanded) */}
                {isExpanded &&
                  member.allocations.map((allocation) => (
                    <tr key={allocation.id} className="bg-white">
                      <td className="px-6 py-3 pl-16">
                        <div className="flex items-center">
                          <button
                            className="text-red-600 hover:text-red-700 mr-2"
                            title="Remove from project"
                            onClick={() => {
                              console.log(
                                "Delete button clicked for allocation:",
                                allocation.id,
                                allocation
                              );
                              setDeletingId(allocation.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-700 mr-2"
                            title="Edit allocation"
                            onClick={() => {
                              setEditingAllocation(allocation);
                              setAddProjectMemberId(member.orgMemberId || "");
                              setAddProjectMemberName(
                                member?.user?.full_name || "Member"
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="text-sm text-gray-700 cursor-pointer hover:underline"
                            onClick={() =>
                              onProjectClick?.(allocation.project_id)
                            }
                          >
                            {projects.find(
                              (p) => p.id === allocation.project_id
                            )?.name || "Project Allocation"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {allocation.hours_per_week}h / week
                        </div>
                      </td>
                      {/* Tasks column */}

                      {weeksData.map((week, i) => {
                        const isWeekend = week.type === "day" && week.isWeekend;
                        return (
                          <td
                            key={`${week.weekNumber}-${week.startDate}`}
                            className={`px-4 py-3 text-center ${isWeekend ? "bg-gray-50" : ""}`}
                          >
                            {isWeekend ? (
                              <div className="flex items-center justify-center">
                                <div className="w-full h-1 bg-gray-300 rounded"></div>
                              </div>
                            ) : editingId === allocation.id && i === 0 ? (
                              <input
                                type="number"
                                className="w-20 px-2 py-1 border rounded text-center"
                                value={editingHours}
                                onChange={(e) =>
                                  setEditingHours(e.target.value)
                                }
                                step={0.5}
                                min={0}
                                max={168}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    const newVal = Number(editingHours || 0);
                                    await capacityAPI.updateAllocation(
                                      allocation.id,
                                      { hours_per_week: newVal } as any,
                                      organizationId
                                    );
                                    setEditingId(null);
                                    onRefresh?.();
                                  } else if (e.key === "Escape") {
                                    setEditingId(null);
                                  }
                                }}
                                onBlur={async () => {
                                  const newVal = Number(editingHours || 0);
                                  await capacityAPI.updateAllocation(
                                    allocation.id,
                                    { hours_per_week: newVal } as any,
                                    organizationId
                                  );
                                  setEditingId(null);
                                  onRefresh?.();
                                }}
                              />
                            ) : (
                              <button
                                className="text-sm text-gray-600"
                                title="Click to edit hours"
                                onClick={() => {
                                  setEditingId(allocation.id);
                                  setEditingHours(
                                    String(allocation.hours_per_week)
                                  );
                                }}
                              >
                                {week.type === "day"
                                  ? `${Math.round(((allocation.hours_per_week || 0) / 5) * 10) / 10}h`
                                  : `${allocation.hours_per_week}h`}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                {/* Add Resource Row (when expanded) */}
                {isExpanded && (
                  <tr className="bg-white">
                    <td className="px-6 py-3 pl-16">
                      <button
                        className="flex items-center text-orange-600 hover:text-orange-700 text-sm"
                        onClick={() => {
                          setAddProjectMemberId(member.orgMemberId || "");
                          setAddProjectMemberName(
                            member?.user?.full_name || "Member"
                          );
                        }}
                      >
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
          onClose={() => {
            setAddProjectMemberId(null);
            setEditingAllocation(null);
          }}
          onCreated={() => {
            setAddProjectMemberId(null);
            setEditingAllocation(null);
            onRefresh?.();
          }}
          organizationId={organizationId!}
          projects={projects}
          memberName={addProjectMemberName}
          editingAllocation={editingAllocation}
        />
      )}
    </div>
  );
}

function AddProjectModal({
  memberId,
  organizationId,
  onClose,
  onCreated,
  projects,
  memberName,
  isOpen,
  editingAllocation,
}: {
  memberId: string;
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
  projects: Array<{ id: string; name: string }>;
  memberName: string;
  isOpen: boolean;
  editingAllocation: ResourceAllocation | null;
}) {
  const isEditing = Boolean(editingAllocation);

  const [projectId, setProjectId] = useState<string>(
    editingAllocation?.project_id || ""
  );
  const [hoursPerDay, setHoursPerDay] = useState<number>(
    editingAllocation
      ? Math.round((editingAllocation.hours_per_week / 5) * 10) / 10
      : 2
  ); // convert to week
  const [startDate, setStartDate] = useState<string>(() =>
    editingAllocation?.start_date
      ? new Date(editingAllocation.start_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    editingAllocation?.end_date
      ? new Date(editingAllocation.end_date).toISOString().slice(0, 10)
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="font-semibold">
            {isEditing ? "Edit Project Assignment" : "Add Project Assignment"}
          </div>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-gray-600">{memberName}</div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Project</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isEditing} // Don't allow changing project when editing
            >
              <option value="">Select project</option>
              {projects && projects.length > 0 ? (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No projects available
                </option>
              )}
            </select>
            {/* Debug info and helpful message */}
            {projects && projects.length === 0 && (
              <div className="text-xs text-red-500 mt-1">
                No projects with capacity planning enabled found.
                <br />
                <span className="text-blue-600">
                  Enable capacity planning in project settings to add
                  assignments.
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Hours Per Day
            </label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className="w-full border rounded px-3 py-2"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!projectId || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const hoursPerWeek = Math.round(hoursPerDay * 5 * 100) / 100; // default 5 days/week

                if (isEditing && editingAllocation) {
                  // Update existing allocation
                  await capacityAPI.updateAllocation(
                    editingAllocation.id,
                    {
                      hours_per_week: hoursPerWeek,
                      start_date: startDate,
                      end_date: endDate || null,
                    } as any,
                    organizationId
                  );
                } else {
                  // Create new allocation
                  await capacityAPI.createAllocation({
                    organization_id: organizationId,
                    organization_member_id: memberId,
                    project_id: projectId,
                    hours_per_week: hoursPerWeek,
                    start_date: startDate,
                    end_date: endDate || null,
                  });
                }
                onCreated();
              } catch (error) {
                console.error("Error saving allocation:", error);
                alert(
                  error instanceof Error
                    ? error.message
                    : "Failed to save allocation"
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Assignment"
                : "Add Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
