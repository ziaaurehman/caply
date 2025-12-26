"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Link2,
  Unlink,
  Trash,
  Pencil,
} from "lucide-react";
import {
  CapacityOverview,
  ResourceAllocation,
  capacityAPI,
} from "@/utils/api/capacity";
import {
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  useMonthlyCapacity,
  useUpsertWeeklyPlan,
  useUpsertDailyOverrides,
} from "@/lib/hooks/useCapacity";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast } from "sonner";

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
  viewMode?: "weekly" | "monthly";
  selectedMonth?: number;
  selectedYear?: number;
  selectedWeek?: string;
}

interface WeekData {
  weekNumber: string;
  startDate: string;
  endDate: string;
  label: string;
}

interface DayData {
  dayName: string;
  date: string;
  dayOfWeek: number; // 0-6 where 0 is Sunday
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
  viewMode = "monthly",
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  selectedWeek = "",
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
  const [editingAllocationHeaderId, setEditingAllocationHeaderId] = useState<
    string | null
  >(null);
  const [editingAllocationHeaderValue, setEditingAllocationHeaderValue] =
    useState<string>("");
  const [addProjectMemberId, setAddProjectMemberId] = useState<string | null>(
    null
  );
  const [addProjectMemberName, setAddProjectMemberName] = useState<string>("");

  // Per-allocation link/unlink state (true = linked, default)
  const [allocationLinkState, setAllocationLinkState] = useState<
    Record<string, boolean>
  >({});

  // Track which allocation and which week index is being edited
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);

  // Monthly data fetched from server when viewMode === 'monthly'
  const [monthlyWeeks, setMonthlyWeeks] = useState<string[]>([]);

  // React Query mutations for allocations
  const createAllocationMutation = useCreateAllocation();
  const updateAllocationMutation = useUpdateAllocation();
  const deleteAllocationMutation = useDeleteAllocation();

  // New capacity v2 hooks
  const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const { data: monthlyCapacityData, isLoading: monthlyLoading } =
    useMonthlyCapacity(organizationId || "", organizationId || "", monthStr, { only_active: true });
  const upsertWeeklyPlanMutation = useUpsertWeeklyPlan();
  const upsertDailyOverridesMutation = useUpsertDailyOverrides();

  // Process monthly capacity data for easy lookup
  const monthlyByOrgMember = useMemo(() => {
    if (!monthlyCapacityData?.resources) return {};
    const lookup: Record<string, any> = {};
    monthlyCapacityData.resources.forEach((resource: any) => {
      const weeksMap: Record<string, any> = {};
      resource.weeks.forEach((week: any) => {
        weeksMap[week.week_start_date] = week;
      });
      lookup[resource.organization_member_id] = {
        ...resource,
        weeks: weeksMap,
      };
    });
    return lookup;
  }, [monthlyCapacityData]);

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

  // Fetch monthly data when in monthly view
  React.useEffect(() => {
    async function loadMonthly() {
      if (viewMode !== "monthly" || !organizationId) return;
      const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`;
      try {
        const resp = await capacityAPI.getMonthly(organizationId, organizationId, monthStr, {
          only_active: true,
        });
        const weekKeys = (resp.weeks || []).map((w: any) => w.week_start_date);
        const map: any = {};
        (resp.resources || []).forEach((r: any) => {
          const orgMemberId = r.organization_member_id;
          const wkMap: any = {};
          (r.weeks || []).forEach((w: any) => {
            const pMap: any = {};
            (w.projects || []).forEach((p: any) => {
              if (p?.project?.id) {
                pMap[p.project.id] = {
                  weekly_hours: Number(p.weekly_hours || 0),
                  allow_weekends: !!p.allow_weekends,
                  default_hours_per_day: Number(p.default_hours_per_day || 0),
                };
              }
            });
            wkMap[w.week_start_date] = {
              used: Number(w.used || 0),
              total: Number(w.total || 0),
              projects: pMap,
            };
          });
          map[String(orgMemberId)] = {
            weekly_capacity_hours: Number(r.weekly_capacity_hours || 40),
            weeks: wkMap,
          };
        });
        setMonthlyWeeks(weekKeys);
      } catch (_e) {
        // ignore
      }
    }
    loadMonthly();
  }, [viewMode, organizationId, selectedMonth, selectedYear]);

  // Generate weeks data based on view mode and selected month/year
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];

    if (viewMode === "monthly") {
      // For monthly view, show 7 days (MON-SUN) just like weekly view
      // Use the first week of the month as the reference
      const monthStart = new Date(selectedYear, selectedMonth, 1);

      // Get the first Monday of the month (or previous Monday if month starts mid-week)
      const firstMonday = new Date(monthStart);
      const dayOfWeek = monthStart.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      firstMonday.setDate(monthStart.getDate() - daysToSubtract);

      // Generate 7 days starting from Monday
      const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(firstMonday);
        currentDay.setDate(firstMonday.getDate() + i);

        weeks.push({
          weekNumber: dayNames[i],
          startDate: currentDay.toISOString(),
          endDate: currentDay.toISOString(),
          label: `${String(currentDay.getDate()).padStart(2, "0")}`,
        });
      }
    } else if (viewMode === "weekly") {
      // For weekly view, show days of the week (SUN-SAT)
      if (selectedWeek) {
        const weekStart = new Date(selectedWeek);
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(weekStart);
          currentDay.setDate(weekStart.getDate() + i);

          weeks.push({
            weekNumber: dayNames[i],
            startDate: currentDay.toISOString(),
            endDate: currentDay.toISOString(),
            label: `${String(currentDay.getDate()).padStart(2, "0")}`,
          });
        }
      }
    }

    return weeks;
  }, [viewMode, selectedMonth, selectedYear, selectedWeek]);

  const toDateOnly = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().slice(0, 10);
  };

  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  const weekOverlapsAllocation = (
    week: WeekData,
    allocation: ResourceAllocation
  ) => {
    const wStart = new Date(week.startDate);
    const wEnd = new Date(week.endDate);
    const aStart = new Date(allocation.start_date);
    const aEnd = allocation.end_date
      ? new Date(allocation.end_date)
      : undefined;
    return (!aEnd || aEnd >= wStart) && aStart <= wEnd;
  };

  const getOrganizationMemberIdFromAllocation = (
    allocation: ResourceAllocation
  ): string | undefined => {
    return (
      (allocation as any)?.organization_member_id ||
      (allocation as any)?.resource_allocations?.organization_member_id ||
      (allocation as any)?.project_member_id ||
      undefined
    );
  };

  const updateSingleWeekCapacity = async (
    allocation: ResourceAllocation,
    week: WeekData,
    newHoursPerWeek: number,
    memberId: string
  ) => {
    if (!organizationId) return;

    const overlaps = weekOverlapsAllocation(week, allocation);
    const originalHours = allocation.hours_per_week || 0;
    const orgMemberId = getOrganizationMemberIdFromAllocation(allocation);

    // If no overlap, just create a new allocation for that week
    if (!overlaps) {
      if (!orgMemberId)
        throw new Error("Missing member id for creating allocation");
      await createAllocationMutation.mutateAsync({
        organization_id: organizationId,
        project_id: allocation.project_id,
        organization_member_id: String(orgMemberId),
        hours_per_week: newHoursPerWeek,
        start_date: toDateOnly(new Date(week.startDate)),
        end_date: toDateOnly(new Date(week.endDate)),
      } as any);
      return;
    }

    // Split allocation into up to three parts: pre-week, week, post-week
    const aStart = new Date(allocation.start_date);
    const aEnd = allocation.end_date
      ? new Date(allocation.end_date)
      : undefined;
    const wStart = new Date(week.startDate);
    const wEnd = new Date(week.endDate);

    const preStart = aStart;
    const preEnd = addDays(wStart, -1);
    const hasPre =
      preStart <= preEnd &&
      (!aEnd || preEnd <= (aEnd as Date)) &&
      preStart <= (aEnd || preEnd);

    const postStart = addDays(wEnd, 1);
    const postEnd = aEnd;
    const hasPost =
      (!aEnd || postStart <= (aEnd as Date)) && postStart >= aStart;

    // 1) Update the existing allocation to be the week segment with new hours
    await updateAllocationMutation.mutateAsync({
      id: allocation.id,
      data: {
        start_date: toDateOnly(wStart),
        end_date: toDateOnly(wEnd),
        hours_per_week: newHoursPerWeek,
      } as any,
      organizationId,
    });

    // 2) Create pre segment if needed (original hours)
    if (hasPre) {
      if (!orgMemberId)
        throw new Error("Missing member id for creating pre segment");
      await createAllocationMutation.mutateAsync({
        organization_id: organizationId,
        project_id: allocation.project_id,
        organization_member_id: String(orgMemberId),
        hours_per_week: originalHours,
        start_date: toDateOnly(preStart),
        end_date: toDateOnly(preEnd),
      } as any);
    }

    // 3) Create post segment if needed (original hours)
    if (hasPost && postEnd) {
      if (!orgMemberId)
        throw new Error("Missing member id for creating post segment");
      await createAllocationMutation.mutateAsync({
        organization_id: organizationId,
        project_id: allocation.project_id,
        organization_member_id: String(orgMemberId),
        hours_per_week: originalHours,
        start_date: toDateOnly(postStart),
        end_date: toDateOnly(postEnd),
      } as any);
    }
  };

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
          .catch(() => { });
      }
    }
    setExpandedMembers(newExpanded);
  };

  const getUtilizationColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "bg-red-500"; // Overallocated
    if (percentage >= 80) return "bg-yellow-500"; // Near capacity
    if (percentage >= 60) return "bg-green-500"; // Optimal
    return "bg-yellow-500"; // Underutilized
  };

  const getUtilizationTextColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "text-red-700"; // Overallocated
    if (percentage >= 80) return "text-yellow-700"; // Near capacity
    if (percentage >= 60) return "text-green-700"; // Optimal
    return "text-yellow-700"; // Underutilized
  };

  const getStatusLabel = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`;
    return "";
  };

  // Group members by user
  const groupedMembers = useMemo(() => {
    // Use monthly capacity data when in monthly view mode
    if (viewMode === "monthly" && monthlyCapacityData?.resources) {
      return monthlyCapacityData.resources.map((resource: any) => ({
        id: resource.user.id,
        user: resource.user,
        role: resource.user.job_title || "Member",
        capacity: resource.weekly_capacity_hours,
        allocations: [], // We'll get project details from weeks data
        totalAllocated: 0, // Will be calculated per week
        entries: 1,
        orgMemberId: resource.organization_member_id,
        monthlyResource: resource, // Store the full resource data
      }));
    }

    // Fallback to original logic for other view modes
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
  }, [localCapacityOverview, localAllocations, viewMode, monthlyCapacityData]);

  const getAllocationForWeek = (
    memberAllocations: ResourceAllocation[],
    weekData: WeekData,
    member?: any
  ) => {
    // Monthly view: use monthly capacity data
    if (viewMode === "monthly" && member?.monthlyResource) {
      const weekStartDate = toDateOnly(new Date(weekData.startDate));
      const weekInfo = member.monthlyResource.weeks.find(
        (w: any) => w.week_start_date === weekStartDate
      );
      return weekInfo ? weekInfo.used : 0;
    }

    // Fallback to original logic for other view modes
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

  // Update a week's value using new weekly plan + daily overrides model (monthly view)
  const updateWeekCapacityNewModel = async (
    allocation: ResourceAllocation,
    week: WeekData,
    newWeeklyHours: number
  ) => {
    if (!organizationId) return;
    const orgMemberId = getOrganizationMemberIdFromAllocation(allocation) as
      | string
      | undefined;
    const weekStartDate = toDateOnly(new Date(week.startDate));
    // Determine weekends allowance from monthly snapshot if available, default to false
    const rec = orgMemberId
      ? monthlyByOrgMember[String(orgMemberId)]
      : undefined;
    const projInfo =
      rec?.weeks?.[weekStartDate]?.projects?.[allocation.project_id];
    const allowWeekends = projInfo?.allow_weekends ?? false;
    const days = allowWeekends ? 7 : 5;

    // 1) Ensure weekly plan exists and get id
    const up = await capacityAPI.upsertWeeklyPlan(organizationId, {
      resource_allocation_id: allocation.resource_allocation_id,
      project_id: allocation.project_id,
      week_start_date: weekStartDate,
      default_hours_per_day: newWeeklyHours / days,
      allow_weekends: allowWeekends,
      is_linked: false, // we will write explicit daily overrides for this edit
    });

    const weeklyPlanId = up.weekly_plan_id;
    // 2) Write daily overrides evenly across days
    const perDay = newWeeklyHours / days;
    const overrides = Array.from({ length: days }, (_v, i) => ({
      day_of_week: i + 1,
      actual_hours: perDay,
    }));
    await capacityAPI.upsertDailyOverrides(organizationId, {
      weekly_plan_id: weeklyPlanId,
      overrides,
      unlink_week: true,
    });
  };

  // Helper function to get project's allow_weekends setting
  const getProjectAllowWeekends = (
    allocation: ResourceAllocation,
    week: WeekData,
    member?: any
  ): boolean => {
    if (viewMode === "monthly" && member?.monthlyResource) {
      const weekStartDate = toDateOnly(new Date(week.startDate));
      const weekInfo = member.monthlyResource.weeks.find(
        (w: any) => w.week_start_date === weekStartDate
      );
      if (weekInfo) {
        const projectInfo = weekInfo.projects?.find(
          (p: any) => p.project?.id === allocation.project_id
        );
        return projectInfo?.allow_weekends ?? false;
      }
    }
    return false;
  };

  return (
    <div className="overflow-x-auto">
      {/* Loading state for monthly view */}
      {viewMode === "monthly" && monthlyLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading monthly capacity data...</div>
        </div>
      )}

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
            console.log("Calling deleteAllocation mutation...");
            await deleteAllocationMutation.mutateAsync({
              id: deletingId,
              organizationId: organizationId!,
            });
            console.log("Delete mutation successful");

            setDeletingId(null);
            // React Query invalidation will refresh data; local UI already updated optimistically
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
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              RESOURCE
            </th>
            <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              WEEKLY CAPACITY
            </th>
            {weeksData.map((week) => {
              const isWeekend =
                week.weekNumber === "SUN" || week.weekNumber === "SAT";
              return (
                <th
                  key={week.weekNumber}
                  className={`text-center px-4 py-4 text-xs font-medium tracking-wider ${isWeekend ? "text-gray-300" : "text-gray-500 uppercase"
                    }`}
                >
                  <div>{week.weekNumber}</div>
                  <div
                    className={`text-xs ${isWeekend ? "text-gray-300" : "text-gray-400"}`}
                  >
                    {week.label}
                  </div>
                </th>
              );
            })}
            <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
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
                      {/* Toggle moved to each project row */}
                    </div>
                  </td>
                  {weeksData.map((week) => {
                    const isWeekend =
                      week.weekNumber === "SUN" || week.weekNumber === "SAT";

                    // For member header row, always show '-' for weekends
                    // Individual projects will show their own weekend hours based on allow_weekends
                    if (isWeekend) {
                      return (
                        <td
                          key={week.weekNumber}
                          className="px-4 py-4 text-center bg-gray-50 opacity-50"
                        >
                          <div className="text-gray-300 text-sm">-</div>
                        </td>
                      );
                    }

                    let weekAllocation;
                    if (viewMode === "weekly") {
                      weekAllocation = 8; // 8 hours for weekdays
                    } else {
                      weekAllocation = getAllocationForWeek(
                        member.allocations,
                        week,
                        member
                      );
                    }

                    return (
                      <td
                        key={week.weekNumber}
                        className="px-4 py-4 text-center relative group cursor-pointer"
                        onClick={() => {
                          onWeekCellClick?.({
                            userId: member.user.id,
                            week,
                            member,
                            allocations: member.allocations,
                          });
                        }}
                      >
                        <>
                          <div
                            className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(weekAllocation, 8)}`}
                          >
                            {weekAllocation}h
                          </div>
                          {/* Tooltip */}
                          <div className="invisible  group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="font-medium">
                              {viewMode === "weekly"
                                ? week.weekNumber
                                : `Week ${week.weekNumber}`}
                            </div>
                            <div>Allocated: {weekAllocation}h</div>
                            <div>
                              Capacity:{" "}
                              {viewMode === "weekly" ? 8 : member.capacity}h
                            </div>
                            {viewMode === "weekly" ? (
                              <div>Available: {8 - weekAllocation}h</div>
                            ) : (
                              <div>
                                Available: {member.capacity - weekAllocation}h
                              </div>
                            )}
                          </div>
                        </>
                      </td>
                    );
                  })}
                  {/* blank cell for actions column alignment */}
                  <td className="px-4 py-4" />
                </tr>

                {/* Project Allocation Rows (when expanded) */}
                {isExpanded &&
                  member.allocations.map((allocation) => (
                    <tr key={allocation.id} className="bg-white">
                      <td className="px-6 py-3 pl-16">
                        <div className="flex items-center">
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
                          {editingAllocationHeaderId === allocation.id ? (
                            <input
                              type="number"
                              className="w-24 px-2 py-1 border rounded text-center"
                              value={editingAllocationHeaderValue}
                              onChange={(e) =>
                                setEditingAllocationHeaderValue(e.target.value)
                              }
                              step={0.5}
                              min={0}
                              max={168}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  const newVal = Number(
                                    editingAllocationHeaderValue || 0
                                  );
                                  try {
                                    const isLinked =
                                      allocationLinkState[allocation.id] !==
                                      false;
                                    if (isLinked && viewMode !== "monthly") {
                                      const orgMemberId =
                                        getOrganizationMemberIdFromAllocation(
                                          allocation
                                        );
                                      const sameProjectAllocations =
                                        member.allocations.filter(
                                          (a) =>
                                            a.project_id ===
                                            allocation.project_id &&
                                            getOrganizationMemberIdFromAllocation(
                                              a
                                            ) === orgMemberId
                                        );
                                      await Promise.allSettled(
                                        sameProjectAllocations.map((a) =>
                                          updateAllocationMutation.mutateAsync({
                                            id: a.id,
                                            data: {
                                              hours_per_week: newVal,
                                            } as any,
                                            organizationId: organizationId!,
                                          })
                                        )
                                      );
                                    } else if (viewMode !== "monthly") {
                                      await updateAllocationMutation.mutateAsync(
                                        {
                                          id: allocation.id,
                                          data: {
                                            hours_per_week: newVal,
                                          } as any,
                                          organizationId: organizationId!,
                                        }
                                      );
                                    } else {
                                      await updateAllocationMutation.mutateAsync(
                                        {
                                          id: allocation.id,
                                          data: {
                                            hours_per_week: newVal,
                                          } as any,
                                          organizationId: organizationId!,
                                        }
                                      );
                                    }
                                  } catch (err) {
                                    toast.error(
                                      "Failed to update capacity. Please try again."
                                    );
                                  } finally {
                                    setEditingAllocationHeaderId(null);
                                    onRefresh?.();
                                  }
                                } else if (e.key === "Escape") {
                                  setEditingAllocationHeaderId(null);
                                }
                              }}
                              onBlur={async () => {
                                const newVal = Number(
                                  editingAllocationHeaderValue || 0
                                );
                                try {
                                  const isLinked =
                                    allocationLinkState[allocation.id] !==
                                    false;
                                  if (isLinked && viewMode !== "monthly") {
                                    const orgMemberId =
                                      getOrganizationMemberIdFromAllocation(
                                        allocation
                                      );
                                    const sameProjectAllocations =
                                      member.allocations.filter(
                                        (a) =>
                                          a.project_id ===
                                          allocation.project_id &&
                                          getOrganizationMemberIdFromAllocation(
                                            a
                                          ) === orgMemberId
                                      );
                                    await Promise.allSettled(
                                      sameProjectAllocations.map((a) =>
                                        updateAllocationMutation.mutateAsync({
                                          id: a.id,
                                          data: {
                                            hours_per_week: newVal,
                                          } as any,
                                          organizationId: organizationId!,
                                        })
                                      )
                                    );
                                  } else {
                                    await updateAllocationMutation.mutateAsync({
                                      id: allocation.id,
                                      data: { hours_per_week: newVal } as any,
                                      organizationId: organizationId!,
                                    });
                                  }
                                } catch (err) {
                                  toast.error(
                                    "Failed to update capacity. Please try again."
                                  );
                                } finally {
                                  setEditingAllocationHeaderId(null);
                                  onRefresh?.();
                                }
                              }}
                            />
                          ) : (
                            <span>{allocation.hours_per_week}h / week</span>
                          )}
                        </div>
                      </td>
                      {/* Tasks column */}

                      {weeksData.map((week, i) => {
                        const isWeekend =
                          week.weekNumber === "SUN" || week.weekNumber === "SAT";
                        const allowWeekends = getProjectAllowWeekends(
                          allocation,
                          week,
                          member
                        );
                        const shouldShowHours = !isWeekend || allowWeekends;
                        const days = allowWeekends ? 7 : 5;
                        const hoursPerDay = allocation.hours_per_week / days;

                        return (
                          <td
                            key={week.weekNumber}
                            className={`px-4 py-3 text-center ${isWeekend && !allowWeekends
                              ? "bg-gray-50 opacity-50"
                              : ""
                              }`}
                          >
                            {!shouldShowHours ? (
                              <span className="text-gray-300 text-sm">-</span>
                            ) : editingId === allocation.id &&
                              editingWeekIndex === i ? (
                              <input
                                type="number"
                                className="w-20 px-2 py-1 border rounded text-center"
                                value={editingHours}
                                onChange={(e) => setEditingHours(e.target.value)}
                                step={0.5}
                                min={0}
                                max={168}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    const newVal = Number(editingHours || 0);
                                    try {
                                      const isLinked =
                                        allocationLinkState[allocation.id] !==
                                        false; // default linked
                                      if (isLinked) {
                                        // Update all allocations for this member & project
                                        const orgMemberId =
                                          getOrganizationMemberIdFromAllocation(
                                            allocation
                                          );
                                        const sameProjectAllocations =
                                          member.allocations.filter(
                                            (a) =>
                                              a.project_id ===
                                              allocation.project_id &&
                                              getOrganizationMemberIdFromAllocation(
                                                a
                                              ) === orgMemberId
                                          );
                                        await Promise.allSettled(
                                          sameProjectAllocations.map((a) =>
                                            updateAllocationMutation.mutateAsync({
                                              id: a.id,
                                              data: {
                                                hours_per_week: newVal,
                                              } as any,
                                              organizationId: organizationId!,
                                            })
                                          )
                                        );
                                      } else {
                                        await updateSingleWeekCapacity(
                                          allocation,
                                          week,
                                          newVal,
                                          memberId
                                        );
                                      }
                                    } catch (err) {
                                      toast.error(
                                        "Failed to update capacity. Please try again."
                                      );
                                    } finally {
                                      setEditingId(null);
                                      setEditingWeekIndex(null);
                                      onRefresh?.();
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingId(null);
                                    setEditingWeekIndex(null);
                                  }
                                }}
                                onBlur={async () => {
                                  const newVal = Number(editingHours || 0);
                                  try {
                                    const isLinked =
                                      allocationLinkState[allocation.id] !==
                                      false;
                                    if (isLinked) {
                                      const orgMemberId =
                                        getOrganizationMemberIdFromAllocation(
                                          allocation
                                        );
                                      const sameProjectAllocations =
                                        member.allocations.filter(
                                          (a) =>
                                            a.project_id ===
                                            allocation.project_id &&
                                            getOrganizationMemberIdFromAllocation(
                                              a
                                            ) === orgMemberId
                                        );
                                      await Promise.allSettled(
                                        sameProjectAllocations.map((a) =>
                                          capacityAPI.updateAllocation(
                                            a.id,
                                            { hours_per_week: newVal } as any,
                                            organizationId
                                          )
                                        )
                                      );
                                    } else if (viewMode !== "monthly") {
                                      await updateSingleWeekCapacity(
                                        allocation,
                                        week,
                                        newVal,
                                        memberId
                                      );
                                    } else {
                                      await updateWeekCapacityNewModel(
                                        allocation,
                                        week,
                                        newVal
                                      );
                                    }
                                  } catch (err) {
                                    toast.error(
                                      "Failed to update capacity. Please try again."
                                    );
                                  } finally {
                                    setEditingId(null);
                                    setEditingWeekIndex(null);
                                    onRefresh?.();
                                  }
                                }}
                              />
                            ) : (
                              <button
                                className="text-sm text-gray-600 hover:text-gray-900"
                                title="Click to edit hours"
                                onClick={() => {
                                  setEditingId(allocation.id);
                                  setEditingWeekIndex(i);
                                  setEditingHours(String(hoursPerDay.toFixed(1)));
                                }}
                              >
                                {hoursPerDay.toFixed(1)}h
                              </button>
                            )}
                          </td>
                        );
                      })}
                      {/* Actions column */}
                      <td className="px-2 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="p-2 rounded hover:bg-gray-100 text-gray-600"
                            title="Edit hours/week"
                            onClick={() => {
                              setEditingAllocationHeaderId(allocation.id);
                              setEditingAllocationHeaderValue(
                                String(allocation.hours_per_week)
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 rounded hover:bg-gray-100 text-gray-600"
                            title={
                              allocationLinkState[allocation.id] === false
                                ? "Unlinked: edit a single week"
                                : "Linked: edit updates all weeks"
                            }
                            onClick={() =>
                              setAllocationLinkState((prev) => ({
                                ...prev,
                                [allocation.id]:
                                  prev[allocation.id] === false ? true : false,
                              }))
                            }
                          >
                            {allocationLinkState[allocation.id] === false ? (
                              <Unlink className="h-4 w-4" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="p-2 rounded hover:bg-gray-100 text-red-600"
                            title="Remove from project"
                            onClick={() => setDeletingId(allocation.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
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
          onClose={() => setAddProjectMemberId(null)}
          onCreated={() => {
            setAddProjectMemberId(null);
            onRefresh?.();
          }}
          organizationId={organizationId!}
          projects={projects}
          memberName={addProjectMemberName}
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
}: {
  memberId: string;
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
  projects: Array<{ id: string; name: string }>;
  memberName: string;
  isOpen: boolean;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState<number>(8); // Default 8 hours per day
  const [allowWeekends, setAllowWeekends] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="font-semibold">Add Project Assignment</div>
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
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
          <div className="flex items-center gap-2">
            <input
              id="allow-weekends"
              type="checkbox"
              className="h-4 w-4"
              checked={allowWeekends}
              onChange={(e) => setAllowWeekends(e.target.checked)}
            />
            <label htmlFor="allow-weekends" className="text-sm text-gray-700">
              Allow weekends
            </label>
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
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
            disabled={!projectId || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const hoursPerWeek = Math.round(hoursPerDay * 5 * 100) / 100; // default 5 days/week
                const allowWeekends = (
                  document.getElementById("allow-weekends") as HTMLInputElement
                )?.checked;
                const computedWeek =
                  Math.round(hoursPerDay * (allowWeekends ? 7 : 5) * 100) / 100;
                await capacityAPI.createAllocation({
                  organization_id: organizationId,
                  project_id: projectId,
                  organization_member_id: memberId,
                  hours_per_week: computedWeek,
                  start_date: startDate,
                  default_hours_per_day: hoursPerDay,
                  allow_weekends: !!allowWeekends,
                });
                onCreated();
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            Add Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
