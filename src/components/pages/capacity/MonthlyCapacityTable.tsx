"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, Trash, Pencil } from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { capacityStore } from "@/lib/stores/capacityStore";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startOfWeek,
  startOfDay,
  isSameDay,
  parseISO,
  isValid,
  eachDayOfInterval,
  isWeekend,
  startOfMonth,
  endOfMonth,
  isPast,
  isToday,
  addDays,
  getDay,
} from "date-fns";
import { toast } from "sonner";

interface ResourceAllocation {
  id: string;
  organizationMemberId: string;
  weeklyCapacityHours: number;
  hourlyRate?: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  organization_members: {
    id: string;
    user_id: string;
    status: string;
    roles?: { id: string; name: string };
    users: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
      position?: string;
    };
  } | null;
}

interface ProjectAssignment {
  id: string;
  projectId: string;
  projectName: string;
  resourceAllocationId: string;
  hoursPerWeek: number;
  defaultHoursPerDay: number;
  allowWeekends: boolean;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

interface ProjectWeeklyPlan {
  id: string;
  resourceAllocationId: string;
  projectId: string;
  projectAssignmentId: string;
  weekStartDate: string;
  hoursSunday: number | null;
  hoursMonday: number | null;
  hoursTuesday: number | null;
  hoursWednesday: number | null;
  hoursThursday: number | null;
  hoursFriday: number | null;
  hoursSaturday: number | null;
}

interface Member {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl?: string;
  capacity: number; // Daily capacity
  allocations: Array<{
    projectId: string;
    projectName: string;
    hours: number; // Default weekly hours
    weeklyHours: number[]; // per week allocations aligned with weeksData
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

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface AddProjectForm {
  projectId: string;
  hours: number;
  includeWeekends: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
}

const fetchResources = async (
  organizationId: string
): Promise<ResourceAllocation[]> => {
  if (!organizationId) throw new Error("Organization ID is required");

  const response = await fetch(
    `/api/capacity/resources?organizationId=${organizationId}&only_active=true`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status}`);
  }

  const data = await response.json();
  return data.resources || [];
};

const fetchProjectAssignments = async (
  organizationId: string
): Promise<ProjectAssignment[]> => {
  if (!organizationId) return [];

  const response = await fetch(
    `/api/capacity/project-assignments?organizationId=${organizationId}`
  );
  if (!response.ok) throw new Error("Failed to fetch project assignments");
  const data = await response.json();
  return data.assignments || [];
};

const fetchWeeklyPlansForMonth = async (
  organizationId: string,
  month: number,
  year: number
): Promise<ProjectWeeklyPlan[]> => {
  if (!organizationId) return [];

  // Fetch weekly plans for the month
  const response = await fetch(
    `/api/capacity/weekly-plans?organizationId=${organizationId}&month=${month}&year=${year}`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.weeklyPlans || [];
};

const fetchProjects = async (organizationId: string): Promise<Project[]> => {
  const response = await fetch(
    `/api/projects?organizationId=${organizationId}`
  );
  if (!response.ok) throw new Error("Failed to fetch projects");
  const data = await response.json();
  return data.projects || [];
};

export default function MonthlyCapacityTable({
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  onAddResource,
}: MonthlyCapacityTableProps) {
  const queryClient = useQueryClient();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const { currentOrganization } = useOrganizationStore();
  const [deletingTarget, setDeletingTarget] = useState<{
    memberId: string;
    projectId: string;
    assignmentId?: string; // Add this to store assignment ID
    projectName?: string; // Add this for better confirmation message
  } | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    memberId: string;
    projectId: string;
  } | null>(null);
  const [addModalTarget, setAddModalTarget] = useState<string | null>(null); // memberId
  const [addForm, setAddForm] = useState<AddProjectForm>({
    projectId: "",
    hours: 8,
    includeWeekends: false,
    startDate: new Date().toISOString().split("T")[0],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentOrganization?.id],
    queryFn: () => fetchProjects(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
  });

  const formatDateForDisplay = (date: Date): string => {
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
    return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]}`;
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const startStr = formatDateForDisplay(startDate);
    const endStr = formatDateForDisplay(endDate);
    return `${startStr} - ${endStr}`;
  };

  // Generate weeks for the selected month
  const weeksData: WeekData[] = useMemo(() => {
    const weeks: WeekData[] = [];
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    let currentWeekStart = new Date(monthStart);
    let weekCount = 0;
    while (currentWeekStart <= monthEnd && weekCount < 6) {
      const dayOfWeek = currentWeekStart.getDay();

      const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const daysUntilSunday = 6 - mondayBasedDay;

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + daysUntilSunday);
      const actualWeekEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

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
      const startDateStr = `${String(currentWeekStart.getDate()).padStart(2, "0")} ${monthNames[currentWeekStart.getMonth()]}`;

      weeks.push({
        weekNumber,
        startDate: currentWeekStart.toISOString(),
        endDate: actualWeekEnd.toISOString(),
        label: startDateStr,
      });

      // Next week starts on the Monday after this week's Sunday
      const nextWeekStart = new Date(actualWeekEnd);
      nextWeekStart.setDate(actualWeekEnd.getDate() + 1);

      // If next week start is beyond month end, break
      if (nextWeekStart > monthEnd) {
        break;
      }

      currentWeekStart = nextWeekStart;
      weekCount++;
    }

    return weeks;
  }, [selectedMonth, selectedYear]);

  const {
    data: resources,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: ["resources", currentOrganization?.id],
    queryFn: () => fetchResources(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectAssignments = [], isLoading: assignmentsLoading } =
    useQuery({
      queryKey: ["project-assignments", currentOrganization?.id],
      queryFn: () => fetchProjectAssignments(currentOrganization?.id || ""),
      enabled: !!currentOrganization?.id,
      staleTime: 5 * 60 * 1000,
    });

  const addProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await fetch("/api/capacity/project-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add project assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the queries to show the new assignment
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-plans"] });
      toast.success("Project assignment added successfully!");
      setAddForm({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
      });
      setAddModalTarget(null);
    },
    onError: (error: Error) => {
      console.error("Project assignment error:", error);
      toast.error(error.message || "Failed to add project assignment");
    },
  });

  const deleteProjectAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(
        `/api/capacity/project-assignments?assignmentId=${assignmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to delete project assignment"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh both queries to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-plans"] });
      toast.success("Project assignment deleted successfully!");
      setDeletingTarget(null);
    },
    onError: (error: Error) => {
      console.error("Delete project assignment error:", error);
      toast.error(error.message || "Failed to delete project assignment");
    },
  });

  // const handleAddProject = async () => {
  //   if (!addModalTarget || !addForm.projectId) {
  //     setAddModalTarget(null);
  //     return;
  //   }

  //   // Get the first week's start date for the month
  //   const firstWeekStartDate =
  //     weeksData.length > 0
  //       ? weeksData[0].startDate
  //       : new Date(selectedYear, selectedMonth, 1).toISOString();

  //   try {
  //     const projectData = {
  //       organizationId: currentOrganization?.id,
  //       resourceAllocationId: addModalTarget,
  //       projectId: addForm.projectId,
  //       hoursPerWeek: addForm.hours * 5, // Convert daily to weekly
  //       defaultHoursPerDay: addForm.hours,
  //       allowWeekends: addForm.includeWeekends,
  //       startDate: new Date().toISOString(),
  //       weekStartDate: firstWeekStartDate,
  //     };

  //     await addProjectMutation.mutateAsync(projectData);
  //   } catch (error) {
  //     // Error is handled by mutation
  //   }
  // };

  const handleAddProject = async () => {
    if (!addModalTarget || !addForm.projectId) {
      setAddModalTarget(null);
      return;
    }

    try {
      // Step 1: Create the project assignment first
      const projectData = {
        organizationId: currentOrganization?.id,
        resourceAllocationId: addModalTarget,
        projectId: addForm.projectId,
        hoursPerWeek: addForm.hours * 5, // Convert daily to weekly
        defaultHoursPerDay: addForm.hours,
        allowWeekends: addForm.includeWeekends,
        startDate: new Date().toISOString(),
        // Don't pass weekStartDate here - we'll create all weekly plans separately
      };

      const assignmentResponse =
        await addProjectMutation.mutateAsync(projectData);
      const projectAssignmentId = assignmentResponse.projectAssignment?.id;

      if (!projectAssignmentId) {
        throw new Error("Failed to create project assignment");
      }

      // Step 2: Create weekly plans for ALL weeks in the current month
      const today = startOfDay(new Date());
      const dailyHours = addForm.hours;
      const weekdayHours = dailyHours;
      const weekendHours = addForm.includeWeekends ? dailyHours : 0;

      // Create weekly plans for each week in the month
      const weeklyPlanPromises = weeksData.map(async (week) => {
        const weekStart = startOfDay(parseISO(week.startDate));
        const weekEnd = startOfDay(parseISO(week.endDate));

        // Calculate hours for each day of the week
        let hoursSunday = 0;
        let hoursMonday = 0;
        let hoursTuesday = 0;
        let hoursWednesday = 0;
        let hoursThursday = 0;
        let hoursFriday = 0;
        let hoursSaturday = 0;

        // Get all days in this week
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

        weekDays.forEach((day) => {
          const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          const isDayPast = isPast(day) && !isToday(day);

          // If day is in the past, set hours to 0
          if (isDayPast) {
            return; // Hours already initialized to 0
          }

          // If day is today or in the future, set hours based on day type
          if (dayOfWeek === 0) {
            // Sunday
            hoursSunday = weekendHours;
          } else if (dayOfWeek === 1) {
            // Monday
            hoursMonday = weekdayHours;
          } else if (dayOfWeek === 2) {
            // Tuesday
            hoursTuesday = weekdayHours;
          } else if (dayOfWeek === 3) {
            // Wednesday
            hoursWednesday = weekdayHours;
          } else if (dayOfWeek === 4) {
            // Thursday
            hoursThursday = weekdayHours;
          } else if (dayOfWeek === 5) {
            // Friday
            hoursFriday = weekdayHours;
          } else if (dayOfWeek === 6) {
            // Saturday
            hoursSaturday = weekendHours;
          }
        });

        // Create weekly plan via API
        const weeklyPlanResponse = await fetch("/api/capacity/weekly-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: currentOrganization?.id,
            resourceAllocationId: addModalTarget,
            projectId: addForm.projectId,
            projectAssignmentId: projectAssignmentId,
            weekStartDate: weekStart.toISOString(),
            defaultHoursPerDay: dailyHours,
            allowWeekends: addForm.includeWeekends,
            // Override daily hours based on past/current/future logic
            hoursSunday,
            hoursMonday,
            hoursTuesday,
            hoursWednesday,
            hoursThursday,
            hoursFriday,
            hoursSaturday,
          }),
        });

        if (!weeklyPlanResponse.ok) {
          const errorData = await weeklyPlanResponse.json();
          throw new Error(errorData.error || "Failed to create weekly plan");
        }

        return weeklyPlanResponse.json();
      });

      // Wait for all weekly plans to be created
      await Promise.all(weeklyPlanPromises);

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-plans"] });

      toast.success(
        "Project assignment and weekly plans created successfully!"
      );
      setAddForm({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
      });
      setAddModalTarget(null);
    } catch (error: any) {
      console.error("Add project error:", error);
      toast.error(error.message || "Failed to add project assignment");
    }
  };

  const { data: weeklyPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: [
      "weekly-plans",
      currentOrganization?.id,
      selectedMonth,
      selectedYear,
    ],
    queryFn: () =>
      fetchWeeklyPlansForMonth(
        currentOrganization?.id || "",
        selectedMonth,
        selectedYear
      ),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

  const members: Member[] = useMemo(() => {
    if (!resources) return [];

    return resources.map((resource: ResourceAllocation) => {
      const memberInfo = resource.organization_members;
      const userInfo = memberInfo?.users;

      // Get project assignments for this resource
      const assignments = projectAssignments.filter(
        (pa: ProjectAssignment) => pa.resourceAllocationId === resource.id
      );

      // Transform assignments with weekly hours
      const allocations = assignments.map((assignment: ProjectAssignment) => {
        // Calculate weekly hours for each week in the month
        const weeklyHours = weeksData.map((week: WeekData) => {
          // Normalize dates for comparison
          let weekStartDate: Date;
          try {
            weekStartDate = parseISO(week.startDate);
            if (!isValid(weekStartDate)) {
              weekStartDate = new Date(week.startDate);
            }
          } catch {
            weekStartDate = new Date(week.startDate);
          }
          weekStartDate = startOfDay(weekStartDate);

          const weekMonday = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // 1 = Monday

          console.log("week", week);
          const weeklyPlan = weeklyPlans.find((wp: ProjectWeeklyPlan) => {
            let planDate: Date;
            try {
              planDate = parseISO(wp.weekStartDate);
              if (!isValid(planDate)) {
                planDate = new Date(wp.weekStartDate);
              }
            } catch {
              planDate = new Date(wp.weekStartDate);
            }

            // Normalize to start of day
            planDate = startOfDay(planDate);

            const planMonday = startOfWeek(planDate, { weekStartsOn: 1 });
            console.log("weekMonday", weekMonday, "planMonday", planMonday);

            const datesMatch = isSameDay(weekMonday, planMonday);

            console.log("datesMatch", datesMatch);

            console.log(
              "wp",
              wp,
              "resourceId",
              resource.id,
              "assignmentId",
              assignment.id
            );

            const idsMatch =
              wp.resourceAllocationId === resource.id &&
              wp.projectAssignmentId === assignment.id;

            return idsMatch && datesMatch;
          });
          console.log("weeklyPlan", weeklyPlan);

          if (weeklyPlan) {
            // Sum all daily hours for this week
            const totalHours =
              (Number(weeklyPlan.hoursSunday) || 0) +
              (Number(weeklyPlan.hoursMonday) || 0) +
              (Number(weeklyPlan.hoursTuesday) || 0) +
              (Number(weeklyPlan.hoursWednesday) || 0) +
              (Number(weeklyPlan.hoursThursday) || 0) +
              (Number(weeklyPlan.hoursFriday) || 0) +
              (Number(weeklyPlan.hoursSaturday) || 0);
            return totalHours;
          }

          // If no weekly plan exists, return 0
          return 0;
        });

        // Calculate average hours for display
        const avgHours =
          weeklyHours.reduce((sum, h) => sum + h, 0) / weeklyHours.length || 0;

        return {
          projectId: assignment.projectId,
          projectName: assignment.projectName,
          hours: avgHours,
          weeklyHours,
        };
      });

      return {
        id: resource.id,
        fullName: userInfo?.full_name || "Unknown User",
        jobTitle: userInfo?.position || "No Position",
        avatarUrl: userInfo?.avatar_url,
        capacity: resource.weeklyCapacityHours / 5, // Daily capacity
        allocations,
      };
    });
  }, [resources, projectAssignments, weeklyPlans, weeksData]);

  console.log("members", members);

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
  const totalMonthlyCapacity = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = allDays.filter((day) => !isWeekend(day)).length;

    return members.reduce((sum, member) => {
      // Monthly capacity = daily capacity × working days in month
      return sum + member.capacity * workingDays;
    }, 0);
  }, [members, selectedMonth, selectedYear]);

  const totalMonthlyAllocated = useMemo(() => {
    return members.reduce((sum, member) => {
      const memberAllocated = member.allocations.reduce(
        (allocSum, allocation) => {
          // Sum all weekly hours
          const weeklyTotal = allocation.weeklyHours.reduce(
            (weekSum, hours) => {
              return weekSum + Number(hours);
            },
            0
          );
          return allocSum + weeklyTotal;
        },
        0
      );
      return sum + memberAllocated;
    }, 0);
  }, [members]);

  const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated;

  if (resourcesLoading || assignmentsLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading capacity data...</div>
      </div>
    );
  }

  if (resourcesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">
          Error: {resourcesError.message}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-gray-600">No resources allocated yet</div>
        <button
          onClick={onAddResource}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add First Resource
        </button>
      </div>
    );
  }

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
          onConfirm={async () => {
            if (!deletingTarget || !deletingTarget.assignmentId) return;

            try {
              // Delete the project assignment (this will cascade delete all weekly plans)
              await deleteProjectAssignmentMutation.mutateAsync(
                deletingTarget.assignmentId
              );
            } catch (error) {
              // Error is handled by mutation
              // Don't close the modal on error so user can retry
            }
          }}
          title="Delete Project Assignment"
          message={
            deletingTarget?.projectName
              ? `Are you sure you want to delete the project assignment "${deletingTarget.projectName}"? This will permanently delete the assignment and all related weekly plans. This action cannot be undone.`
              : "Are you sure you want to delete this project assignment? This will permanently delete the assignment and all related weekly plans. This action cannot be undone."
          }
          isLoading={deleteProjectAssignmentMutation.isPending}
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
              {weeksData.map((week) => {
                const weekStartDate = new Date(week.startDate);
                const weekEndDate = new Date(week.endDate);
                const dateRangeTooltip = formatDateRange(
                  weekStartDate,
                  weekEndDate
                );

                return (
                  <th
                    key={week.weekNumber}
                    className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help"
                    title={dateRangeTooltip}
                  >
                    <div>{week.weekNumber}</div>
                    <div className="text-xs text-gray-400">{week.label}</div>
                  </th>
                );
              })}
              <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member, idx) => {
              const memberId = member.id;
              const isExpanded = expandedMembers.has(memberId);

              // Calculate monthly capacity: count working days in the month
              const monthStart = new Date(selectedYear, selectedMonth, 1);
              const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
              const allDays = eachDayOfInterval({
                start: monthStart,
                end: monthEnd,
              });
              const workingDays = allDays.filter(
                (day) => !isWeekend(day)
              ).length;
              const monthlyCapacity = member.capacity * workingDays;

              const totalAllocated = member.allocations.reduce(
                (sum, allocation) => {
                  // Sum all weekly hours for this allocation across all weeks
                  const allocationTotal = (allocation.weeklyHours || []).reduce(
                    (weekSum, hours) => weekSum + (Number(hours) || 0),
                    0
                  );
                  return sum + allocationTotal;
                },
                0
              );

              const utilizationPercentage =
                monthlyCapacity > 0
                  ? (totalAllocated / monthlyCapacity) * 100
                  : 0;
              const statusLabel = getStatusLabel(
                totalAllocated,
                monthlyCapacity
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
                        {totalAllocated.toFixed(1)}/{monthlyCapacity.toFixed(1)}{" "}
                        h
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
                    {weeksData.map((week, weekIndex) => {
                      const weekAllocated = member.allocations.reduce(
                        (sum, allocation) => {
                          return (
                            sum +
                            (Number(allocation.weeklyHours?.[weekIndex]) || 0)
                          );
                        },
                        0
                      );
                      const weekCapacity = member.capacity * 5;
                      const weekUtilization =
                        weekCapacity > 0
                          ? (weekAllocated / weekCapacity) * 100
                          : 0;

                      return (
                        <td
                          key={week.weekNumber}
                          className="px-4 py-4 text-center"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(
                                weekAllocated,
                                weekCapacity
                              )}`}
                            >
                              {weekAllocated.toFixed(1)}h
                            </div>
                            <div className="text-xs text-gray-500">
                              {weekUtilization.toFixed(0)}%
                            </div>
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
                              onClick={() => {
                                // Find the project assignment to get the assignment ID
                                const assignment = projectAssignments.find(
                                  (pa: ProjectAssignment) =>
                                    pa.resourceAllocationId === memberId &&
                                    pa.projectId === allocation.projectId
                                );

                                if (assignment) {
                                  // Set up deletion target with assignment ID and project name
                                  setDeletingTarget({
                                    memberId,
                                    projectId: allocation.projectId,
                                    assignmentId: assignment.id,
                                    projectName: allocation.projectName,
                                  });
                                } else {
                                  toast.error("Project assignment not found");
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Delete project assignment"
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Project
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={addForm.projectId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, projectId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours per workday
                </label>
                <input
                  type="number"
                  className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
                  min={0}
                  max={24}
                  step={0.5}
                  value={addForm.hours}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      hours: Math.max(0, Number(e.target.value)),
                    }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={addForm.includeWeekends}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      includeWeekends: e.target.checked,
                    }))
                  }
                />
                Enable weekends
              </label>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                onClick={() => {
                  setAddModalTarget(null);
                  setAddForm({
                    projectId: "",
                    hours: 8,
                    includeWeekends: false,
                    startDate: new Date().toISOString().split("T")[0],
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleAddProject}
                disabled={addProjectMutation.isPending || !addForm.projectId}
              >
                {addProjectMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
