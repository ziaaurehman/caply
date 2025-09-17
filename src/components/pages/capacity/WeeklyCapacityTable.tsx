"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Users, X } from "lucide-react";
import {
  type CapacityOverview,
  type ResourceAllocation,
} from "@/utils/api/capacity";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  useUpdateAllocation,
  useDeleteAllocation,
  useTasksSummary,
} from "@/lib/hooks/useCapacity";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<string>("");
  const [addProjectMemberId, setAddProjectMemberId] = useState<string | null>(
    null
  );
  const [addProjectMemberName, setAddProjectMemberName] = useState<string>("");

  // New state for editing allocations
  const [editingAllocation, setEditingAllocation] =
    useState<ResourceAllocation | null>(null);

  // React Query mutations
  const updateAllocationMutation = useUpdateAllocation();
  const deleteAllocationMutation = useDeleteAllocation();

  // Generate time columns (weeks or days) based on view mode and selected month/year
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];

    // Create a date based on the selected month and year
    const selectedDate = new Date(selectedYear, selectedMonth, 1);

    if (viewMode === "weekly") {
      // For weekly view, show just the week containing the 1st of the selected month
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({
        weekNumber: `W${Math.ceil(
          (weekStart.getTime() -
            new Date(weekStart.getFullYear(), 0, 1).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )}`,
        startDate: weekStart.toISOString().split("T")[0],
        endDate: weekEnd.toISOString().split("T")[0],
        label: `${weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${weekEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        type: "week",
      });
    } else {
      // For overview and monthly, show 5 weeks starting from the week containing the 1st of the selected month
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      for (let i = 0; i < 5; i++) {
        const currentWeekStart = new Date(weekStart);
        currentWeekStart.setDate(weekStart.getDate() + i * 7);

        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

        weeks.push({
          weekNumber: `W${Math.ceil(
            (currentWeekStart.getTime() -
              new Date(currentWeekStart.getFullYear(), 0, 1).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          )}`,
          startDate: currentWeekStart.toISOString().split("T")[0],
          endDate: currentWeekEnd.toISOString().split("T")[0],
          label: `${currentWeekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} - ${currentWeekEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`,
          type: "week",
        });
      }
    }

    return weeks;
  }, [viewMode, selectedMonth, selectedYear]);

  // Tasks summary query for expanded members
  const expandedMembersList = Array.from(expandedMembers);
  const { data: tasksSummaryData } = useTasksSummary(organizationId || "", {
    user_id: expandedMembersList[0], // For now, just get first expanded member
    start_date: weeksData[0]?.startDate,
    end_date: weeksData[weeksData.length - 1]?.endDate,
    include_tasks: true,
  });

  // Handle allocation update
  const handleUpdateAllocation = async (
    id: string,
    updates: Partial<ResourceAllocation>
  ) => {
    if (!organizationId) return;

    try {
      await updateAllocationMutation.mutateAsync({
        id,
        data: updates,
        organizationId,
      });

      toast.success("Allocation updated successfully!");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating allocation:", error);
      toast.error("Failed to update allocation");
    }
  };

  // Handle allocation deletion
  const handleDeleteAllocation = async (id: string) => {
    if (!organizationId) return;

    try {
      await deleteAllocationMutation.mutateAsync({
        id,
        organizationId,
      });

      toast.success("Allocation deleted successfully!");
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      toast.error("Failed to delete allocation");
    }
  };

  // Toggle member expansion
  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // Get allocations for a specific member and week
  const getAllocationsForMemberWeek = (
    memberId: string,
    weekStartDate: string,
    weekEndDate: string
  ) => {
    return allocations.filter((allocation) => {
      const allocationStart = new Date(allocation.start_date);
      const allocationEnd = allocation.end_date
        ? new Date(allocation.end_date)
        : new Date("2099-12-31");
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekEndDate);

      // Check if allocation overlaps with the week
      return (
        allocationStart <= weekEnd &&
        allocationEnd >= weekStart &&
        (allocation as any)?.organization_member_id === memberId
      );
    });
  };

  // Calculate total hours for a member in a specific week
  const getTotalHoursForMemberWeek = (
    memberId: string,
    weekStartDate: string,
    weekEndDate: string
  ) => {
    const memberAllocations = getAllocationsForMemberWeek(
      memberId,
      weekStartDate,
      weekEndDate
    );
    return memberAllocations.reduce(
      (total, allocation) => total + (allocation.hours_per_week || 0),
      0
    );
  };

  // Get status color based on utilization
  const getStatusColor = (utilized: number, capacity: number) => {
    const utilizationPercent = (utilized / capacity) * 100;

    if (utilizationPercent > 100) {
      return "bg-red-100 text-red-800"; // OverAllocated
    } else if (utilizationPercent >= 80) {
      return "bg-green-100 text-green-800"; // Optimal
    } else if (utilizationPercent >= 60) {
      return "bg-blue-100 text-blue-800"; // Near optimal
    } else {
      return "bg-yellow-100 text-yellow-800"; // Underutilized
    }
  };

  // Start editing allocation
  const startEditingAllocation = (allocation: ResourceAllocation) => {
    setEditingAllocation(allocation);
    setEditingHours(allocation.hours_per_week.toString());
  };

  // Save allocation changes
  const saveAllocationChanges = async () => {
    if (!editingAllocation) return;

    const newHours = parseFloat(editingHours);
    if (isNaN(newHours) || newHours < 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    await handleUpdateAllocation(editingAllocation.id, {
      hours_per_week: newHours,
    });

    setEditingAllocation(null);
    setEditingHours("");
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingAllocation(null);
    setEditingHours("");
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Team Member
            </th>
            {weeksData.map((week) => (
              <th
                key={week.weekNumber}
                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
              >
                <div>{week.weekNumber}</div>
                <div className="text-xs font-normal text-gray-400">
                  {week.label}
                </div>
              </th>
            ))}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {capacityOverview.map((member) => {
            const isExpanded = expandedMembers.has(member.member.id);
            const memberAllocations = allocations.filter(
              (allocation) =>
                (allocation as any)?.organization_member_id === member.member.id
            );

            return (
              <React.Fragment key={member.member.id}>
                {/* Main member row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMemberExpansion(member.member.id)}
                        className="mr-2 p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.member.user.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.member.role}
                        </div>
                        <div className="text-xs text-gray-400">
                          Capacity: {member.capacity}h/week
                        </div>
                      </div>
                    </div>
                  </td>

                  {weeksData.map((week) => {
                    const totalHours = getTotalHoursForMemberWeek(
                      member.member.id,
                      week.startDate,
                      week.endDate
                    );
                    const statusColor = getStatusColor(
                      totalHours,
                      member.capacity
                    );

                    return (
                      <td
                        key={week.weekNumber}
                        className="px-3 py-4 text-center cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          onWeekCellClick?.({
                            userId: member.member.user.id,
                            week,
                            member,
                            allocations: getAllocationsForMemberWeek(
                              member.member.id,
                              week.startDate,
                              week.endDate
                            ),
                          })
                        }
                      >
                        <div
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                        >
                          {totalHours}h
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.round((totalHours / member.capacity) * 100)}%
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onAddResource?.()}
                      className="text-orange-600 hover:text-orange-900"
                      title="Add allocation"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>

                {/* Expanded member details */}
                {isExpanded && (
                  <>
                    {memberAllocations.map((allocation) => (
                      <tr key={allocation.id} className="bg-gray-50">
                        <td className="px-12 py-2 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
                          <div className="text-sm text-gray-600">
                            {projects.find(
                              (p) => p.id === allocation.project_id
                            )?.name || `Project ${allocation.project_id}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {allocation.start_date} -{" "}
                            {allocation.end_date || "Ongoing"}
                          </div>
                        </td>

                        {weeksData.map((week) => {
                          const isInRange =
                            new Date(allocation.start_date) <=
                              new Date(week.endDate) &&
                            (allocation.end_date
                              ? new Date(allocation.end_date)
                              : new Date("2099-12-31")) >=
                              new Date(week.startDate);

                          return (
                            <td
                              key={week.weekNumber}
                              className="px-3 py-2 text-center"
                            >
                              {isInRange && (
                                <div className="text-sm text-gray-600">
                                  {editingAllocation?.id === allocation.id ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <input
                                        type="number"
                                        value={editingHours}
                                        onChange={(e) =>
                                          setEditingHours(e.target.value)
                                        }
                                        className="w-16 px-1 py-1 text-xs border rounded"
                                        min="0"
                                        step="0.5"
                                      />
                                      <button
                                        onClick={saveAllocationChanges}
                                        className="text-green-600 hover:text-green-800"
                                        disabled={
                                          updateAllocationMutation.isPending
                                        }
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={cancelEditing}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        ✗
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-1">
                                      <span>{allocation.hours_per_week}h</span>
                                      <button
                                        onClick={() =>
                                          startEditingAllocation(allocation)
                                        }
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-6 py-2 text-center">
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this allocation?"
                                )
                              ) {
                                handleDeleteAllocation(allocation.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete allocation"
                            disabled={deleteAllocationMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {capacityOverview.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Team Members Found
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            No team members found for the selected filters. Add team members and
            configure their capacity to get started.
          </p>
          <button
            onClick={onAddResource}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </button>
        </div>
      )}
    </div>
  );
}
