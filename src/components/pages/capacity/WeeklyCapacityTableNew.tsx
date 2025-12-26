"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash,
  Pencil,
  Link as LinkIcon,
  Save,
  Unlink,
  Edit2,
  X,
} from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface DayData {
  dayName: string;
  date: string;
  label: string;
  dayOfWeek: number;
}

interface WeeklyCapacityTableProps {
  selectedWeek?: string;
  onAddResource?: () => void;
}

// Interface for API response
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

interface Allocation {
  projectId: string;
  projectName: string;
  hours: number;
  dailyHours: number[];
  includeWeekends: boolean;
  linked: boolean;
  assignmentId: string;
}

interface Member {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl?: string;
  capacity: number; // Daily capacity
  allocations: Allocation[];
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
  weeklyPlan?: {
    id: string;
    weekStartDate: string;
    dailyHours: number[];
    isLinked: boolean;
    allowWeekends: boolean;
  } | null;
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

const fetchProjects = async (organizationId: string): Promise<Project[]> => {
  const response = await fetch(
    `/api/projects?organizationId=${organizationId}`
  );
  if (!response.ok) throw new Error("Failed to fetch projects");
  const data = await response.json();
  return data.projects || [];
};

const fetchProjectAssignments = async (
  organizationId: string,
  weekStartDate: string
): Promise<ProjectAssignment[]> => {
  if (!organizationId || !weekStartDate) return [];

  const response = await fetch(
    `/api/capacity/project-assignments?organizationId=${organizationId}&weekStartDate=${weekStartDate}`
  );
  if (!response.ok) throw new Error("Failed to fetch project assignments");
  const data = await response.json();
  return data.assignments || [];
};

const fetchResources = async (
  organizationId: string,
  userId: string
): Promise<ResourceAllocation[]> => {
  if (!organizationId) throw new Error("Organization ID is required");

  const response = await fetch(
    `/api/capacity/resources?organizationId=${organizationId}&userId=${userId}&only_active=true`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status}`);
  }

  const data = await response.json();
  return data.resources || [];
};

export default function WeeklyCapacityTableNew({
  selectedWeek = "",
  onAddResource,
}: WeeklyCapacityTableProps) {
  const { data: session } = useSession();

  const queryClient = useQueryClient();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
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
  const [editedDailyHours, setEditedDailyHours] = useState<{
    [key: string]: number[];
  }>({});
  const [linkedStatus, setLinkedStatus] = useState<{
    [key: string]: boolean;
  }>({});
  const [editingResource, setEditingResource] = useState<{
    resourceId: string;
    memberId: string;
  } | null>(null);
  const [deletingResource, setDeletingResource] = useState<{
    resourceId: string;
    memberName: string;
  } | null>(null);
  const [editResourceForm, setEditResourceForm] = useState({
    weeklyCapacityHours: 40,
    hourlyRate: null as number | null,
    isActive: true,
  });

  const { currentOrganization } = useOrganizationStore();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentOrganization?.id],
    queryFn: () => fetchProjects(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
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
        console.log(errorData.error || "Failed to add project assignment");
        throw new Error(errorData.error || "Failed to add project assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the resources list to show the new assignment
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      console.error("Project assignment error:", error);
    },
  });

  const updateWeeklyPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await fetch("/api/capacity/weekly-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update weekly plan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      toast.success("Weekly plan updated successfully!");
    },
    onError: (error) => {
      console.error("Update weekly plan error:", error);
      toast.error(error.message || "Failed to update weekly plan");
    },
  });

  const createWeeklyPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await fetch("/api/capacity/weekly-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create weekly plan");
      }

      return response.json();
    },
    onSuccess: () => {
      refetchAssignments();
      toast.success("Weekly plan created successfully!");
    },
    onError: (error) => {
      console.error("Create weekly plan error:", error);
      toast.error(error.message || "Failed to create weekly plan");
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
      toast.success("Project assignment deleted successfully!");
    },
    onError: (error) => {
      console.error("Delete project assignment error:", error);
      toast.error(error.message || "Failed to delete project assignment");
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: async (resourceData: any) => {
      const response = await fetch("/api/capacity/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update resource");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource updated successfully!");
      setEditingResource(null);
    },
    onError: (error) => {
      console.error("Update resource error:", error);
      toast.error(error.message || "Failed to update resource");
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(
        `/api/capacity/resources?resourceId=${resourceId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete resource");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      toast.success("Resource deleted successfully!");
      setDeletingResource(null);
    },
    onError: (error) => {
      console.error("Delete resource error:", error);
      toast.error(error.message || "Failed to delete resource");
    },
  });

  const handleStartEditResource = (resourceId: string, member: Member) => {
    const resource = resources?.find(
      (r: ResourceAllocation) => r.id === resourceId
    );
    if (resource) {
      setEditResourceForm({
        weeklyCapacityHours: Number(resource.weeklyCapacityHours) || 40,
        hourlyRate: resource.hourlyRate ? Number(resource.hourlyRate) : null,
        isActive: resource.isActive ?? true,
      });
      setEditingResource({ resourceId, memberId: member.id });
    }
  };

  const handleSaveResource = async () => {
    if (!editingResource) return;

    try {
      await updateResourceMutation.mutateAsync({
        resourceId: editingResource.resourceId,
        organizationId: currentOrganization?.id,
        weeklyCapacityHours: editResourceForm.weeklyCapacityHours,
        hourlyRate: editResourceForm.hourlyRate,
        isActive: editResourceForm.isActive,
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleAddProject = async () => {
    if (!addModalTarget || !addForm.projectId) {
      setAddModalTarget(null);
      return;
    }

    try {
      const projectData = {
        organizationId: currentOrganization?.id,
        resourceAllocationId: addModalTarget,
        projectId: addForm.projectId,
        hoursPerWeek: addForm.hours * 5, // Convert daily to weekly
        defaultHoursPerDay: addForm.hours,
        allowWeekends: addForm.includeWeekends,
        startDate: new Date().toISOString(),
        weekStartDate: selectedWeek || new Date().toISOString(),
      };

      await addProjectMutation.mutateAsync(projectData);

      // Reset form
      setAddForm({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
      });
      setAddModalTarget(null);
    } catch (error) {
      console.error("Failed to add project:", error);
      toast.error("Failed to add project");
    }
  };

  const handleStartEdit = (
    memberId: string,
    projectId: string,
    allocation: any
  ) => {
    const key = `${memberId}:${projectId}`;

    if (linkedStatus[key] === undefined) {
      setLinkedStatus((prev) => ({
        ...prev,
        [key]: allocation.linked ?? true,
      }));
    }

    setEditedDailyHours((prev) => ({
      ...prev,
      [key]: [...(allocation.dailyHours || [0, 0, 0, 0, 0, 0, 0])],
    }));
    setEditingTarget({ memberId, projectId });
  };

  const toggleLinked = async (
    memberId: string,
    projectId: string,
    allocation: any
  ) => {
    const key = `${memberId}:${projectId}`;
    const currentLinked = linkedStatus[key] !== false; // Default to true
    const newLinked = !currentLinked;

    // Update local state
    setLinkedStatus((prev) => ({
      ...prev,
      [key]: newLinked,
    }));

    // Find the project assignment
    const assignment = projectAssignments.find(
      (pa: ProjectAssignment) =>
        pa.resourceAllocationId === memberId && pa.projectId === projectId
    );

    if (!assignment) {
      toast.error("Project assignment not found");
      return;
    }

    // Update the weekly plan's isLinked status
    if (assignment.weeklyPlan) {
      try {
        await updateWeeklyPlanMutation.mutateAsync({
          weeklyPlanId: assignment.weeklyPlan.id,
          isLinked: newLinked,
        });
      } catch (error) {
        // Revert on error
        setLinkedStatus((prev) => ({
          ...prev,
          [key]: currentLinked,
        }));
      }
    } else {
      // TODO: If no weekly plan exists, we'll create one when saving
      // For now, just update the local state
    }
  };

  const handleSaveEdit = async (
    memberId: string,
    projectId: string,
    allocation: any
  ) => {
    const key = `${memberId}:${projectId}`;
    const editedHours = editedDailyHours[key];

    if (!editedHours) {
      setEditingTarget(null);
      return;
    }

    // Find the project assignment to get the weekly plan ID
    const assignment = projectAssignments.find(
      (pa: ProjectAssignment) =>
        pa.resourceAllocationId === memberId && pa.projectId === projectId
    );

    if (!assignment) {
      toast.error("Project assignment not found");
      setEditingTarget(null);
      return;
    }

    // If weekly plan exists, update it
    if (assignment.weeklyPlan) {
      try {
        await updateWeeklyPlanMutation.mutateAsync({
          weeklyPlanId: assignment.weeklyPlan.id,
          hoursSunday: editedHours[0],
          hoursMonday: editedHours[1],
          hoursTuesday: editedHours[2],
          hoursWednesday: editedHours[3],
          hoursThursday: editedHours[4],
          hoursFriday: editedHours[5],
          hoursSaturday: editedHours[6],
        });
      } catch (error) {
        // Error is handled by mutation
        return;
      }
    } else {
      // If no weekly plan exists, create one
      try {
        await createWeeklyPlanMutation.mutateAsync({
          organizationId: currentOrganization?.id,
          resourceAllocationId: memberId,
          projectId: projectId,
          projectAssignmentId: assignment.id,
          weekStartDate: weekKey,
          defaultHoursPerDay: allocation.hours,
          allowWeekends: allocation.includeWeekends,
          hoursSunday: editedHours[0],
          hoursMonday: editedHours[1],
          hoursTuesday: editedHours[2],
          hoursWednesday: editedHours[3],
          hoursThursday: editedHours[4],
          hoursFriday: editedHours[5],
          hoursSaturday: editedHours[6],
        });
      } catch (error) {
        // Error is handled by mutation
        return;
      }
    }

    // Clear edited hours and exit edit mode
    setEditedDailyHours((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setEditingTarget(null);
  };

  const updateEditedDailyHour = (
    memberId: string,
    projectId: string,
    dayIndex: number,
    value: number
  ) => {
    const key = `${memberId}:${projectId}`;
    const isLinked = linkedStatus[key] !== false;

    setEditedDailyHours((prev) => {
      const current = prev[key] || [0, 0, 0, 0, 0, 0, 0];
      const updated = [...current];
      const sanitized = Math.max(0, Number.isFinite(value) ? value : 0);

      if (isLinked) {
        // If linked, update all days (except weekends if not allowed)
        const allocation = members
          .find((m) => m.id === memberId)
          ?.allocations.find((a) => a.projectId === projectId);

        const allowWeekends = allocation?.includeWeekends ?? false;

        for (let i = 0; i < 7; i++) {
          const dayData = daysData[i];
          const dayIsPast = dayData ? isDayInPast(dayData.date) : false;

          if (dayIsPast) {
            // Don't update past days - keep their current values
            continue;
          }

          if (!allowWeekends && (i === 0 || i === 6)) {
            // Don't update weekends if weekends are not allowed
            updated[i] = 0;
          } else {
            updated[i] = sanitized;
          }
        }
      } else {
        // If unlinked, only update the specific day
        const dayData = daysData[dayIndex];
        const dayIsPast = dayData ? isDayInPast(dayData.date) : false;

        if (!dayIsPast) {
          updated[dayIndex] = sanitized;
        }
      }

      return { ...prev, [key]: updated };
    });
  };

  const {
    data: resources,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["resources", currentOrganization?.id],
    queryFn: () => fetchResources(currentOrganization?.id || "", session?.user.id || ""),
    enabled: !!currentOrganization?.id, // Only fetch when organization ID is available
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate days for the selected week
  const daysData: DayData[] = useMemo(() => {
    const days: DayData[] = [];
    if (selectedWeek) {
      const weekStart = new Date(selectedWeek);
      const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);

        const dayOfWeekIndex = i < 6 ? i + 1 : 0;

        days.push({
          dayName: dayNames[i],
          date: currentDay.toISOString(),
          label: `${String(currentDay.getDate()).padStart(2, "0")}`,
          dayOfWeek: dayOfWeekIndex,
        });
      }
    }
    return days;
  }, [selectedWeek]);

  const weekKey: string = daysData[0]?.date || selectedWeek || "";

  const getUtilizationColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100;
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    if (percentage >= 60) return "bg-green-500";
    return "bg-yellow-500";
  };

  const {
    data: projectAssignments = [],
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["project-assignments", currentOrganization?.id, weekKey],
    queryFn: () =>
      fetchProjectAssignments(currentOrganization?.id || "", weekKey),
    enabled: !!currentOrganization?.id && !!weekKey,
    staleTime: 5 * 60 * 1000,
  });

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

  const members = useMemo(() => {
    if (!resources) return [];

    return resources.map((resource: ResourceAllocation) => {
      const memberInfo = resource.organization_members;
      const userInfo = memberInfo?.users;

      // Get project assignments for this resource
      const assignments = projectAssignments.filter(
        (pa: ProjectAssignment) => pa.resourceAllocationId === resource.id
      );

      const allocations = assignments.map((assignment: ProjectAssignment) => {
        // If weekly plan exists, use its daily hours
        let dailyHours: number[];
        let includeWeekends: boolean;

        const key = `${resource.id}:${assignment.projectId}`;
        const isLinked =
          linkedStatus[key] !== false
            ? (assignment.weeklyPlan?.isLinked ?? true)
            : false;

        if (assignment.weeklyPlan) {
          dailyHours = assignment.weeklyPlan.dailyHours;
          includeWeekends = assignment.weeklyPlan.allowWeekends;
        } else {
          const defaultHours = assignment.defaultHoursPerDay;
          dailyHours = [
            assignment.allowWeekends ? defaultHours : 0,
            defaultHours, // Monday
            defaultHours, // Tuesday
            defaultHours, // Wednesday
            defaultHours, // Thursday
            defaultHours, // Friday
            assignment.allowWeekends ? defaultHours : 0, // Saturday
          ];
          includeWeekends = assignment.allowWeekends;
        }

        const weekdayHours =
          dailyHours.slice(1, 6).reduce((sum, h) => sum + h, 0) / 5;
        const hours = Math.round(weekdayHours * 10) / 10; // Round to 1 decimal

        return {
          projectId: assignment.projectId,
          projectName: assignment.projectName,
          hours,
          dailyHours,
          includeWeekends,
          linked: isLinked,
          assignmentId: assignment.id,
        };
      });

      return {
        id: resource.id,
        fullName: userInfo?.full_name || "Unknown User",
        jobTitle: userInfo?.position || "No Position",
        avatarUrl: userInfo?.avatar_url,
        capacity: resource.weeklyCapacityHours / 5,
        allocations,
      };
    });
  }, [resources, projectAssignments, linkedStatus]);

  // Calculate total weekly capacity (5 days * 8 hours per day)
  const totalWeeklyCapacity = useMemo(() => {
    return members.reduce((sum, member) => {
      return sum + member.capacity * 5;
    }, 0);
  }, [members]);

  const totalWeeklyAllocated = useMemo(() => {
    return members.reduce((sum, member) => {
      const memberAllocated = member.allocations.reduce(
        (allocSum, allocation) => {
          const weeklyHours = allocation.dailyHours.reduce((daySum, hours) => {
            return daySum + hours;
          }, 0);
          return allocSum + weeklyHours;
        },
        0
      );
      return sum + memberAllocated;
    }, 0);
  }, [members]);

  const totalWeeklyAvailable = useMemo(() => {
    return totalWeeklyCapacity - totalWeeklyAllocated;
  }, [totalWeeklyCapacity, totalWeeklyAllocated]);

  const utilizationPercentage = useMemo(() => {
    if (totalWeeklyCapacity === 0) return 0;
    return (totalWeeklyAllocated / totalWeeklyCapacity) * 100;
  }, [totalWeeklyAllocated, totalWeeklyCapacity]);

  const dailyBreakdown = useMemo(() => {
    const breakdown: {
      [day: string]: { capacity: number; allocated: number };
    } = {};

    daysData.forEach((day, dayIndex) => {
      const dayCapacity = members.reduce((sum, member) => {
        return sum + member.capacity;
      }, 0);

      const dayAllocated = members.reduce((sum, member) => {
        return (
          sum +
          member.allocations.reduce((allocSum, allocation) => {
            return allocSum + (allocation.dailyHours?.[dayIndex] || 0);
          }, 0)
        );
      }, 0);

      breakdown[day.dayName] = {
        capacity: dayCapacity,
        allocated: dayAllocated,
      };
    });

    return breakdown;
  }, [members, daysData]);

  useEffect(() => {
    if (!projectAssignments.length) return;

    const initialLinkedStatus: { [key: string]: boolean } = {};

    projectAssignments.forEach((assignment: ProjectAssignment) => {
      const key = `${assignment.resourceAllocationId}:${assignment.projectId}`;
      initialLinkedStatus[key] = assignment.weeklyPlan?.isLinked ?? true;
    });

    setLinkedStatus(initialLinkedStatus);
  }, [projectAssignments]);

  const isDayInPast = (dayDate: string): boolean => {
    if (!dayDate) return false;

    const day = new Date(dayDate);
    const today = new Date();

    // Set both dates to start of day for accurate comparison
    const dayDateOnly = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate()
    );
    const todayDateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Check if day is before today
    return dayDateOnly < todayDateOnly;
  };

  const isEditing = (memberId: string, projectId: string) =>
    editingTarget?.memberId === memberId &&
    editingTarget?.projectId === projectId;

  if (isLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading resources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error.message}</div>
        <button
          onClick={() => refetch()}
          className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-gray-600">No resources allocated yet</div>
        <button
          onClick={onAddResource}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover极:bg-blue-700"
        >
          Add First Resource
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Capacity Overview */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Weekly Capacity Overview
          </h2>
          <div className="flex items-center space-x-4 flex-wrap">
            {/* Total Resources */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Resources:</span>
              <span className="text-sm font-medium text-gray-900">
                {members.length}
              </span>
            </div>

            <span className="text-sm text-gray-300">|</span>

            {/* Total Weekly Capacity */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Total Capacity:</span>
              <span className="text-sm font-medium text-gray-900">
                {totalWeeklyCapacity.toFixed(1)}h
              </span>
            </div>

            <span className="text-sm text-gray-300">|</span>

            {/* Weekly Allocated */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Allocated:</span>
              <span
                className={`text-sm font-medium ${totalWeeklyAllocated > totalWeeklyCapacity
                  ? "text-red-600"
                  : "text-gray-900"
                  }`}
              >
                {totalWeeklyAllocated.toFixed(1)}h
              </span>
            </div>

            <span className="text-sm text-gray-300">|</span>

            {/* Available */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Available:</span>
              <span
                className={`text-sm font-medium ${totalWeeklyAvailable < 0
                  ? "text-red-600"
                  : totalWeeklyAvailable < totalWeeklyCapacity * 0.1
                    ? "text-yellow-600"
                    : "text-green-600"
                  }`}
              >
                {totalWeeklyAvailable.toFixed(1)}h
              </span>
            </div>

            <span className="text-sm text-gray-300">|</span>

            {/* Utilization Percentage */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Utilization:</span>
              <span
                className={`text-sm font-medium ${utilizationPercentage > 100
                  ? "text-red-600"
                  : utilizationPercentage >= 90
                    ? "text-yellow-600"
                    : "text-green-600"
                  }`}
              >
                {utilizationPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${utilizationPercentage > 100
                ? "bg-red-500"
                : utilizationPercentage >= 90
                  ? "bg-yellow-500"
                  : "bg-green-500"
                }`}
              style={{
                width: `${Math.min(utilizationPercentage, 100)}%`,
              }}
            ></div>
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
              setDeletingTarget(null);
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
        {editingResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Resource
                </h3>
                <button
                  onClick={() => setEditingResource(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Capacity Hours
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    min={0}
                    max={168}
                    step={0.5}
                    value={editResourceForm.weeklyCapacityHours}
                    onChange={(e) =>
                      setEditResourceForm((f) => ({
                        ...f,
                        weeklyCapacityHours: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (Optional)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    min={0}
                    step={0.01}
                    value={editResourceForm.hourlyRate || ""}
                    onChange={(e) =>
                      setEditResourceForm((f) => ({
                        ...f,
                        hourlyRate: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="Enter hourly rate"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editResourceForm.isActive}
                    onChange={(e) =>
                      setEditResourceForm((f) => ({
                        ...f,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => setEditingResource(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                  onClick={handleSaveResource}
                  disabled={updateResourceMutation.isPending}
                >
                  {updateResourceMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
        <ConfirmationModal
          isOpen={Boolean(deletingResource)}
          onClose={() => setDeletingResource(null)}
          onConfirm={async () => {
            if (!deletingResource) return;

            try {
              await deleteResourceMutation.mutateAsync(
                deletingResource.resourceId
              );
            } catch (error) {
              // Error is handled by mutation
            }
          }}
          title="Delete Resource"
          message={
            deletingResource
              ? `Are you sure you want to delete the resource allocation for "${deletingResource.memberName}"? This will permanently delete the resource and all related project assignments and weekly plans. This action cannot be undone.`
              : ""
          }
          isLoading={deleteResourceMutation.isPending}
        />
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                RESOURCE
              </th>
              <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                DAILY CAPACITY
              </th>
              {daysData.map((day) => {
                const dayIsPast = isDayInPast(day.date);

                return (
                  <th
                    key={day.dayName}
                    className={`text-center px-4 py-4 text-xs font-medium tracking-wider text-gray-500 uppercase ${dayIsPast ? "opacity-60" : ""
                      }`}
                  >
                    <div>{day.dayName}</div>
                    <div
                      className={`text-xs ${dayIsPast ? "text-gray-400" : "text-gray-400"}`}
                    >
                      {day.label}
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
            {members.map((member, idx) => {
              const memberId = member.id;
              const isExpanded = expandedMembers.has(memberId);

              const totalAllocated =
                member.allocations.reduce((sum, allocation) => {
                  const weeklyHours = allocation.dailyHours.reduce(
                    (daySum, hours) => {
                      return daySum + hours;
                    },
                    0
                  );
                  return sum + weeklyHours;
                }, 0) / 5;

              const totalAllocatedWeekly = member.allocations.reduce(
                (sum, allocation) => {
                  return (
                    sum +
                    allocation.dailyHours.reduce(
                      (daySum, hours) => daySum + hours,
                      0
                    )
                  );
                },
                0
              );

              const memberWeeklyCapacity = member.capacity * 5;
              const utilizationPercentage =
                memberWeeklyCapacity > 0
                  ? (totalAllocatedWeekly / memberWeeklyCapacity) * 100
                  : 0;

              const statusLabel = getStatusLabel(
                totalAllocatedWeekly,
                memberWeeklyCapacity
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
                    {daysData.map((day) => {
                      const isWeekend =
                        day.dayOfWeek === 0 || day.dayOfWeek === 6;

                      // For weekends, only sum hours from projects that allow weekends
                      // For weekdays, sum all projects
                      const dayAllocation = member.allocations.reduce(
                        (s, a) => {
                          if (isWeekend && !a.includeWeekends) {
                            return s; // Don't include this project's hours on weekends
                          }
                          return s + (a.dailyHours?.[day.dayOfWeek] ?? a.hours);
                        },
                        0
                      );

                      // If weekend and no hours allocated, show "-"
                      if (isWeekend && dayAllocation === 0) {
                        return (
                          <td
                            key={day.dayName}
                            className="px-4 py-4 text-center bg-gray-50 opacity-50"
                          >
                            <div className="text-gray-300 text-sm">-</div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.dayName}
                          className="px-4 py-4 text-center"
                        >
                          <div
                            className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(dayAllocation, member.capacity)}`}
                          >
                            {dayAllocation}h
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleStartEditResource(memberId, member)
                          }
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit resource"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingResource({
                              resourceId: memberId,
                              memberName: member.fullName,
                            });
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete resource"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
                        {daysData.map((day) => {
                          const isWeekend =
                            day.dayOfWeek === 0 || day.dayOfWeek === 6;
                          return (
                            <td
                              key={day.dayName}
                              className="px-4 py-3 text-center"
                            >
                              {isWeekend && !allocation.includeWeekends ? (
                                <span className="text-sm text-gray-300">-</span>
                              ) : isEditing(memberId, allocation.projectId) ? (
                                (() => {
                                  const dayIsPast = isDayInPast(day.date);
                                  return (
                                    <input
                                      type="number"
                                      className={`w-16 border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 ${dayIsPast
                                        ? "opacity-50 cursor-not-allowed bg-gray-100"
                                        : ""
                                        }`}
                                      value={
                                        editedDailyHours[
                                        `${memberId}:${allocation.projectId}`
                                        ]?.[day.dayOfWeek] ??
                                        allocation.dailyHours?.[
                                        day.dayOfWeek
                                        ] ??
                                        0
                                      }
                                      min={0}
                                      max={24}
                                      step={0.5}
                                      disabled={dayIsPast}
                                      onChange={(e) => {
                                        if (dayIsPast) return;
                                        updateEditedDailyHour(
                                          memberId,
                                          allocation.projectId,
                                          day.dayOfWeek,
                                          Number(e.target.value)
                                        );
                                      }}
                                      title={
                                        dayIsPast
                                          ? "Cannot edit past dates"
                                          : ""
                                      }
                                    />
                                  );
                                })()
                              ) : (
                                <span className="text-sm text-gray-600">
                                  {allocation.dailyHours?.[day.dayOfWeek] ??
                                    allocation.hours}
                                  h
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-3">
                            <button
                              className="text-gray-600 hover:text-gray-800"
                              title={
                                isEditing(memberId, allocation.projectId)
                                  ? "Save changes"
                                  : "Edit allocation"
                              }
                              onClick={() => {
                                if (isEditing(memberId, allocation.projectId)) {
                                  // Save changes
                                  handleSaveEdit(
                                    memberId,
                                    allocation.projectId,
                                    allocation
                                  );
                                } else {
                                  // Start editing
                                  handleStartEdit(
                                    memberId,
                                    allocation.projectId,
                                    allocation
                                  );
                                }
                              }}
                              disabled={
                                updateWeeklyPlanMutation.isPending ||
                                createWeeklyPlanMutation.isPending
                              }
                            >
                              {isEditing(memberId, allocation.projectId) ? (
                                <Save className="h-4 w-4" />
                              ) : (
                                <Pencil className="h-4 w-4" />
                              )}
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
                            <button
                              className={`${linkedStatus[
                                `${memberId}:${allocation.projectId}`
                              ] !== false
                                ? "text-orange-600"
                                : "text-gray-400"
                                } hover:text-orange-700`}
                              title={
                                linkedStatus[
                                  `${memberId}:${allocation.projectId}`
                                ] !== false
                                  ? "Linked (edit one updates all future days)"
                                  : "Unlinked (edit days separately)"
                              }
                              onClick={() => {
                                toggleLinked(
                                  memberId,
                                  allocation.projectId,
                                  allocation
                                );
                              }}
                            >
                              {linkedStatus[
                                `${memberId}:${allocation.projectId}`
                              ] !== false ? (
                                <LinkIcon className="h-4 w-4" />
                              ) : (
                                <Unlink className="h-4 w-4" />
                              )}
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
                        colSpan={daysData.length + 3}
                      >
                        <button
                          onClick={() => {
                            setAddModalTarget(memberId);
                            setAddForm({
                              projectId: "",
                              hours: 8,
                              includeWeekends: false,
                              startDate: new Date().toISOString().split("T")[0],
                            });
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
                <select
                  value={addForm.projectId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, projectId: e.target.value })
                  }
                  className="border rounded p-2"
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
                onClick={() => setAddModalTarget(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
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
