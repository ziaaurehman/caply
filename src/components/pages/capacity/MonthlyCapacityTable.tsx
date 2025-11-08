"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, Trash, Pencil } from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { capacityStore } from "@/lib/stores/capacityStore";

interface Member {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl?: string;
  capacity: number;
  allocations: Array<{
    projectId: string;
    projectName: string;
    hours: number; // Default weekly hours
    weeklyHours?: number[]; // per week allocations aligned with weeksData
    linked?: boolean; // if true, edit one week updates all
  }>;
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
}

interface MonthlyCapacityTableProps {
  selectedMonth?: number;
  selectedYear?: number;
  onAddResource?: () => void;
}

export default function MonthlyCapacityTable({
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  onAddResource,
}: MonthlyCapacityTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const [deletingTarget, setDeletingTarget] = useState<{
    memberId: string;
    projectId: string;
  } | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    memberId: string;
    projectId: string;
  } | null>(null);
  const [addModalTarget, setAddModalTarget] = useState<string | null>(null); // memberId
  const [addForm, setAddForm] = useState({ projectName: "", hours: 1 });

  // Dummy data
  const initialMembers: Member[] = [
    {
      id: "1",
      fullName: "John Doe",
      jobTitle: "Senior Developer",
      capacity: 40,
      allocations: [
        { projectId: "p1", projectName: "Project Alpha", hours: 20 },
        { projectId: "p2", projectName: "Project Beta", hours: 15 },
      ],
    },
    {
      id: "2",
      fullName: "Jane Smith",
      jobTitle: "UI Designer",
      capacity: 40,
      allocations: [
        { projectId: "p2", projectName: "Project Beta", hours: 30 },
        { projectId: "p3", projectName: "Project Gamma", hours: 10 },
      ],
    },
    {
      id: "3",
      fullName: "Bob Johnson",
      jobTitle: "Product Manager",
      capacity: 40,
      allocations: [
        { projectId: "p1", projectName: "Project Alpha", hours: 25 },
        { projectId: "p3", projectName: "Project Gamma", hours: 15 },
      ],
    },
  ];

  const [members, setMembers] = useState<Member[]>(initialMembers);

  // Generate weeks for the selected month
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    const firstMonday = new Date(monthStart);
    const dayOfWeek = monthStart.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstMonday.setDate(monthStart.getDate() - daysToSubtract);

    let currentWeek = new Date(firstMonday);
    let weekCount = 0;

    while (currentWeek <= monthEnd && weekCount < 6) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(currentWeek.getDate() + 6);

      const weekNumber = `W${String(weekCount + 1).padStart(2, "0")}`;
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
      const startDateStr = `${String(currentWeek.getDate()).padStart(2, "0")} ${monthNames[currentWeek.getMonth()]}`;

      weeks.push({
        weekNumber,
        startDate: currentWeek.toISOString(),
        endDate: weekEnd.toISOString(),
        label: startDateStr,
      });

      currentWeek.setDate(currentWeek.getDate() + 7);
      weekCount++;
    }

    return weeks;
  }, [selectedMonth, selectedYear]);

  const getUtilizationColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    if (percentage >= 60) return "bg-green-500";
    return "bg-yellow-500";
  };

  const getUtilizationTextColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "text-red-700";
    if (percentage >= 80) return "text-yellow-700";
    if (percentage >= 60) return "text-green-700";
    return "text-yellow-700";
  };

  const getStatusLabel = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`;
    return "";
  };

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

  const isEditing = (memberId: string, projectId: string) =>
    editingTarget?.memberId === memberId &&
    editingTarget?.projectId === projectId;

  const ensureWeeklyInitialized = (
    memberId: string,
    projectId: string,
    weeksCount: number
  ) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          allocations: m.allocations.map((a) => {
            if (a.projectId !== projectId) return a;
            const has =
              Array.isArray(a.weeklyHours) &&
              a.weeklyHours.length === weeksCount;
            if (has) return a;
            const arr = Array.from({ length: weeksCount }, () => a.hours);
            return { ...a, weeklyHours: arr, linked: true };
          }),
        };
      })
    );
  };

  const updateAllocationWeeklyHour = (
    memberId: string,
    projectId: string,
    weekIndex: number,
    value: number,
    weeksCount: number
  ) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          allocations: m.allocations.map((a) => {
            if (a.projectId !== projectId) return a;
            const next = { ...a } as Required<
              NonNullable<Member["allocations"][number]>
            >;
            const base =
              next.weeklyHours && next.weeklyHours.length === weeksCount
                ? next.weeklyHours
                : Array.from({ length: weeksCount }, () => next.hours);
            const arr = [...base];
            const sanitized = Math.max(0, Number.isFinite(value) ? value : 0);
            // Monthly editing should be independent per week
            arr[weekIndex] = sanitized;
            next.weeklyHours = arr;
            return next;
          }),
        };
      })
    );
  };

  // Calculate total monthly capacity
  const totalMonthlyCapacity = members.reduce(
    (sum, m) => sum + m.capacity * 4,
    0
  );
  const totalMonthlyAllocated = members.reduce((sum, m) => {
    const weeklyAllocated = m.allocations.reduce(
      (s, a) => s + (a.weeklyHours?.[0] ?? a.hours),
      0
    );
    return sum + weeklyAllocated * 4;
  }, 0);
  const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated;

  return (
    <>
      {/* Capacity Overview */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Capacity Overview
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Total Monthly Capacity:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {totalMonthlyCapacity}h
            </span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-500">Monthly Allocated:</span>
            <span className="text-sm font-medium text-gray-900">
              {totalMonthlyAllocated}h
            </span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-500">Available:</span>
            <span className="text-sm font-medium text-green-600">
              {totalMonthlyAvailable}h
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <ConfirmationModal
          isOpen={Boolean(deletingTarget)}
          onClose={() => setDeletingTarget(null)}
          onConfirm={() => {
            if (!deletingTarget) return;
            const { memberId, projectId } = deletingTarget;
            setMembers((prev) =>
              prev.map((m) =>
                m.id !== memberId
                  ? m
                  : {
                      ...m,
                      allocations: m.allocations.filter(
                        (a) => a.projectId !== projectId
                      ),
                    }
              )
            );
            capacityStore.getState().removeProjectAllWeeks(memberId, projectId);
            setDeletingTarget(null);
          }}
          title="Delete Allocation"
          message="Are you sure you want to delete this allocation?"
          isLoading={false}
        />
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                RESOURCE
              </th>
              <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                MONTHLY CAPACITY
              </th>
              {weeksData.map((week) => (
                <th
                  key={week.weekNumber}
                  className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div>{week.weekNumber}</div>
                  <div className="text-xs text-gray-400">{week.label}</div>
                </th>
              ))}
              <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member, idx) => {
              const memberId = member.id;
              const isExpanded = expandedMembers.has(memberId);
              const totalAllocated = member.allocations.reduce(
                (sum, a) => sum + (a.weeklyHours?.[0] ?? a.hours),
                0
              );
              const utilizationPercentage =
                (totalAllocated / member.capacity) * 100;
              const statusLabel = getStatusLabel(
                totalAllocated,
                member.capacity
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
                            {member.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.jobTitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500">
                        {totalAllocated}/{member.capacity} h
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                          <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(totalAllocated, member.capacity)}`}
                              style={{
                                width: `${Math.min(utilizationPercentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            {Math.round(utilizationPercentage)}%
                          </span>
                          {statusLabel && (
                            <span
                              className={`text-xs font-medium whitespace-nowrap ${getUtilizationTextColor(totalAllocated, member.capacity)}`}
                            >
                              {statusLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {weeksData.map((week, weekIdx) => {
                      const weekKey = week.startDate;
                      const weeklyAllocation = member.allocations.reduce(
                        (s, a) => {
                          const st = capacityStore
                            .getState()
                            .getWeekState(memberId, a.projectId, weekKey);
                          if (st) {
                            const sum = st.dailyHours.reduce(
                              (acc, v) => acc + v,
                              0
                            );
                            return s + sum;
                          }
                          return s + (a.weeklyHours?.[weekIdx] ?? a.hours);
                        },
                        0
                      );
                      return (
                        <td
                          key={week.weekNumber}
                          className="px-4 py-4 text-center"
                        >
                          <div
                            className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(weeklyAllocation, member.capacity)}`}
                          >
                            {weeklyAllocation}h
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center"></td>
                  </tr>

                  {/* Expanded Project Rows */}
                  {isExpanded &&
                    member.allocations.map((allocation) => (
                      <tr key={allocation.projectId} className="bg-gray-25">
                        <td className="px-6 py-3 pl-12">
                          <div className="font-medium text-gray-700 cursor-pointer hover:text-orange-600">
                            {allocation.projectName}
                          </div>
                        </td>
                        <td className="px-4 py-3"></td>
                        {weeksData.map((week, weekIdx) => {
                          const weekKey = week.startDate;
                          const weekState = capacityStore
                            .getState()
                            .getWeekState(
                              memberId,
                              allocation.projectId,
                              weekKey
                            );
                          const linked = weekState ? weekState.linked : true;
                          const weekTotal = weekState
                            ? weekState.dailyHours.reduce(
                                (acc, v) => acc + v,
                                0
                              )
                            : (allocation.weeklyHours?.[weekIdx] ??
                              allocation.hours);
                          return (
                            <td
                              key={week.weekNumber}
                              className="px-4 py-3 text-center"
                            >
                              {isEditing(memberId, allocation.projectId) ? (
                                linked ? (
                                  <input
                                    type="number"
                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
                                    value={weekTotal}
                                    min={0}
                                    onChange={(e) => {
                                      const val = Math.max(
                                        0,
                                        Number(e.target.value)
                                      );
                                      updateAllocationWeeklyHour(
                                        memberId,
                                        allocation.projectId,
                                        weekIdx,
                                        val,
                                        weeksData.length
                                      );
                                      capacityStore
                                        .getState()
                                        .getOrInit(
                                          memberId,
                                          allocation.projectId,
                                          weekKey,
                                          val,
                                          false
                                        );
                                      capacityStore
                                        .getState()
                                        .setWeekTotal(
                                          memberId,
                                          allocation.projectId,
                                          weekKey,
                                          val
                                        );
                                    }}
                                  />
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    {weekTotal}h
                                  </span>
                                )
                              ) : (
                                <span className="text-sm text-gray-600">
                                  {weekTotal}h
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-3">
                            <button
                              className={`$${""} text-gray-600 hover:text-gray-800`}
                              title={
                                isEditing(memberId, allocation.projectId)
                                  ? "Stop editing"
                                  : "Edit allocation"
                              }
                              onClick={() => {
                                ensureWeeklyInitialized(
                                  memberId,
                                  allocation.projectId,
                                  weeksData.length
                                );
                                setEditingTarget((prev) =>
                                  prev &&
                                  prev.memberId === memberId &&
                                  prev.projectId === allocation.projectId
                                    ? null
                                    : {
                                        memberId,
                                        projectId: allocation.projectId,
                                      }
                                );
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingTarget({
                                  memberId,
                                  projectId: allocation.projectId,
                                })
                              }
                              className="text-red-600 hover:text-red-800"
                              title="Remove allocation"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {/* Add Project Row */}
                  {isExpanded && (
                    <tr>
                      <td
                        className="px-6 py-3 pl-12"
                        colSpan={weeksData.length + 3}
                      >
                        <button
                          onClick={() => {
                            setAddModalTarget(memberId);
                            setAddForm({ projectName: "", hours: 1 });
                          }}
                          className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Project
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {addModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Project
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={addForm.projectName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, projectName: e.target.value }))
                  }
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours per week
                </label>
                <input
                  type="number"
                  className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
                  min={0}
                  value={addForm.hours}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      hours: Math.max(0, Number(e.target.value)),
                    }))
                  }
                />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                onClick={() => setAddModalTarget(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                onClick={() => {
                  if (!addModalTarget || !addForm.projectName.trim()) {
                    setAddModalTarget(null);
                    return;
                  }
                  const id = `p-${Date.now()}`;
                  setMembers((prev) =>
                    prev.map((m) =>
                      m.id !== addModalTarget
                        ? m
                        : {
                            ...m,
                            allocations: [
                              ...m.allocations,
                              {
                                projectId: id,
                                projectName: addForm.projectName.trim(),
                                hours: addForm.hours,
                                weeklyHours: Array.from(
                                  { length: weeksData.length },
                                  () => addForm.hours
                                ),
                                linked: true,
                              },
                            ],
                          }
                    )
                  );
                  setAddModalTarget(null);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
