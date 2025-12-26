// // "use client";

// // import React, { useState, useMemo } from "react";
// // import {
// //   ChevronDown,
// //   ChevronUp,
// //   Plus,
// //   Trash,
// //   Pencil,
// //   X,
// //   Check,
// //   AlertTriangle,
// // } from "lucide-react";
// // import ConfirmationModal from "@/components/ui/ConfirmationModal";
// // import { capacityStore } from "@/lib/stores/capacityStore";
// // import { useOrganizationStore } from "@/lib/stores/organizationStore";
// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { useMonthlyCapacity } from "@/lib/hooks/useCapacity";
// // import {
// //   startOfWeek,
// //   startOfDay,
// //   isSameDay,
// //   parseISO,
// //   isValid,
// //   eachDayOfInterval,
// //   isWeekend,
// //   startOfMonth,
// //   endOfMonth,
// //   isPast,
// //   isToday,
// //   addDays,
// //   getDay,
// // } from "date-fns";
// // import { toast } from "sonner";
// // import { useSession } from "next-auth/react";

// // interface ResourceAllocation {
// //   id: string;
// //   organizationMemberId: string;
// //   weeklyCapacityHours: number;
// //   hourlyRate?: number;
// //   isActive: boolean;
// //   isArchived: boolean;
// //   createdAt: string;
// //   updatedAt: string;
// //   organization_members: {
// //     id: string;
// //     user_id: string;
// //     status: string;
// //     roles?: { id: string; name: string };
// //     users: {
// //       id: string;
// //       full_name: string;
// //       email: string;
// //       avatar_url?: string;
// //       position?: string;
// //     };
// //   } | null;
// // }

// // interface ProjectAssignment {
// //   id: string;
// //   projectId: string;
// //   projectName: string;
// //   resourceAllocationId: string;
// //   hoursPerWeek: number;
// //   defaultHoursPerDay: number;
// //   allowWeekends: boolean;
// //   startDate: string;
// //   endDate?: string | null;
// //   notes?: string | null;
// // }

// // interface ProjectWeeklyPlan {
// //   id: string;
// //   resourceAllocationId: string;
// //   projectId: string;
// //   projectAssignmentId: string;
// //   weekStartDate: string;
// //   hoursSunday: number | null;
// //   hoursMonday: number | null;
// //   hoursTuesday: number | null;
// //   hoursWednesday: number | null;
// //   hoursThursday: number | null;
// //   hoursFriday: number | null;
// //   hoursSaturday: number | null;
// // }

// // interface Member {
// //   id: string;
// //   fullName: string;
// //   jobTitle: string;
// //   avatarUrl?: string;
// //   capacity: number; // Daily capacity
// //   allocations: Array<{
// //     projectId: string;
// //     projectName: string;
// //     hours: number; // Default weekly hours
// //     weeklyHours: number[]; // per week allocations aligned with weeksData
// //   }>;
// // }

// // interface WeekData {
// //   weekNumber: string;
// //   startDate: string;
// //   endDate: string;
// //   label: string;
// // }

// // interface MonthlyCapacityTableProps {
// //   selectedMonth?: number;
// //   selectedYear?: number;
// //   onAddResource?: () => void;
// // }

// // interface Project {
// //   id: string;
// //   name: string;
// //   description?: string;
// //   status: string;
// // }

// // interface AddProjectForm {
// //   projectId: string;
// //   hours: number;
// //   includeWeekends: boolean;
// //   startDate: string;
// //   endDate?: string;
// //   notes?: string;
// // }

// // const fetchResources = async (
// //   organizationId: string
// // ): Promise<ResourceAllocation[]> => {
// //   if (!organizationId) throw new Error("Organization ID is required");

// //   const response = await fetch(
// //     `/api/capacity/resources?organizationId=${organizationId}&only_active=true`
// //   );

// //   if (!response.ok) {
// //     throw new Error(`Failed to fetch resources: ${response.status}`);
// //   }

// //   const data = await response.json();
// //   return data.resources || [];
// // };

// // const fetchProjectAssignments = async (
// //   organizationId: string
// // ): Promise<ProjectAssignment[]> => {
// //   if (!organizationId) return [];

// //   const response = await fetch(
// //     `/api/capacity/project-assignments?organizationId=${organizationId}`
// //   );
// //   if (!response.ok) throw new Error("Failed to fetch project assignments");
// //   const data = await response.json();
// //   return data.assignments || [];
// // };

// // const fetchWeeklyPlansForMonth = async (
// //   organizationId: string,
// //   month: number,
// //   year: number
// // ): Promise<ProjectWeeklyPlan[]> => {
// //   if (!organizationId) return [];

// //   // Fetch weekly plans for the month
// //   const response = await fetch(
// //     `/api/capacity/weekly-plans?organizationId=${organizationId}&month=${month}&year=${year}`
// //   );
// //   if (!response.ok) return [];
// //   const data = await response.json();
// //   return data.weeklyPlans || [];
// // };

// // const fetchProjects = async (organizationId: string): Promise<Project[]> => {
// //   const response = await fetch(
// //     `/api/projects?organizationId=${organizationId}`
// //   );
// //   if (!response.ok) throw new Error("Failed to fetch projects");
// //   const data = await response.json();
// //   return data.projects || [];
// // };

// // export default function MonthlyCapacityTable({
// //   selectedMonth = new Date().getMonth(),
// //   selectedYear = new Date().getFullYear(),
// //   onAddResource,
// // }: MonthlyCapacityTableProps) {
// //   const queryClient = useQueryClient();
// //   const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
// //     new Set()
// //   );
// //   const { data: session } = useSession();

// //   const { currentOrganization } = useOrganizationStore();
// //   const [deletingTarget, setDeletingTarget] = useState<{
// //     memberId: string;
// //     projectId: string;
// //     assignmentId?: string; // Add this to store assignment ID
// //     projectName?: string; // Add this for better confirmation message
// //   } | null>(null);
// //   const [editingTarget, setEditingTarget] = useState<{
// //     memberId: string;
// //     projectId: string;
// //   } | null>(null);
// //   const [addModalTarget, setAddModalTarget] = useState<string | null>(null); // memberId
// //   const [addForm, setAddForm] = useState<AddProjectForm>({
// //     projectId: "",
// //     hours: 8,
// //     includeWeekends: false,
// //     startDate: new Date().toISOString().split("T")[0],
// //   });
// //   const [savingTarget, setSavingTarget] = useState<{
// //     memberId: string;
// //     projectId: string;
// //     projectName: string;
// //   } | null>(null);
// //   const [confirmationText, setConfirmationText] = useState("");
// //   const [isSaving, setIsSaving] = useState(false);
// //   const [editedWeeklyHours, setEditedWeeklyHours] = useState<{
// //     [key: string]: number[]; // key: "memberId:projectId", value: array of weekly hours
// //   }>({});

// //   const { data: projects = [], isLoading: projectsLoading } = useQuery({
// //     queryKey: ["projects", currentOrganization?.id],
// //     queryFn: () => fetchProjects(currentOrganization?.id || ""),
// //     enabled: !!currentOrganization?.id,
// //   });

// //   const formatDateForDisplay = (date: Date): string => {
// //     const monthNames = [
// //       "JAN",
// //       "FEB",
// //       "MAR",
// //       "APR",
// //       "MAY",
// //       "JUN",
// //       "JUL",
// //       "AUG",
// //       "SEP",
// //       "OCT",
// //       "NOV",
// //       "DEC",
// //     ];
// //     return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]}`;
// //   };

// //   const formatDateRange = (startDate: Date, endDate: Date): string => {
// //     const startStr = formatDateForDisplay(startDate);
// //     const endStr = formatDateForDisplay(endDate);
// //     return `${startStr} - ${endStr}`;
// //   };

// //   // Use the monthly capacity API instead of separate queries
// //   const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`;
// //   const {
// //     data: monthlyCapacityData,
// //     isLoading: monthlyLoading,
// //     error: monthlyError,
// //   } = useMonthlyCapacity(
// //     currentOrganization?.id || "",
// //     session?.user.id || "",
// //     monthStr,
// //     {
// //       only_active: true,
// //     }
// //   );

// //   // Generate weeks for the selected month - use data from API if available
// //   const weeksData: WeekData[] = useMemo(() => {
// //     // If we have monthly data, use the weeks from the API
// //     if (monthlyCapacityData?.weeks && monthlyCapacityData.weeks.length > 0) {
// //       return monthlyCapacityData.weeks.map(
// //         (week: { week_start_date: string }, index: number) => {
// //           const weekStart = new Date(week.week_start_date);
// //           const weekEnd = new Date(weekStart);
// //           weekEnd.setDate(weekStart.getDate() + 6); // Sunday

// //           const monthNames = [
// //             "JAN",
// //             "FEB",
// //             "MAR",
// //             "APR",
// //             "MAY",
// //             "JUN",
// //             "JUL",
// //             "AUG",
// //             "SEP",
// //             "OCT",
// //             "NOV",
// //             "DEC",
// //           ];
// //           const startDateStr = `${String(weekStart.getDate()).padStart(2, "0")} ${monthNames[weekStart.getMonth()]}`;
// //           const isValidDate = (d: Date) =>
// //             d instanceof Date && !isNaN(d.getTime());

// //           if (!isValidDate(weekStart) || !isValidDate(weekEnd)) {
// //             console.error("Invalid week dates:", { weekStart, weekEnd });
// //             return null; // or skip this week
// //           }
// //           return {
// //             weekNumber: `W${String(index + 1).padStart(2, "0")}`,
// //             startDate: weekStart.toISOString(),
// //             endDate: weekEnd.toISOString(),
// //             label: startDateStr,
// //           };
// //         }
// //       );
// //     }

// //     // Fallback: generate weeks manually if API data not available
// //     const weeks: WeekData[] = [];
// //     const monthStart = new Date(selectedYear, selectedMonth, 1);
// //     const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

// //     const firstDayOfWeek = monthStart.getDay();
// //     const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

// //     let currentWeekStart = new Date(monthStart);
// //     currentWeekStart.setDate(monthStart.getDate() - daysToMonday);
// //     let weekCount = 0;
// //     while (currentWeekStart <= monthEnd && weekCount < 6) {
// //       const dayOfWeek = currentWeekStart.getDay();
// //       const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
// //       const daysUntilSunday = 6 - mondayBasedDay;

// //       const weekEnd = new Date(currentWeekStart);
// //       weekEnd.setDate(currentWeekStart.getDate() + daysUntilSunday);
// //       const actualWeekEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

// //       const weekNumber = `W${String(weekCount + 1).padStart(2, "0")}`;
// //       const monthNames = [
// //         "JAN",
// //         "FEB",
// //         "MAR",
// //         "APR",
// //         "MAY",
// //         "JUN",
// //         "JUL",
// //         "AUG",
// //         "SEP",
// //         "OCT",
// //         "NOV",
// //         "DEC",
// //       ];
// //       const startDateStr = `${String(currentWeekStart.getDate()).padStart(2, "0")} ${monthNames[currentWeekStart.getMonth()]}`;

// //       weeks.push({
// //         weekNumber,
// //         startDate: currentWeekStart.toISOString(),
// //         endDate: actualWeekEnd.toISOString(),
// //         label: startDateStr,
// //       });

// //       const nextWeekStart = new Date(actualWeekEnd);
// //       nextWeekStart.setDate(actualWeekEnd.getDate() + 1);

// //       if (nextWeekStart > monthEnd) {
// //         break;
// //       }

// //       currentWeekStart = nextWeekStart;
// //       weekCount++;
// //     }

// //     return weeks;
// //   }, [selectedMonth, selectedYear, monthlyCapacityData]);

// //   const addProjectMutation = useMutation({
// //     mutationFn: async (projectData: any) => {
// //       const response = await fetch("/api/capacity/project-assignments", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(projectData),
// //       });

// //       if (!response.ok) {
// //         const errorData = await response.json();
// //         throw new Error(errorData.error || "Failed to add project assignment");
// //       }

// //       return response.json();
// //     },
// //     onSuccess: () => {
// //       // Refresh the monthly capacity query
// //       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] });
// //       toast.success("Project assignment added successfully!");
// //       setAddForm({
// //         projectId: "",
// //         hours: 8,
// //         includeWeekends: false,
// //         startDate: new Date().toISOString().split("T")[0],
// //       });
// //       setAddModalTarget(null);
// //     },
// //     onError: (error: Error) => {
// //       console.error("Project assignment error:", error);
// //       toast.error(error.message || "Failed to add project assignment");
// //     },
// //   });

// //   const updateWeeklyPlanMutation = useMutation({
// //     mutationFn: async (data: {
// //       weeklyPlanId: string;
// //       hoursSunday: number;
// //       hoursMonday: number;
// //       hoursTuesday: number;
// //       hoursWednesday: number;
// //       hoursThursday: number;
// //       hoursFriday: number;
// //       hoursSaturday: number;
// //       isLinked: boolean;
// //     }) => {
// //       const response = await fetch("/api/capacity/weekly-plans", {
// //         method: "PUT",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(data),
// //       });

// //       if (!response.ok) {
// //         const errorData = await response.json();
// //         throw new Error(errorData.error || "Failed to update weekly plan");
// //       }

// //       return response.json();
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] });
// //     },
// //     onError: (error: Error) => {
// //       console.error("Update weekly plan error:", error);
// //       toast.error(error.message || "Failed to update weekly plan");
// //     },
// //   });


// //     const {
// //       data: projectAssignments = [],
// //       isLoading: assignmentsLoading,
// //       refetch: refetchAssignments,
// //     } = useQuery({
// //       queryKey: ["project-assignments", currentOrganization?.id],
// //       queryFn: () =>
// //         fetchProjectAssignments(currentOrganization?.id || ""),
// //       enabled: !!currentOrganization?.id,
// //       staleTime: 5 * 60 * 1000,
// //     });

// //   const deleteProjectAssignmentMutation = useMutation({
// //     mutationFn: async (assignmentId: string) => {
// //       const response = await fetch(
// //         `/api/capacity/project-assignments?assignmentId=${assignmentId}`,
// //         {
// //           method: "DELETE",
// //         }
// //       );

// //       if (!response.ok) {
// //         const errorData = await response.json();
// //         throw new Error(
// //           errorData.error || "Failed to delete project assignment"
// //         );
// //       }

// //       return response.json();
// //     },
// //     onSuccess: () => {
// //       // Refresh the monthly capacity query
// //       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] });
// //       toast.success("Project assignment deleted successfully!");
// //       setDeletingTarget(null);
// //     },
// //     onError: (error: Error) => {
// //       console.error("Delete project assignment error:", error);
// //       toast.error(error.message || "Failed to delete project assignment");
// //     },
// //   });

// //   const createWeeklyPlanMutation = useMutation({
// //     mutationFn: async (data: {
// //       organizationId: string;
// //       resourceAllocationId: string;
// //       projectId: string;
// //       projectAssignmentId: string;
// //       weekStartDate: string;
// //       defaultHoursPerDay: number;
// //       allowWeekends: boolean;
// //       hoursSunday: number;
// //       hoursMonday: number;
// //       hoursTuesday: number;
// //       hoursWednesday: number;
// //       hoursThursday: number;
// //       hoursFriday: number;
// //       hoursSaturday: number;
// //     }) => {
// //       const response = await fetch("/api/capacity/weekly-plans", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(data),
// //       });

// //       if (!response.ok) {
// //         const errorData = await response.json();
// //         throw new Error(errorData.error || "Failed to create weekly plan");
// //       }

// //       return response.json();
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] });
// //     },
// //     onError: (error: Error) => {
// //       console.error("Create weekly plan error:", error);
// //       toast.error(error.message || "Failed to create weekly plan");
// //     },
// //   });

// //   const handleAddProject = async () => {
// //     if (!addModalTarget || !addForm.projectId) {
// //       setAddModalTarget(null);
// //       return;
// //     }

// //     try {
// //       // Step 1: Create the project assignment first
// //       const projectData = {
// //         organizationId: currentOrganization?.id,
// //         resourceAllocationId: addModalTarget,
// //         projectId: addForm.projectId,
// //         hoursPerWeek: addForm.hours * 5, // Convert daily to weekly
// //         defaultHoursPerDay: addForm.hours,
// //         allowWeekends: addForm.includeWeekends,
// //         startDate: new Date().toISOString(),
// //         // Don't pass weekStartDate here - we'll create all weekly plans separately
// //       };

// //       const assignmentResponse =
// //         await addProjectMutation.mutateAsync(projectData);
// //       const projectAssignmentId = assignmentResponse.projectAssignment?.id;

// //       if (!projectAssignmentId) {
// //         throw new Error("Failed to create project assignment");
// //       }

// //       // Step 2: Create weekly plans for ALL weeks in the current month
// //       const today = startOfDay(new Date());
// //       const dailyHours = addForm.hours;
// //       const weekdayHours = dailyHours;
// //       const weekendHours = addForm.includeWeekends ? dailyHours : 0;

// //       // Create weekly plans for each week in the month
// //       const weeklyPlanPromises = weeksData.map(async (week) => {
// //         const weekStart = startOfDay(parseISO(week.startDate));
// //         const weekEnd = startOfDay(parseISO(week.endDate));

// //         const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 });

// //         // Calculate the Sunday of this week (6 days after Monday)
// //         const weekSunday = addDays(weekMonday, 6);

// //         // Calculate hours for each day of the week
// //         let hoursSunday = 0;
// //         let hoursMonday = 0;
// //         let hoursTuesday = 0;
// //         let hoursWednesday = 0;
// //         let hoursThursday = 0;
// //         let hoursFriday = 0;
// //         let hoursSaturday = 0;

// //         // Get all days in this week
// //         const weekDays = eachDayOfInterval({
// //           start: weekMonday,
// //           end: weekSunday,
// //         });

// //         weekDays.forEach((day) => {
// //           const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// //           const isDayPast = isPast(day) && !isToday(day);

// //           // If day is in the past, set hours to 0
// //           if (isDayPast) {
// //             return; // Hours already initialized to 0
// //           }

// //           // If day is today or in the future, set hours based on day type
// //           if (dayOfWeek === 0) {
// //             // Sunday
// //             hoursSunday = weekendHours;
// //           } else if (dayOfWeek === 1) {
// //             // Monday
// //             hoursMonday = weekdayHours;
// //           } else if (dayOfWeek === 2) {
// //             // Tuesday
// //             hoursTuesday = weekdayHours;
// //           } else if (dayOfWeek === 3) {
// //             // Wednesday
// //             hoursWednesday = weekdayHours;
// //           } else if (dayOfWeek === 4) {
// //             // Thursday
// //             hoursThursday = weekdayHours;
// //           } else if (dayOfWeek === 5) {
// //             // Friday
// //             hoursFriday = weekdayHours;
// //           } else if (dayOfWeek === 6) {
// //             // Saturday
// //             hoursSaturday = weekendHours;
// //           }
// //         });

// //         console.log("weekStartDate", weekMonday.toISOString());

// //         // Create weekly plan via API
// //         const weeklyPlanResponse = await fetch("/api/capacity/weekly-plans", {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           body: JSON.stringify({
// //             organizationId: currentOrganization?.id,
// //             resourceAllocationId: addModalTarget,
// //             projectId: addForm.projectId,
// //             projectAssignmentId: projectAssignmentId,
// //             weekStartDate: weekMonday.toISOString(),
// //             defaultHoursPerDay: dailyHours,
// //             allowWeekends: addForm.includeWeekends,
// //             // Override daily hours based on past/current/future logic
// //             hoursSunday,
// //             hoursMonday,
// //             hoursTuesday,
// //             hoursWednesday,
// //             hoursThursday,
// //             hoursFriday,
// //             hoursSaturday,
// //           }),
// //         });

// //         if (!weeklyPlanResponse.ok) {
// //           const errorData = await weeklyPlanResponse.json();
// //           throw new Error(errorData.error || "Failed to create weekly plan");
// //         }

// //         return weeklyPlanResponse.json();
// //       });

// //       // Wait for all weekly plans to be created
// //       await Promise.all(weeklyPlanPromises);

// //       // Refresh the monthly capacity query
// //       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] });

// //       toast.success(
// //         "Project assignment and weekly plans created successfully!"
// //       );
// //       setAddForm({
// //         projectId: "",
// //         hours: 8,
// //         includeWeekends: false,
// //         startDate: new Date().toISOString().split("T")[0],
// //       });
// //       setAddModalTarget(null);
// //     } catch (error: any) {
// //       console.error("Add project error:", error);
// //       toast.error(error.message || "Failed to add project assignment");
// //     }
// //   };

// //     const {
// //       data: resources,
// //       isLoading,
// //       error,
// //       refetch,
// //     } = useQuery({
// //       queryKey: ["resources", currentOrganization?.id],
// //       queryFn: () => fetchResources(currentOrganization?.id || "",session?.user.id),
// //       enabled: !!currentOrganization?.id, // Only fetch when organization ID is available
// //       staleTime: 5 * 60 * 1000, // 5 minutes
// //     });

// //   // Weekly plans are now included in monthlyCapacityData

// //   const handleSaveWeeklyHours = async () => {
// //     if (!savingTarget) return;

// //     const { memberId, projectId } = savingTarget;
// //     const key = `${memberId}:${projectId}`;
// //     const editedHours = editedWeeklyHours[key];

// //     if (!editedHours || editedHours.length === 0) {
// //       toast.error("No weekly hours to save");
// //       setSavingTarget(null);
// //       setConfirmationText("");
// //       return;
// //     }

// //     // Find the project assignment from monthly data
// //     const resource = monthlyCapacityData?.resources?.find(
// //       (r: any) => r.resource_allocation_id === memberId
// //     );

// //     const weekData = resource?.weeks?.[0];
// //     const projectData = weekData?.projects?.find(
// //       (p: any) => p.project?.id === projectId
// //     );

// //     if (!projectData || !resource) {
// //       toast.error("Project assignment not found");
// //       setSavingTarget(null);
// //       setConfirmationText("");
// //       return;
// //     }

// //     setIsSaving(true);

// //     try {
// //       // For each week, update or create weekly plan
// //       const updatePromises = weeksData.map(async (week, weekIndex) => {
// //         const weeklyHours = editedHours[weekIndex] || 0;

// //         // Calculate Monday of the week
// //         const weekStart = startOfDay(parseISO(week.startDate));
// //         const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 });

// //         // Find existing weekly plan from monthly data
// //         const weekDataForWeek = resource.weeks?.find(
// //           (w: any) => w.week_start_date === week.startDate.split("T")[0]
// //         );
// //         const existingPlan = weekDataForWeek?.projects?.find(
// //           (p: any) => p.project?.id === projectId
// //         );

// //         // Calculate hours per day (distribute evenly)
// //         // Check if weekends are allowed from project data
// //         const allowWeekends = projectData.allow_weekends || false;
// //         const daysPerWeek = allowWeekends ? 7 : 5;
// //         const hoursPerDay = weeklyHours / daysPerWeek;

// //         const hoursSunday = allowWeekends ? hoursPerDay : 0;
// //         const hoursMonday = hoursPerDay;
// //         const hoursTuesday = hoursPerDay;
// //         const hoursWednesday = hoursPerDay;
// //         const hoursThursday = hoursPerDay;
// //         const hoursFriday = hoursPerDay;
// //         const hoursSaturday = allowWeekends ? hoursPerDay : 0;

// //         // Use the upsert API which handles both create and update
// //         const response = await fetch("/api/capacity/weekly-plans", {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           body: JSON.stringify({
// //             organizationId: currentOrganization?.id || "",
// //             resourceAllocationId: memberId,
// //             projectId: projectId,
// //             weekStartDate: weekMonday.toISOString(),
// //             defaultHoursPerDay: hoursPerDay,
// //             allowWeekends: allowWeekends,
// //             hoursSunday,
// //             hoursMonday,
// //             hoursTuesday,
// //             hoursWednesday,
// //             hoursThursday,
// //             hoursFriday,
// //             hoursSaturday,
// //           }),
// //         });

// //         if (!response.ok) {
// //           const errorData = await response.json();
// //           throw new Error(errorData.error || "Failed to save weekly plan");
// //         }
// //       });

// //       await Promise.all(updatePromises);

// //       toast.success("Weekly hours saved successfully!");
// //       setEditingTarget(null);
// //       setSavingTarget(null);
// //       setConfirmationText("");

// //       // Clear edited hours after successful save
// //       setEditedWeeklyHours((prev) => {
// //         const newState = { ...prev };
// //         delete newState[key];
// //         return newState;
// //       });
// //     } catch (error: any) {
// //       console.error("Save weekly hours error:", error);
// //       toast.error(error.message || "Failed to save weekly hours");
// //     } finally {
// //       setIsSaving(false);
// //     }
// //   };

// //   const getUtilizationColor = (allocated: number, capacity: number) => {
// //     const percentage = (allocated / capacity) * 100;
// //     if (percentage > 100) return "bg-red-500";
// //     if (percentage >= 80) return "bg-yellow-500";
// //     if (percentage >= 60) return "bg-green-500";
// //     return "bg-yellow-500";
// //   };

// //   const getUtilizationTextColor = (allocated: number, capacity: number) => {
// //     const percentage = (allocated / capacity) * 100;
// //     if (percentage > 100) return "text-red-700";
// //     if (percentage >= 80) return "text-yellow-700";
// //     if (percentage >= 60) return "text-green-700";
// //     return "text-yellow-700";
// //   };

// //   const getStatusLabel = (allocated: number, capacity: number) => {
// //     const percentage = (allocated / capacity) * 100;
// //     if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`;
// //     return "";
// //   };

// //   const toggleMemberExpansion = (memberId: string) => {
// //     setExpandedMembers((prev) => {
// //       const newSet = new Set(prev);
// //       if (newSet.has(memberId)) {
// //         newSet.delete(memberId);
// //       } else {
// //         newSet.add(memberId);
// //       }
// //       return newSet;
// //     });
// //   };

// //   const isEditing = (memberId: string, projectId: string) =>
// //     editingTarget?.memberId === memberId &&
// //     editingTarget?.projectId === projectId;

// //   const ensureWeeklyInitialized = (
// //     memberId: string,
// //     projectId: string,
// //     weeksCount: number
// //   ) => {
// //     const key = `${memberId}:${projectId}`;
// //     const allocation = members
// //       .find((m) => m.id === memberId)
// //       ?.allocations.find((a) => a.projectId === projectId);

// //     if (!allocation) return;

// //     // Initialize edited hours if not already set
// //     if (!editedWeeklyHours[key]) {
// //       const currentWeeklyHours =
// //         allocation.weeklyHours && allocation.weeklyHours.length === weeksCount
// //           ? allocation.weeklyHours
// //           : Array.from({ length: weeksCount }, () => allocation.hours);

// //       setEditedWeeklyHours((prev) => ({
// //         ...prev,
// //         [key]: [...currentWeeklyHours],
// //       }));
// //     }
// //   };

// //   const updateAllocationWeeklyHour = (
// //     memberId: string,
// //     projectId: string,
// //     weekIndex: number,
// //     value: number,
// //     weeksCount: number
// //   ) => {
// //     const key = `${memberId}:${projectId}`;

// //     setEditedWeeklyHours((prev) => {
// //       const current = prev[key] || [];
// //       // Ensure array has correct length
// //       const arr =
// //         current.length === weeksCount
// //           ? [...current]
// //           : Array.from({ length: weeksCount }, (_, i) => current[i] ?? 0);

// //       arr[weekIndex] = Math.max(0, Number.isFinite(value) ? value : 0);

// //       return {
// //         ...prev,
// //         [key]: arr,
// //       };
// //     });
// //   };

// //   const members: Member[] = useMemo(() => {
// //     if (!monthlyCapacityData?.resources) return [];

// //     return monthlyCapacityData.resources.map((resource: any) => {
// //       const userInfo = resource.user;

// //       // Get all projects across all weeks for this resource
// //       const projectMap = new Map<
// //         string,
// //         {
// //           projectId: string;
// //           projectName: string;
// //           weeklyHours: number[];
// //         }
// //       >();

// //       // Process each week's projects
// //       resource.weeks.forEach((week: any, weekIndex: number) => {
// //         week.projects.forEach((projectData: any) => {
// //           if (!projectData.project) return;

// //           const projectId = projectData.project.id;
// //           const key = `${resource.resource_allocation_id}:${projectId}`;
// //           const editedHours = editedWeeklyHours[key];

// //           // Use edited hours if available, otherwise use API data
// //           const weeklyHours =
// //             editedHours && editedHours[weekIndex] !== undefined
// //               ? editedHours[weekIndex]
// //               : projectData.weekly_hours || 0;

// //           if (!projectMap.has(projectId)) {
// //             projectMap.set(projectId, {
// //               projectId,
// //               projectName: projectData.project.name || "Unknown Project",
// //               weeklyHours: new Array(weeksData.length).fill(0),
// //             });
// //           }

// //           const project = projectMap.get(projectId)!;
// //           if (weekIndex < project.weeklyHours.length) {
// //             project.weeklyHours[weekIndex] = weeklyHours;
// //           }
// //         });
// //       });

// //       // Convert map to array
// //       const allocations = Array.from(projectMap.values()).map((project) => {
// //         const avgHours =
// //           project.weeklyHours.reduce((sum, h) => sum + h, 0) /
// //             project.weeklyHours.length || 0;
// //         return {
// //           projectId: project.projectId,
// //           projectName: project.projectName,
// //           hours: avgHours,
// //           weeklyHours: project.weeklyHours,
// //         };
// //       });

// //       return {
// //         id: resource.resource_allocation_id,
// //         fullName: userInfo?.full_name || "Unknown User",
// //         jobTitle: userInfo?.position || "No Position",
// //         avatarUrl: userInfo?.avatar_url,
// //         capacity: resource.weekly_capacity_hours / 5, // Daily capacity
// //         allocations,
// //       };
// //     });
// //   }, [monthlyCapacityData, weeksData, editedWeeklyHours]);

// //   console.log("members", members);

// //   // Calculate total monthly capacity
// //   const totalMonthlyCapacity = useMemo(() => {
// //     const monthStart = new Date(selectedYear, selectedMonth, 1);
// //     const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
// //     const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
// //     const workingDays = allDays.filter((day) => !isWeekend(day)).length;

// //     return members.reduce((sum, member) => {
// //       // Monthly capacity = daily capacity × working days in month
// //       return sum + member.capacity * workingDays;
// //     }, 0);
// //   }, [members, selectedMonth, selectedYear]);

// //   const totalMonthlyAllocated = useMemo(() => {
// //     if (monthlyCapacityData?.resources) {
// //       // Use API data - sum all used hours across all resources and weeks
// //       return monthlyCapacityData.resources.reduce(
// //         (sum: number, resource: any) => {
// //           const resourceTotal = resource.weeks.reduce(
// //             (weekSum: number, week: any) => {
// //               return weekSum + (week.used || 0);
// //             },
// //             0
// //           );
// //           return sum + resourceTotal;
// //         },
// //         0
// //       );
// //     }

// //     // Fallback to members calculation
// //     return members.reduce((sum, member) => {
// //       const memberAllocated = member.allocations.reduce(
// //         (allocSum, allocation) => {
// //           // Sum all weekly hours
// //           const weeklyTotal = allocation.weeklyHours.reduce(
// //             (weekSum, hours) => {
// //               return weekSum + Number(hours);
// //             },
// //             0
// //           );
// //           return allocSum + weeklyTotal;
// //         },
// //         0
// //       );
// //       return sum + memberAllocated;
// //     }, 0);
// //   }, [members, monthlyCapacityData]);

// //   const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated;

// //   if (monthlyLoading) {
// //     return (
// //       <div className="flex items-center justify-center h-64">
// //         <div className="text-lg text-gray-600">Loading capacity data...</div>
// //       </div>
// //     );
// //   }

// //   if (monthlyError) {
// //     return (
// //       <div className="flex items-center justify-center h-64">
// //         <div className="text-lg text-red-600">
// //           Error:{" "}
// //           {monthlyError instanceof Error
// //             ? monthlyError.message
// //             : "Failed to load capacity data"}
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (members.length === 0) {
// //     return (
// //       <div className="flex flex-col items-center justify-center h-64 space-y-4">
// //         <div className="text-lg text-gray-600">No resources allocated yet</div>
// //         <button
// //           onClick={onAddResource}
// //           className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
// //         >
// //           Add First Resource
// //         </button>
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       {/* Capacity Overview */}
// //       <div className="px-6 py-4 border-b border-gray-200">
// //         <div className="flex items-center justify-between">
// //           <h2 className="text-lg font-semibold text-gray-900">
// //             Monthly Capacity Overview
// //           </h2>
// //           <div className="flex items-center space-x-2">
// //             <span className="text-sm text-gray-500">
// //               Total Monthly Capacity:
// //             </span>
// //             <span className="text-sm font-medium text-gray-900">
// //               {totalMonthlyCapacity}h
// //             </span>
// //             <span className="text-sm text-gray-500">|</span>
// //             <span className="text-sm text-gray-500">Monthly Allocated:</span>
// //             <span className="text-sm font-medium text-gray-900">
// //               {totalMonthlyAllocated}h
// //             </span>
// //             <span className="text-sm text-gray-500">|</span>
// //             <span className="text-sm text-gray-500">Available:</span>
// //             <span className="text-sm font-medium text-green-600">
// //               {totalMonthlyAvailable}h
// //             </span>
// //           </div>
// //         </div>
// //       </div>

// //       <div className="overflow-x-auto">
// //         <ConfirmationModal
// //           isOpen={Boolean(deletingTarget)}
// //           onClose={() => setDeletingTarget(null)}
// //           onConfirm={async () => {
// //             if (!deletingTarget || !deletingTarget.assignmentId) return;

// //             try {
// //               // Delete the project assignment (this will cascade delete all weekly plans)
// //               await deleteProjectAssignmentMutation.mutateAsync(
// //                 deletingTarget.assignmentId
// //               );
// //             } catch (error) {
// //               // Error is handled by mutation
// //               // Don't close the modal on error so user can retry
// //             }
// //           }}
// //           title="Delete Project Assignment"
// //           message={
// //             deletingTarget?.projectName
// //               ? `Are you sure you want to delete the project assignment "${deletingTarget.projectName}"? This will permanently delete the assignment and all related weekly plans. This action cannot be undone.`
// //               : "Are you sure you want to delete this project assignment? This will permanently delete the assignment and all related weekly plans. This action cannot be undone."
// //           }
// //           isLoading={deleteProjectAssignmentMutation.isPending}
// //         />
// //         <table className="min-w-full">
// //           <thead>
// //             <tr className="border-b border-gray-200">
// //               <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
// //                 RESOURCE
// //               </th>
// //               <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
// //                 MONTHLY CAPACITY
// //               </th>
// //               {weeksData.map((week) => {
// //                 const weekStartDate = new Date(week.startDate);
// //                 const weekEndDate = new Date(week.endDate);
// //                 const dateRangeTooltip = formatDateRange(
// //                   weekStartDate,
// //                   weekEndDate
// //                 );

// //                 return (
// //                   <th
// //                     key={week.weekNumber}
// //                     className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help"
// //                     title={dateRangeTooltip}
// //                   >
// //                     <div>{week.weekNumber}</div>
// //                     <div className="text-xs text-gray-400">{week.label}</div>
// //                   </th>
// //                 );
// //               })}
// //               <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
// //                 Actions
// //               </th>
// //             </tr>
// //           </thead>
// //           <tbody className="divide-y divide-gray-100">
// //             {members.map((member, idx) => {
// //               const memberId = member.id;
// //               const isExpanded = expandedMembers.has(memberId);

// //               // Calculate monthly capacity: count working days in the month
// //               const monthStart = new Date(selectedYear, selectedMonth, 1);
// //               const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
// //               const allDays = eachDayOfInterval({
// //                 start: monthStart,
// //                 end: monthEnd,
// //               });
// //               const workingDays = allDays.filter(
// //                 (day) => !isWeekend(day)
// //               ).length;
// //               const monthlyCapacity = member.capacity * workingDays;

// //               const totalAllocated = member.allocations.reduce(
// //                 (sum, allocation) => {
// //                   // Sum all weekly hours for this allocation across all weeks
// //                   const allocationTotal = (allocation.weeklyHours || []).reduce(
// //                     (weekSum, hours) => weekSum + (Number(hours) || 0),
// //                     0
// //                   );
// //                   return sum + allocationTotal;
// //                 },
// //                 0
// //               );

// //               const utilizationPercentage =
// //                 monthlyCapacity > 0
// //                   ? (totalAllocated / monthlyCapacity) * 100
// //                   : 0;
// //               const statusLabel = getStatusLabel(
// //                 totalAllocated,
// //                 monthlyCapacity
// //               );

// //               return (
// //                 <React.Fragment key={memberId}>
// //                   {/* Member Header Row */}
// //                   <tr className="bg-gray-50">
// //                     <td className="px-6 py-4">
// //                       <div className="flex items-center">
// //                         <button
// //                           onClick={() => toggleMemberExpansion(memberId)}
// //                           className="mr-2 p-1 hover:bg-gray-200 rounded"
// //                         >
// //                           {isExpanded ? (
// //                             <ChevronUp className="h-4 w-4 text-gray-500" />
// //                           ) : (
// //                             <ChevronDown className="h-4 w-4 text-gray-500" />
// //                           )}
// //                         </button>
// //                         <div>
// //                           <div className="font-medium text-gray-900">
// //                             {member.fullName}
// //                           </div>
// //                           <div className="text-sm text-gray-500">
// //                             {member.jobTitle}
// //                           </div>
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td className="px-4 py-4">
// //                       <div className="text-xs font-semibold text-gray-500">
// //                         {totalAllocated.toFixed(1)}/{monthlyCapacity.toFixed(1)}{" "}
// //                         h
// //                       </div>
// //                       <div className="flex items-center gap-3">
// //                         <div className="flex-1 relative">
// //                           <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
// //                             <div
// //                               className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(totalAllocated, member.capacity)}`}
// //                               style={{
// //                                 width: `${Math.min(utilizationPercentage, 100)}%`,
// //                               }}
// //                             ></div>
// //                           </div>
// //                         </div>
// //                         <div className="flex items-center gap-2 min-w-[100px]">
// //                           <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
// //                             {Math.round(utilizationPercentage)}%
// //                           </span>
// //                           {statusLabel && (
// //                             <span
// //                               className={`text-xs font-medium whitespace-nowrap ${getUtilizationTextColor(totalAllocated, member.capacity)}`}
// //                             >
// //                               {statusLabel}
// //                             </span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </td>
// //                     {weeksData.map((week, weekIndex) => {
// //                       const weekAllocated = member.allocations.reduce(
// //                         (sum, allocation) => {
// //                           return (
// //                             sum +
// //                             (Number(allocation.weeklyHours?.[weekIndex]) || 0)
// //                           );
// //                         },
// //                         0
// //                       );
// //                       const weekCapacity = member.capacity * 5;
// //                       const weekUtilization =
// //                         weekCapacity > 0
// //                           ? (weekAllocated / weekCapacity) * 100
// //                           : 0;

// //                       return (
// //                         <td
// //                           key={week.weekNumber}
// //                           className="px-4 py-4 text-center"
// //                         >
// //                           <div className="flex flex-col items-center gap-1">
// //                             <div
// //                               className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(
// //                                 weekAllocated,
// //                                 weekCapacity
// //                               )}`}
// //                             >
// //                               {weekAllocated.toFixed(1)}h
// //                             </div>
// //                             <div className="text-xs text-gray-500">
// //                               {weekUtilization.toFixed(0)}%
// //                             </div>
// //                           </div>
// //                         </td>
// //                       );
// //                     })}
// //                     <td className="px-4 py-4 text-center"></td>
// //                   </tr>

// //                   {/* Expanded Project Rows */}
// //                   {isExpanded &&
// //                     member.allocations.map((allocation) => (
// //                       <tr key={allocation.projectId} className="bg-gray-25">
// //                         <td className="px-6 py-3 pl-12">
// //                           <div className="font-medium text-gray-700 cursor-pointer hover:text-orange-600">
// //                             {allocation.projectName}
// //                           </div>
// //                         </td>
// //                         <td className="px-4 py-3"></td>
// //                         {weeksData.map((week, weekIdx) => {
// //                           const weekKey = week.startDate;
// //                           const weekState = capacityStore
// //                             .getState()
// //                             .getWeekState(
// //                               memberId,
// //                               allocation.projectId,
// //                               weekKey
// //                             );
// //                           const linked = weekState ? weekState.linked : true;
// //                           const weekTotal = weekState
// //                             ? weekState.dailyHours.reduce(
// //                                 (acc, v) => acc + v,
// //                                 0
// //                               )
// //                             : (allocation.weeklyHours?.[weekIdx] ??
// //                               allocation.hours);
// //                           return (
// //                             <td
// //                               key={week.weekNumber}
// //                               className="px-4 py-3 text-center"
// //                             >
// //                               {isEditing(memberId, allocation.projectId) ? (
// //                                 linked ? (
// //                                   <input
// //                                     type="number"
// //                                     className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
// //                                     value={weekTotal}
// //                                     min={0}
// //                                     onChange={(e) => {
// //                                       const val = Math.max(
// //                                         0,
// //                                         Number(e.target.value)
// //                                       );
// //                                       updateAllocationWeeklyHour(
// //                                         memberId,
// //                                         allocation.projectId,
// //                                         weekIdx,
// //                                         val,
// //                                         weeksData.length
// //                                       );
// //                                       capacityStore
// //                                         .getState()
// //                                         .getOrInit(
// //                                           memberId,
// //                                           allocation.projectId,
// //                                           weekKey,
// //                                           val,
// //                                           false
// //                                         );
// //                                       capacityStore
// //                                         .getState()
// //                                         .setWeekTotal(
// //                                           memberId,
// //                                           allocation.projectId,
// //                                           weekKey,
// //                                           val
// //                                         );
// //                                     }}
// //                                   />
// //                                 ) : (
// //                                   <span className="text-sm text-gray-400">
// //                                     {weekTotal}h
// //                                   </span>
// //                                 )
// //                               ) : (
// //                                 <span className="text-sm text-gray-600">
// //                                   {weekTotal}h
// //                                 </span>
// //                               )}
// //                             </td>
// //                           );
// //                         })}
// //                         <td className="px-4 py-3 text-center">
// //                           <div className="inline-flex items-center gap-3">
// //                             {isEditing(memberId, allocation.projectId) ? (
// //                               <>
// //                                 <button
// //                                   className="text-green-600 hover:text-green-800"
// //                                   title="Save changes"
// //                                   onClick={() => {
// //                                     setSavingTarget({
// //                                       memberId,
// //                                       projectId: allocation.projectId,
// //                                       projectName: allocation.projectName,
// //                                     });
// //                                     setConfirmationText("");
// //                                   }}
// //                                 >
// //                                   <Check className="h-4 w-4" />
// //                                 </button>
// //                                 <button
// //                                   className="text-gray-600 hover:text-gray-800"
// //                                   title="Cancel editing"
// //                                   onClick={() => {
// //                                     setEditingTarget(null);
// //                                     const key = `${memberId}:${allocation.projectId}`;
// //                                     setEditedWeeklyHours((prev) => {
// //                                       const newState = { ...prev };
// //                                       delete newState[key];
// //                                       return newState;
// //                                     });
// //                                     // Reset weekly hours to original values
// //                                     queryClient.invalidateQueries({
// //                                       queryKey: ["weekly-plans"],
// //                                     });
// //                                   }}
// //                                 >
// //                                   <X className="h-4 w-4" />
// //                                 </button>
// //                               </>
// //                             ) : (
// //                               <>
// //                                 <button
// //                                   className="text-gray-600 hover:text-gray-800"
// //                                   title="Edit allocation"
// //                                   onClick={() => {
// //                                     ensureWeeklyInitialized(
// //                                       memberId,
// //                                       allocation.projectId,
// //                                       weeksData.length
// //                                     );
// //                                     setEditingTarget({
// //                                       memberId,
// //                                       projectId: allocation.projectId,
// //                                     });
// //                                   }}
// //                                 >
// //                                   <Pencil className="h-4 w-4" />
// //                                 </button>
// //                                 <button
// //                                   onClick={() => {
// //                                     // Find assignment from monthly data
// //                                     const resource =
// //                                       monthlyCapacityData?.resources?.find(
// //                                         (r: any) =>
// //                                           r.resource_allocation_id === memberId
// //                                       );
// //                                     const assignment =
// //                                       resource?.weeks?.[0]?.projects?.find(
// //                                         (p: any) =>
// //                                           p.project?.id === allocation.projectId
// //                                       );

// //                                     // For deletion, we need to find the project assignment
// //                                     // We'll need to fetch it or use the project ID directly
// //                                     // The API can handle deletion by project and resource
// //                                     setDeletingTarget({
// //                                       memberId,
// //                                       projectId: allocation.projectId,
// //                                       projectName: allocation.projectName,
// //                                     });
// //                                   }}
// //                                   className="text-red-600 hover:text-red-800"
// //                                   title="Delete project assignment"
// //                                 >
// //                                   <Trash className="h-4 w-4" />
// //                                 </button>
// //                               </>
// //                             )}
// //                           </div>
// //                         </td>
// //                       </tr>
// //                     ))}

// //                   {/* Expanded Project Rows */}
// //                   {isExpanded &&
// //                     member.allocations.map((allocation) => (
// //                       <tr key={allocation.projectId} className="bg-gray-25">
// //                         <td className="px-6 py-3 pl-12">
// //                           <div className="font-medium text-gray-700 cursor-pointer hover:text-orange-600">
// //                             {allocation.projectName}
// //                           </div>
// //                         </td>
// //                         <td className="px-4 py-3"></td>
// //                         {daysData.map((day) => {
// //                           const isWeekend =
// //                             day.dayOfWeek === 0 || day.dayOfWeek === 6;
// //                           return (
// //                             <td
// //                               key={day.dayName}
// //                               className="px-4 py-3 text-center"
// //                             >
// //                               {isWeekend && !allocation.includeWeekends ? (
// //                                 <span className="text-sm text-gray-300">-</span>
// //                               ) : isEditing(memberId, allocation.projectId) ? (
// //                                 (() => {
// //                                   const dayIsPast = isDayInPast(day.date);
// //                                   return (
// //                                     <input
// //                                       type="number"
// //                                       className={`w-16 border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 ${
// //                                         dayIsPast
// //                                           ? "opacity-50 cursor-not-allowed bg-gray-100"
// //                                           : ""
// //                                       }`}
// //                                       value={
// //                                         editedDailyHours[
// //                                           `${memberId}:${allocation.projectId}`
// //                                         ]?.[day.dayOfWeek] ??
// //                                         allocation.dailyHours?.[
// //                                           day.dayOfWeek
// //                                         ] ??
// //                                         0
// //                                       }
// //                                       min={0}
// //                                       max={24}
// //                                       step={0.5}
// //                                       disabled={dayIsPast}
// //                                       onChange={(e) => {
// //                                         if (dayIsPast) return;
// //                                         updateEditedDailyHour(
// //                                           memberId,
// //                                           allocation.projectId,
// //                                           day.dayOfWeek,
// //                                           Number(e.target.value)
// //                                         );
// //                                       }}
// //                                       title={
// //                                         dayIsPast
// //                                           ? "Cannot edit past dates"
// //                                           : ""
// //                                       }
// //                                     />
// //                                   );
// //                                 })()
// //                               ) : (
// //                                 <span className="text-sm text-gray-600">
// //                                   {allocation.dailyHours?.[day.dayOfWeek] ??
// //                                     allocation.hours}
// //                                   h
// //                                 </span>
// //                               )}
// //                             </td>
// //                           );
// //                         })}
// //                         <td className="px-4 py-3 text-center">
// //                           <div className="inline-flex items-center gap-3">
// //                             <button
// //                               className="text-gray-600 hover:text-gray-800"
// //                               title={
// //                                 isEditing(memberId, allocation.projectId)
// //                                   ? "Save changes"
// //                                   : "Edit allocation"
// //                               }
// //                               onClick={() => {
// //                                 if (isEditing(memberId, allocation.projectId)) {
// //                                   // Save changes
// //                                   handleSaveEdit(
// //                                     memberId,
// //                                     allocation.projectId,
// //                                     allocation
// //                                   );
// //                                 } else {
// //                                   // Start editing
// //                                   handleStartEdit(
// //                                     memberId,
// //                                     allocation.projectId,
// //                                     allocation
// //                                   );
// //                                 }
// //                               }}
// //                               disabled={
// //                                 updateWeeklyPlanMutation.isPending ||
// //                                 createWeeklyPlanMutation.isPending
// //                               }
// //                             >
// //                               {isEditing(memberId, allocation.projectId) ? (
// //                                 <Save className="h-4 w-4" />
// //                               ) : (
// //                                 <Pencil className="h-4 w-4" />
// //                               )}
// //                             </button>
// //                             <button
// //                               onClick={() => {
// //                                 // Find the project assignment to get the assignment ID
// //                                 const assignment = projectAssignments.find(
// //                                   (pa: ProjectAssignment) =>
// //                                     pa.resourceAllocationId === memberId &&
// //                                     pa.projectId === allocation.projectId
// //                                 );

// //                                 if (assignment) {
// //                                   // Set up deletion target with assignment ID and project name
// //                                   setDeletingTarget({
// //                                     memberId,
// //                                     projectId: allocation.projectId,
// //                                     assignmentId: assignment.id,
// //                                     projectName: allocation.projectName,
// //                                   });
// //                                 } else {
// //                                   toast.error("Project assignment not found");
// //                                 }
// //                               }}
// //                               className="text-red-600 hover:text-red-800"
// //                               title="Delete project assignment"
// //                             >
// //                               <Trash className="h-4 w-4" />
// //                             </button>
// //                             <button
// //                               className={`${
// //                                 linkedStatus[
// //                                   `${memberId}:${allocation.projectId}`
// //                                 ] !== false
// //                                   ? "text-orange-600"
// //                                   : "text-gray-400"
// //                               } hover:text-orange-700`}
// //                               title={
// //                                 linkedStatus[
// //                                   `${memberId}:${allocation.projectId}`
// //                                 ] !== false
// //                                   ? "Linked (edit one updates all future days)"
// //                                   : "Unlinked (edit days separately)"
// //                               }
// //                               onClick={() => {
// //                                 toggleLinked(
// //                                   memberId,
// //                                   allocation.projectId,
// //                                   allocation
// //                                 );
// //                               }}
// //                             >
// //                               {linkedStatus[
// //                                 `${memberId}:${allocation.projectId}`
// //                               ] !== false ? (
// //                                 <LinkIcon className="h-4 w-4" />
// //                               ) : (
// //                                 <Unlink className="h-4 w-4" />
// //                               )}
// //                             </button>
// //                           </div>
// //                         </td>
// //                       </tr>
// //                     ))}

// //                   {/* Add Project Row */}
// //                   {isExpanded && (
// //                     <tr>
// //                       <td
// //                         className="px-6 py-3 pl-12"
// //                         colSpan={weeksData.length + 3}
// //                       >
// //                         <button
// //                           onClick={() => {
// //                             setAddModalTarget(memberId);
// //                             setAddForm({
// //                               hours: 1,
// //                               projectId: "",
// //                               includeWeekends: false,
// //                               startDate: new Date().toISOString().split("T")[0],
// //                             });
// //                           }}
// //                           className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium"
// //                         >
// //                           <Plus className="h-4 w-4 mr-1" />
// //                           Add Project
// //                         </button>
// //                       </td>
// //                     </tr>
// //                   )}
// //                 </React.Fragment>
// //               );
// //             })}
// //           </tbody>
// //         </table>
// //       </div>

// //       {addModalTarget && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
// //           <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
// //             <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
// //               <h3 className="text-lg font-semibold text-gray-900">
// //                 Add Project
// //               </h3>
// //             </div>
// //             <div className="px-6 py-4 space-y-4">
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-1">
// //                   Project
// //                 </label>
// //                 <select
// //                   value={addForm.projectId}
// //                   onChange={(e) =>
// //                     setAddForm({ ...addForm, projectId: e.target.value })
// //                   }
// //                   className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
// //                 >
// //                   <option value="">Select a project</option>
// //                   {projects.map((project) => (
// //                     <option key={project.id} value={project.id}>
// //                       {project.name}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-1">
// //                   Hours per workday
// //                 </label>
// //                 <input
// //                   type="number"
// //                   className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
// //                   min={0}
// //                   max={24}
// //                   step={0.5}
// //                   value={addForm.hours}
// //                   onChange={(e) =>
// //                     setAddForm((f) => ({
// //                       ...f,
// //                       hours: Math.max(0, Number(e.target.value)),
// //                     }))
// //                   }
// //                 />
// //               </div>
// //               <label className="inline-flex items-center gap-2 text-sm text-gray-700">
// //                 <input
// //                   type="checkbox"
// //                   className="h-4 w-4"
// //                   checked={addForm.includeWeekends}
// //                   onChange={(e) =>
// //                     setAddForm((f) => ({
// //                       ...f,
// //                       includeWeekends: e.target.checked,
// //                     }))
// //                   }
// //                 />
// //                 Enable weekends
// //               </label>
// //             </div>
// //             <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
// //               <button
// //                 className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
// //                 onClick={() => {
// //                   setAddModalTarget(null);
// //                   setAddForm({
// //                     projectId: "",
// //                     hours: 8,
// //                     includeWeekends: false,
// //                     startDate: new Date().toISOString().split("T")[0],
// //                   });
// //                 }}
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
// //                 onClick={handleAddProject}
// //                 disabled={addProjectMutation.isPending || !addForm.projectId}
// //               >
// //                 {addProjectMutation.isPending ? "Adding..." : "Add"}
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Save Confirmation Modal */}
// //       {savingTarget && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
// //           <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
// //             <div className="px-6 py-4 border-b border-gray-200">
// //               <div className="flex items-center gap-3">
// //                 <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
// //                   <AlertTriangle className="h-6 w-6 text-red-600" />
// //                 </div>
// //                 <div>
// //                   <h3 className="text-lg font-semibold text-gray-900">
// //                     Override Daily Allocations
// //                   </h3>
// //                   <p className="text-sm text-gray-500">
// //                     This action will override previously set daily-based
// //                     allocations
// //                   </p>
// //                 </div>
// //               </div>
// //             </div>
// //             <div className="px-6 py-4 space-y-4">
// //               <div className="bg-red-50 border border-red-200 rounded-md p-4">
// //                 <p className="text-sm font-medium text-red-800 mb-2">
// //                   ⚠️ Severe Warning
// //                 </p>
// //                 <p className="text-sm text-red-700">
// //                   Saving these weekly hours will{" "}
// //                   <strong>permanently override</strong> any daily-based time
// //                   allocations you have set for{" "}
// //                   <strong>{savingTarget.projectName}</strong>. The hours will be
// //                   distributed evenly across all days in each week.
// //                 </p>
// //               </div>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Type <strong>"CONFIRM"</strong> to proceed:
// //                 </label>
// //                 <input
// //                   type="text"
// //                   className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
// //                   value={confirmationText}
// //                   onChange={(e) => setConfirmationText(e.target.value)}
// //                   placeholder="Type CONFIRM here"
// //                   autoFocus
// //                 />
// //               </div>
// //             </div>
// //             <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
// //               <button
// //                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
// //                 onClick={() => {
// //                   setSavingTarget(null);
// //                   setConfirmationText("");
// //                 }}
// //                 disabled={isSaving}
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
// //                 onClick={handleSaveWeeklyHours}
// //                 disabled={isSaving || confirmationText !== "CONFIRM"}
// //               >
// //                 {isSaving ? (
// //                   <>
// //                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
// //                     Saving...
// //                   </>
// //                 ) : (
// //                   "Save & Override"
// //                 )}
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </>
// //   );
// // }

// "use client"

// import React, { useState, useMemo } from "react"
// import { ChevronDown, ChevronUp, Plus, Trash, AlertTriangle } from "lucide-react"
// import ConfirmationModal from "@/components/ui/ConfirmationModal"
// import { useOrganizationStore } from "@/lib/stores/organizationStore"
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
// import { useMonthlyCapacity } from "@/lib/hooks/useCapacity"
// import {
//   startOfWeek,
//   startOfDay,
//   parseISO,
//   eachDayOfInterval,
//   isWeekend,
//   isPast,
//   isToday,
//   addDays,
//   getDay,
// } from "date-fns"
// import { toast } from "sonner"
// import { useSession } from "next-auth/react"

// interface ResourceAllocation {
//   id: string
//   organizationMemberId: string
//   weeklyCapacityHours: number
//   hourlyRate?: number
//   isActive: boolean
//   isArchived: boolean
//   createdAt: string
//   updatedAt: string
//   organization_members: {
//     id: string
//     user_id: string
//     status: string
//     roles?: { id: string; name: string }
//     users: {
//       id: string
//       full_name: string
//       email: string
//       avatar_url?: string
//       position?: string
//     }
//   } | null
// }

// interface ProjectAssignment {
//   id: string
//   projectId: string
//   projectName: string
//   resourceAllocationId: string
//   hoursPerWeek: number
//   defaultHoursPerDay: number
//   allowWeekends: boolean
//   startDate: string
//   endDate?: string | null
//   notes?: string | null
// }

// interface ProjectWeeklyPlan {
//   id: string
//   resourceAllocationId: string
//   projectId: string
//   projectAssignmentId: string
//   weekStartDate: string
//   hoursSunday: number | null
//   hoursMonday: number | null
//   hoursTuesday: number | null
//   hoursWednesday: number | null
//   hoursThursday: number | null
//   hoursFriday: number | null
//   hoursSaturday: number | null
// }

// interface Member {
//   id: string
//   fullName: string
//   jobTitle: string
//   avatarUrl?: string
//   capacity: number // Daily capacity
//   allocations: Array<{
//     projectId: string
//     projectName: string
//     hours: number // Default weekly hours
//     weeklyHours: number[] // per week allocations aligned with weeksData
//     assignmentId?: string // Added to store assignmentId
//     defaultHoursPerDay: number // Added to store default hours per day
//     allowWeekends: boolean // Added to store weekend allowance
//   }>
// }

// interface WeekData {
//   weekNumber: string
//   startDate: string
//   endDate: string
//   label: string
// }

// interface MonthlyCapacityTableProps {
//   selectedMonth?: number
//   selectedYear?: number
//   onAddResource?: () => void
// }

// interface Project {
//   id: string
//   name: string
//   description?: string
//   status: string
// }

// interface AddProjectForm {
//   projectId: string
//   hours: number
//   includeWeekends: boolean
//   startDate: string
//   endDate?: string
//   notes?: string
// }

// const fetchResources = async (organizationId: string, userId: string): Promise<ResourceAllocation[]> => {
//   if (!organizationId) throw new Error("Organization ID is required")

//   const response = await fetch(
//     `/api/capacity/resources?organizationId=${organizationId}&userId=${userId}&only_active=true`,
//   )

//   if (!response.ok) {
//     throw new Error(`Failed to fetch resources: ${response.status}`)
//   }

//   const data = await response.json()
//   return data.resources || []
// }

// const fetchProjectAssignments = async (organizationId: string): Promise<ProjectAssignment[]> => {
//   if (!organizationId) return []

//   const response = await fetch(`/api/capacity/project-assignments?organizationId=${organizationId}`)
//   if (!response.ok) throw new Error("Failed to fetch project assignments")
//   const data = await response.json()
//   return data.assignments || []
// }

// const fetchWeeklyPlansForMonth = async (
//   organizationId: string,
//   month: number,
//   year: number,
// ): Promise<ProjectWeeklyPlan[]> => {
//   if (!organizationId) return []

//   // Fetch weekly plans for the month
//   const response = await fetch(
//     `/api/capacity/weekly-plans?organizationId=${organizationId}&month=${month}&year=${year}`,
//   )
//   if (!response.ok) return []
//   const data = await response.json()
//   return data.weeklyPlans || []
// }

// const fetchProjects = async (organizationId: string): Promise<Project[]> => {
//   const response = await fetch(`/api/projects?organizationId=${organizationId}`)
//   if (!response.ok) throw new Error("Failed to fetch projects")
//   const data = await response.json()
//   return data.projects || []
// }

// export default function MonthlyCapacityTable({
//   selectedMonth = new Date().getMonth(),
//   selectedYear = new Date().getFullYear(),
//   onAddResource,
// }: MonthlyCapacityTableProps) {
//   const queryClient = useQueryClient()
//   const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
//   const { data: session } = useSession()

//   const { currentOrganization } = useOrganizationStore()
//   const [deletingTarget, setDeletingTarget] = useState<{
//     memberId: string
//     projectId: string
//     assignmentId?: string // Add this to store assignment ID
//     projectName?: string // Add this for better confirmation message
//   } | null>(null)
//   const [editingTarget, setEditingTarget] = useState<{
//     memberId: string
//     projectId: string
//   } | null>(null)
//   const [addModalTarget, setAddModalTarget] = useState<string | null>(null) // memberId
//   const [addForm, setAddForm] = useState<AddProjectForm>({
//     projectId: "",
//     hours: 8,
//     includeWeekends: false,
//     startDate: new Date().toISOString().split("T")[0],
//   })
//   const [savingTarget, setSavingTarget] = useState<{
//     memberId: string
//     projectId: string
//     projectName: string
//   } | null>(null)
//   const [confirmationText, setConfirmationText] = useState("")
//   const [isSaving, setIsSaving] = useState(false)
//   const [editedWeeklyHours, setEditedWeeklyHours] = useState<{
//     [key: string]: number[] // key: "memberId:projectId", value: array of weekly hours
//   }>({})

//   const { data: projects = [], isLoading: projectsLoading } = useQuery({
//     queryKey: ["projects", currentOrganization?.id],
//     queryFn: () => fetchProjects(currentOrganization?.id || ""),
//     enabled: !!currentOrganization?.id,
//   })

//   const formatDateForDisplay = (date: Date): string => {
//     const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
//     return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]}`
//   }

//   const formatDateRange = (startDate: Date, endDate: Date): string => {
//     const startStr = formatDateForDisplay(startDate)
//     const endStr = formatDateForDisplay(endDate)
//     return `${startStr} - ${endStr}`
//   }

//   // Use the monthly capacity API instead of separate queries
//   const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`
//   const {
//     data: monthlyCapacityData,
//     isLoading: monthlyLoading,
//     error: monthlyError,
//   } = useMonthlyCapacity(currentOrganization?.id || "", session?.user.id || "", monthStr, {
//     only_active: true,
//   })

//   // Generate weeks for the selected month - use data from API if available
//   const weeksData: WeekData[] = useMemo(() => {
//     // If we have monthly data, use the weeks from the API
//     if (monthlyCapacityData?.weeks && monthlyCapacityData.weeks.length > 0) {
//       return monthlyCapacityData.weeks.map((week: { week_start_date: string }, index: number) => {
//         const weekStart = new Date(week.week_start_date)
//         const weekEnd = new Date(weekStart)
//         weekEnd.setDate(weekStart.getDate() + 6) // Sunday

//         const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
//         const startDateStr = `${String(weekStart.getDate()).padStart(2, "0")} ${monthNames[weekStart.getMonth()]}`
//         const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime())

//         if (!isValidDate(weekStart) || !isValidDate(weekEnd)) {
//           console.error("Invalid week dates:", { weekStart, weekEnd })
//           return null // or skip this week
//         }
//         return {
//           weekNumber: `W${String(index + 1).padStart(2, "0")}`,
//           startDate: weekStart.toISOString(),
//           endDate: weekEnd.toISOString(),
//           label: startDateStr,
//         }
//       })
//     }

//     // Fallback: generate weeks manually if API data not available
//     const weeks: WeekData[] = []
//     const monthStart = new Date(selectedYear, selectedMonth, 1)
//     const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)

//     const firstDayOfWeek = monthStart.getDay()
//     const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

//     let currentWeekStart = new Date(monthStart)
//     currentWeekStart.setDate(monthStart.getDate() - daysToMonday)
//     let weekCount = 0
//     while (currentWeekStart <= monthEnd && weekCount < 6) {
//       const dayOfWeek = currentWeekStart.getDay()
//       const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
//       const daysUntilSunday = 6 - mondayBasedDay

//       const weekEnd = new Date(currentWeekStart)
//       weekEnd.setDate(currentWeekStart.getDate() + daysUntilSunday)
//       const actualWeekEnd = weekEnd > monthEnd ? monthEnd : weekEnd

//       const weekNumber = `W${String(weekCount + 1).padStart(2, "0")}`
//       const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
//       const startDateStr = `${String(currentWeekStart.getDate()).padStart(2, "0")} ${monthNames[currentWeekStart.getMonth()]}`

//       weeks.push({
//         weekNumber,
//         startDate: currentWeekStart.toISOString(),
//         endDate: actualWeekEnd.toISOString(),
//         label: startDateStr,
//       })

//       const nextWeekStart = new Date(actualWeekEnd)
//       nextWeekStart.setDate(actualWeekEnd.getDate() + 1)

//       if (nextWeekStart > monthEnd) {
//         break
//       }

//       currentWeekStart = nextWeekStart
//       weekCount++
//     }

//     return weeks
//   }, [selectedMonth, selectedYear, monthlyCapacityData])

//   const addProjectMutation = useMutation({
//     mutationFn: async (projectData: any) => {
//       const response = await fetch("/api/capacity/project-assignments", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(projectData),
//       })

//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.error || "Failed to add project assignment")
//       }

//       return response.json()
//     },
//     onSuccess: () => {
//       // Refresh the monthly capacity query
//       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })
//       toast.success("Project assignment added successfully!")
//       setAddForm({
//         projectId: "",
//         hours: 8,
//         includeWeekends: false,
//         startDate: new Date().toISOString().split("T")[0],
//       })
//       setAddModalTarget(null)
//     },
//     onError: (error: Error) => {
//       console.error("Project assignment error:", error)
//       toast.error(error.message || "Failed to add project assignment")
//     },
//   })

//   const updateWeeklyPlanMutation = useMutation({
//     mutationFn: async (data: {
//       weeklyPlanId: string
//       hoursSunday: number
//       hoursMonday: number
//       hoursTuesday: number
//       hoursWednesday: number
//       hoursThursday: number
//       hoursFriday: number
//       hoursSaturday: number
//       isLinked: boolean
//     }) => {
//       const response = await fetch("/api/capacity/weekly-plans", {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       })

//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.error || "Failed to update weekly plan")
//       }

//       return response.json()
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })
//     },
//     onError: (error: Error) => {
//       console.error("Update weekly plan error:", error)
//       toast.error(error.message || "Failed to update weekly plan")
//     },
//   })

//   const {
//     data: projectAssignments = [],
//     isLoading: assignmentsLoading,
//     refetch: refetchAssignments,
//   } = useQuery({
//     queryKey: ["project-assignments", currentOrganization?.id],
//     queryFn: () => fetchProjectAssignments(currentOrganization?.id || ""),
//     enabled: !!currentOrganization?.id,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   })

//   const deleteProjectAssignmentMutation = useMutation({
//     mutationFn: async (assignmentId: string) => {
//       const response = await fetch(`/api/capacity/project-assignments?assignmentId=${assignmentId}`, {
//         method: "DELETE",
//       })

//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.error || "Failed to delete project assignment")
//       }

//       return response.json()
//     },
//     onSuccess: () => {
//       // Refresh the monthly capacity query
//       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })
//       toast.success("Project assignment deleted successfully!")
//       setDeletingTarget(null)
//     },
//     onError: (error: Error) => {
//       console.error("Delete project assignment error:", error)
//       toast.error(error.message || "Failed to delete project assignment")
//     },
//   })

//   const createWeeklyPlanMutation = useMutation({
//     mutationFn: async (data: {
//       organizationId: string
//       resourceAllocationId: string
//       projectId: string
//       projectAssignmentId: string
//       weekStartDate: string
//       defaultHoursPerDay: number
//       allowWeekends: boolean
//       hoursSunday: number
//       hoursMonday: number
//       hoursTuesday: number
//       hoursWednesday: number
//       hoursThursday: number
//       hoursFriday: number
//       hoursSaturday: number
//     }) => {
//       const response = await fetch("/api/capacity/weekly-plans", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       })

//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.error || "Failed to create weekly plan")
//       }

//       return response.json()
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })
//     },
//     onError: (error: Error) => {
//       console.error("Create weekly plan error:", error)
//       toast.error(error.message || "Failed to create weekly plan")
//     },
//   })

//   const handleAddProject = async () => {
//     if (!addModalTarget || !addForm.projectId) {
//       setAddModalTarget(null)
//       return
//     }

//     try {
//       // Step 1: Create the project assignment first
//       const projectData = {
//         organizationId: currentOrganization?.id,
//         resourceAllocationId: addModalTarget,
//         projectId: addForm.projectId,
//         hoursPerWeek: addForm.hours * 5, // Convert daily to weekly
//         defaultHoursPerDay: addForm.hours,
//         allowWeekends: addForm.includeWeekends,
//         startDate: new Date().toISOString(),
//         // Don't pass weekStartDate here - we'll create all weekly plans separately
//       }

//       const assignmentResponse = await addProjectMutation.mutateAsync(projectData)
//       const projectAssignmentId = assignmentResponse.projectAssignment?.id

//       if (!projectAssignmentId) {
//         throw new Error("Failed to create project assignment")
//       }

//       // Step 2: Create weekly plans for ALL weeks in the current month
//       const today = startOfDay(new Date())
//       const dailyHours = addForm.hours
//       const weekdayHours = dailyHours
//       const weekendHours = addForm.includeWeekends ? dailyHours : 0

//       // Create weekly plans for each week in the month
//       const weeklyPlanPromises = weeksData.map(async (week) => {
//         const weekStart = startOfDay(parseISO(week.startDate))
//         const weekEnd = startOfDay(parseISO(week.endDate))

//         const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 })

//         // Calculate the Sunday of this week (6 days after Monday)
//         const weekSunday = addDays(weekMonday, 6)

//         // Calculate hours for each day of the week
//         let hoursSunday = 0
//         let hoursMonday = 0
//         let hoursTuesday = 0
//         let hoursWednesday = 0
//         let hoursThursday = 0
//         let hoursFriday = 0
//         let hoursSaturday = 0

//         // Get all days in this week
//         const weekDays = eachDayOfInterval({
//           start: weekMonday,
//           end: weekSunday,
//         })

//         weekDays.forEach((day) => {
//           const dayOfWeek = getDay(day) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
//           const isDayPast = isPast(day) && !isToday(day)

//           // If day is in the past, set hours to 0
//           if (isDayPast) {
//             return // Hours already initialized to 0
//           }

//           // If day is today or in the future, set hours based on day type
//           if (dayOfWeek === 0) {
//             // Sunday
//             hoursSunday = weekendHours
//           } else if (dayOfWeek === 1) {
//             // Monday
//             hoursMonday = weekdayHours
//           } else if (dayOfWeek === 2) {
//             // Tuesday
//             hoursTuesday = weekdayHours
//           } else if (dayOfWeek === 3) {
//             // Wednesday
//             hoursWednesday = weekdayHours
//           } else if (dayOfWeek === 4) {
//             // Thursday
//             hoursThursday = weekdayHours
//           } else if (dayOfWeek === 5) {
//             // Friday
//             hoursFriday = weekdayHours
//           } else if (dayOfWeek === 6) {
//             // Saturday
//             hoursSaturday = weekendHours
//           }
//         })

//         console.log("weekStartDate", weekMonday.toISOString())

//         // Create weekly plan via API
//         const weeklyPlanResponse = await fetch("/api/capacity/weekly-plans", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             organizationId: currentOrganization?.id,
//             resourceAllocationId: addModalTarget,
//             projectId: addForm.projectId,
//             projectAssignmentId: projectAssignmentId,
//             weekStartDate: weekMonday.toISOString(),
//             defaultHoursPerDay: dailyHours,
//             allowWeekends: addForm.includeWeekends,
//             // Override daily hours based on past/current/future logic
//             hoursSunday,
//             hoursMonday,
//             hoursTuesday,
//             hoursWednesday,
//             hoursThursday,
//             hoursFriday,
//             hoursSaturday,
//           }),
//         })

//         if (!weeklyPlanResponse.ok) {
//           const errorData = await weeklyPlanResponse.json()
//           throw new Error(errorData.error || "Failed to create weekly plan")
//         }

//         return weeklyPlanResponse.json()
//       })

//       // Wait for all weekly plans to be created
//       await Promise.all(weeklyPlanPromises)

//       // Refresh the monthly capacity query
//       queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })

//       toast.success("Project assignment and weekly plans created successfully!")
//       setAddForm({
//         projectId: "",
//         hours: 8,
//         includeWeekends: false,
//         startDate: new Date().toISOString().split("T")[0],
//       })
//       setAddModalTarget(null)
//     } catch (error: any) {
//       console.error("Add project error:", error)
//       toast.error(error.message || "Failed to add project assignment")
//     }
//   }

//   const {
//     data: resources,
//     isLoading,
//     error,
//     refetch,
//   } = useQuery({
//     queryKey: ["resources", currentOrganization?.id],
//     queryFn: () => fetchResources(currentOrganization?.id || "", session?.user.id || ""),
//     enabled: !!currentOrganization?.id, // Only fetch when organization ID is available
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   })

//   // Weekly plans are now included in monthlyCapacityData

//   const handleSaveWeeklyHours = async () => {
//     if (!savingTarget) return

//     const { memberId, projectId } = savingTarget
//     const key = `${memberId}:${projectId}`
//     const editedHours = editedWeeklyHours[key]

//     if (!editedHours || editedHours.length === 0) {
//       toast.error("No weekly hours to save")
//       setSavingTarget(null)
//       setConfirmationText("")
//       return
//     }

//     // Find the project assignment from monthly data
//     const resource = monthlyCapacityData?.resources?.find((r: any) => r.resource_allocation_id === memberId)

//     const weekData = resource?.weeks?.[0]
//     const projectData = weekData?.projects?.find((p: any) => p.project?.id === projectId)

//     if (!projectData || !resource) {
//       toast.error("Project assignment not found")
//       setSavingTarget(null)
//       setConfirmationText("")
//       return
//     }

//     setIsSaving(true)

//     try {
//       // For each week, update or create weekly plan
//       const updatePromises = weeksData.map(async (week, weekIndex) => {
//         const weeklyHours = editedHours[weekIndex] || 0

//         // Calculate Monday of the week
//         const weekStart = startOfDay(parseISO(week.startDate))
//         const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 })

//         // Find existing weekly plan from monthly data
//         const weekDataForWeek = resource.weeks?.find((w: any) => w.week_start_date === week.startDate.split("T")[0])
//         const existingPlan = weekDataForWeek?.projects?.find((p: any) => p.project?.id === projectId)

//         // Calculate hours per day (distribute evenly)
//         // Check if weekends are allowed from project data
//         const allowWeekends = projectData.allow_weekends || false
//         const daysPerWeek = allowWeekends ? 7 : 5
//         const hoursPerDay = weeklyHours / daysPerWeek

//         const hoursSunday = allowWeekends ? hoursPerDay : 0
//         const hoursMonday = hoursPerDay
//         const hoursTuesday = hoursPerDay
//         const hoursWednesday = hoursPerDay
//         const hoursThursday = hoursPerDay
//         const hoursFriday = hoursPerDay
//         const hoursSaturday = allowWeekends ? hoursPerDay : 0

//         // Use the upsert API which handles both create and update
//         const response = await fetch("/api/capacity/weekly-plans", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             organizationId: currentOrganization?.id || "",
//             resourceAllocationId: memberId,
//             projectId: projectId,
//             weekStartDate: weekMonday.toISOString(),
//             defaultHoursPerDay: hoursPerDay,
//             allowWeekends: allowWeekends,
//             hoursSunday,
//             hoursMonday,
//             hoursTuesday,
//             hoursWednesday,
//             hoursThursday,
//             hoursFriday,
//             hoursSaturday,
//           }),
//         })

//         if (!response.ok) {
//           const errorData = await response.json()
//           throw new Error(errorData.error || "Failed to save weekly plan")
//         }
//       })

//       await Promise.all(updatePromises)

//       toast.success("Weekly hours saved successfully!")
//       setEditingTarget(null)
//       setSavingTarget(null)
//       setConfirmationText("")

//       // Clear edited hours after successful save
//       setEditedWeeklyHours((prev) => {
//         const newState = { ...prev }
//         delete newState[key]
//         return newState
//       })
//     } catch (error: any) {
//       console.error("Save weekly hours error:", error)
//       toast.error(error.message || "Failed to save weekly hours")
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   const getUtilizationColor = (allocated: number, capacity: number) => {
//     const percentage = (allocated / capacity) * 100
//     if (percentage > 100) return "bg-red-500"
//     if (percentage >= 80) return "bg-yellow-500"
//     if (percentage >= 60) return "bg-green-500"
//     return "bg-yellow-500"
//   }

//   const getUtilizationTextColor = (allocated: number, capacity: number) => {
//     const percentage = (allocated / capacity) * 100
//     if (percentage > 100) return "text-red-700"
//     if (percentage >= 80) return "text-yellow-700"
//     if (percentage >= 60) return "text-green-700"
//     return "text-yellow-700"
//   }

//   const getStatusLabel = (allocated: number, capacity: number) => {
//     const percentage = (allocated / capacity) * 100
//     if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`
//     return ""
//   }

//   const toggleMemberExpansion = (memberId: string) => {
//     setExpandedMembers((prev) => {
//       const newSet = new Set(prev)
//       if (newSet.has(memberId)) {
//         newSet.delete(memberId)
//       } else {
//         newSet.add(memberId)
//       }
//       return newSet
//     })
//   }

//   const isEditing = (memberId: string, projectId: string) =>
//     editingTarget?.memberId === memberId && editingTarget?.projectId === projectId

//   const ensureWeeklyInitialized = (memberId: string, projectId: string, weeksCount: number) => {
//     const key = `${memberId}:${projectId}`
//     const allocation = members.find((m) => m.id === memberId)?.allocations.find((a) => a.projectId === projectId)

//     if (!allocation) return

//     // Initialize edited hours if not already set
//     if (!editedWeeklyHours[key]) {
//       const currentWeeklyHours =
//         allocation.weeklyHours && allocation.weeklyHours.length === weeksCount
//           ? allocation.weeklyHours
//           : Array.from({ length: weeksCount }, () => allocation.hours)

//       setEditedWeeklyHours((prev) => ({
//         ...prev,
//         [key]: [...currentWeeklyHours],
//       }))
//     }
//   }

//   const updateAllocationWeeklyHour = (
//     memberId: string,
//     projectId: string,
//     weekIndex: number,
//     value: number,
//     weeksCount: number,
//   ) => {
//     const key = `${memberId}:${projectId}`

//     setEditedWeeklyHours((prev) => {
//       const current = prev[key] || []
//       // Ensure array has correct length
//       const arr =
//         current.length === weeksCount ? [...current] : Array.from({ length: weeksCount }, (_, i) => current[i] ?? 0)

//       arr[weekIndex] = Math.max(0, Number.isFinite(value) ? value : 0)

//       return {
//         ...prev,
//         [key]: arr,
//       }
//     })
//   }

//   const members: Member[] = useMemo(() => {
//     if (!monthlyCapacityData?.resources) return []

//     return monthlyCapacityData.resources.map((resource: any) => {
//       const userInfo = resource.user
//       const resourceId = resource.resource_allocation_id

//       // 1. Get all assignments for this resource
//       const assignmentsForResource = projectAssignments.filter((pa: any) => pa.resourceAllocationId === resourceId)

//       // 2. Map assignments to allocations
//       const allocations = assignmentsForResource.map((assignment: any) => {
//         const projectId = assignment.projectId
//         const projectName = assignment.projectName || "Unknown Project"

//         // Initialize weekly hours for all weeks in weeksData
//         const weeklyHours = new Array(weeksData.length).fill(0)

//         // 3. Fill in hours from monthlyCapacityData.resources[].weeks
//         resource.weeks.forEach((week: any, weekIndex: number) => {
//           // Look for this project in the API's week data
//           const projectData = week.projects?.find((p: any) => p.project?.id === projectId)

//           if (projectData) {
//             const key = `${resourceId}:${projectId}`
//             const editedHours = editedWeeklyHours[key]

//             weeklyHours[weekIndex] =
//               editedHours && editedHours[weekIndex] !== undefined
//                 ? editedHours[weekIndex]
//                 : projectData.weekly_hours || 0
//           }
//         })

//         const avgHours = weeklyHours.reduce((sum, h) => sum + h, 0) / weeklyHours.length || 0

//         return {
//           projectId,
//           projectName,
//           hours: avgHours,
//           weeklyHours,
//           assignmentId: assignment.id,
//           defaultHoursPerDay: assignment.defaultHoursPerDay || 0,
//           allowWeekends: assignment.allowWeekends || false,
//         }
//       })

//       return {
//         id: resourceId,
//         fullName: userInfo?.full_name || "Unknown User",
//         jobTitle: userInfo?.position || "No Position",
//         avatarUrl: userInfo?.avatar_url,
//         capacity: resource.weekly_capacity_hours / 5,
//         allocations,
//       }
//     })
//   }, [monthlyCapacityData, weeksData, editedWeeklyHours, projectAssignments])

//   console.log("[v0] Monthly Table Members mapped:", members)

//   // Calculate total monthly capacity
//   const totalMonthlyCapacity = useMemo(() => {
//     const monthStart = new Date(selectedYear, selectedMonth, 1)
//     const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
//     const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
//     const workingDays = allDays.filter((day) => !isWeekend(day)).length

//     return members.reduce((sum, member) => {
//       // Monthly capacity = daily capacity × working days in month
//       return sum + member.capacity * workingDays
//     }, 0)
//   }, [members, selectedMonth, selectedYear])

//   const totalMonthlyAllocated = useMemo(() => {
//     if (monthlyCapacityData?.resources) {
//       // Use API data - sum all used hours across all resources and weeks
//       return monthlyCapacityData.resources.reduce((sum: number, resource: any) => {
//         const resourceTotal = resource.weeks.reduce((weekSum: number, week: any) => {
//           return weekSum + (week.used || 0)
//         }, 0)
//         return sum + resourceTotal
//       }, 0)
//     }

//     // Fallback to members calculation
//     return members.reduce((sum, member) => {
//       const memberAllocated = member.allocations.reduce((allocSum, allocation) => {
//         // Sum all weekly hours
//         const weeklyTotal = allocation.weeklyHours.reduce((weekSum, hours) => {
//           return weekSum + Number(hours)
//         }, 0)
//         return allocSum + weeklyTotal
//       }, 0)
//       return sum + memberAllocated
//     }, 0)
//   }, [members, monthlyCapacityData])

//   const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated

//   if (monthlyLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-lg text-gray-600">Loading capacity data...</div>
//       </div>
//     )
//   }

//   if (monthlyError) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-lg text-red-600">
//           Error: {monthlyError instanceof Error ? monthlyError.message : "Failed to load capacity data"}
//         </div>
//       </div>
//     )
//   }

//   if (members.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center h-64 space-y-4">
//         <div className="text-lg text-gray-600">No resources allocated yet</div>
//         <button onClick={onAddResource} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
//           Add First Resource
//         </button>
//       </div>
//     )
//   }

//   return (
//     <>
//       {/* Capacity Overview */}
//       <div className="px-6 py-4 border-b border-gray-200">
//         <div className="flex items-center justify-between">
//           <h2 className="text-lg font-semibold text-gray-900">Monthly Capacity Overview</h2>
//           <div className="flex items-center space-x-2">
//             <span className="text-sm text-gray-500">Total Monthly Capacity:</span>
//             <span className="text-sm font-medium text-gray-900">{totalMonthlyCapacity}h</span>
//             <span className="text-sm text-gray-500">|</span>
//             <span className="text-sm text-gray-500">Monthly Allocated:</span>
//             <span className="text-sm font-medium text-gray-900">{totalMonthlyAllocated}h</span>
//             <span className="text-sm text-gray-500">|</span>
//             <span className="text-sm text-gray-500">Available:</span>
//             <span className="text-sm font-medium text-green-600">{totalMonthlyAvailable}h</span>
//           </div>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <ConfirmationModal
//           isOpen={Boolean(deletingTarget)}
//           onClose={() => setDeletingTarget(null)}
//           onConfirm={async () => {
//             if (!deletingTarget || !deletingTarget.assignmentId) return

//             try {
//               // Delete the project assignment (this will cascade delete all weekly plans)
//               await deleteProjectAssignmentMutation.mutateAsync(deletingTarget.assignmentId)
//             } catch (error) {
//               // Error is handled by mutation
//               // Don't close the modal on error so user can retry
//             }
//           }}
//           title="Delete Project Assignment"
//           message={
//             deletingTarget?.projectName
//               ? `Are you sure you want to delete the project assignment "${deletingTarget.projectName}"? This will permanently delete the assignment and all related weekly plans. This action cannot be undone.`
//               : "Are you sure you want to delete this project assignment? This will permanently delete the assignment and all related weekly plans. This action cannot be undone."
//           }
//           isLoading={deleteProjectAssignmentMutation.isPending}
//         />
//         <table className="min-w-full">
//           <thead>
//             <tr className="border-b border-gray-200">
//               <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
//                 RESOURCE
//               </th>
//               <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
//                 MONTHLY CAPACITY
//               </th>
//               {weeksData.map((week) => {
//                 const weekStartDate = new Date(week.startDate)
//                 const weekEndDate = new Date(week.endDate)
//                 const dateRangeTooltip = formatDateRange(weekStartDate, weekEndDate)

//                 return (
//                   <th
//                     key={week.weekNumber}
//                     className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help"
//                     title={dateRangeTooltip}
//                   >
//                     <div>{week.weekNumber}</div>
//                     <div className="text-xs text-gray-400">{week.label}</div>
//                   </th>
//                 )
//               })}
//               <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
//                 Actions
//               </th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {members.map((member, idx) => {
//               const memberId = member.id
//               const isExpanded = expandedMembers.has(memberId)

//               // Calculate monthly capacity: count working days in the month
//               const monthStart = new Date(selectedYear, selectedMonth, 1)
//               const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
//               const allDays = eachDayOfInterval({
//                 start: monthStart,
//                 end: monthEnd,
//               })
//               const workingDays = allDays.filter((day) => !isWeekend(day)).length
//               const monthlyCapacity = member.capacity * workingDays

//               const totalAllocated = member.allocations.reduce((sum, allocation) => {
//                 // Sum all weekly hours for this allocation across all weeks
//                 const allocationTotal = (allocation.weeklyHours || []).reduce(
//                   (weekSum, hours) => weekSum + (Number(hours) || 0),
//                   0,
//                 )
//                 return sum + allocationTotal
//               }, 0)

//               const utilizationPercentage = monthlyCapacity > 0 ? (totalAllocated / monthlyCapacity) * 100 : 0
//               const statusLabel = getStatusLabel(totalAllocated, monthlyCapacity)

//               return (
//                 <React.Fragment key={memberId}>
//                   {/* Member Header Row */}
//                   <tr className="bg-gray-50">
//                     <td className="px-6 py-4">
//                       <div className="flex items-center">
//                         <button
//                           onClick={() => toggleMemberExpansion(memberId)}
//                           className="mr-2 p-1 hover:bg-gray-200 rounded"
//                         >
//                           {isExpanded ? (
//                             <ChevronUp className="h-4 w-4 text-gray-500" />
//                           ) : (
//                             <ChevronDown className="h-4 w-4 text-gray-500" />
//                           )}
//                         </button>
//                         <div>
//                           <div className="font-medium text-gray-900">{member.fullName}</div>
//                           <div className="text-sm text-gray-500">{member.jobTitle}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-4 py-4">
//                       <div className="text-xs font-semibold text-gray-500">
//                         {totalAllocated.toFixed(1)}/{monthlyCapacity.toFixed(1)} h
//                       </div>
//                       <div className="flex items-center gap-3">
//                         <div className="flex-1 relative">
//                           <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
//                             <div
//                               className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(totalAllocated, member.capacity)}`}
//                               style={{
//                                 width: `${Math.min(utilizationPercentage, 100)}%`,
//                               }}
//                             ></div>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2 min-w-[100px]">
//                           <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
//                             {Math.round(utilizationPercentage)}%
//                           </span>
//                           {statusLabel && (
//                             <span
//                               className={`text-xs font-medium whitespace-nowrap ${getUtilizationTextColor(totalAllocated, member.capacity)}`}
//                             >
//                               {statusLabel}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     </td>
//                     {weeksData.map((week, weekIndex) => {
//                       const totalDailyAllocated = member.allocations.reduce((sum, allocation) => {
//                         return sum + (allocation.defaultHoursPerDay || 0)
//                       }, 0)

//                       const hasWeekendAllocation = member.allocations.some((a) => a.allowWeekends)
//                       const weekCapacity = member.capacity * (hasWeekendAllocation ? 7 : 5)
//                       // Keep utilization calculation based on actual weekly hours if possible, or total daily vs daily capacity
//                       const weekAllocatedTotal = member.allocations.reduce((sum, allocation) => {
//                         return sum + (Number(allocation.weeklyHours?.[weekIndex]) || 0)
//                       }, 0)
//                       const weekUtilization = weekCapacity > 0 ? (weekAllocatedTotal / weekCapacity) * 100 : 0

//                       return (
//                         <td key={week.weekNumber} className="px-4 py-4 text-center">
//                           <div className="flex flex-col items-center gap-1">
//                             <div
//                               className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(
//                                 totalDailyAllocated,
//                                 member.capacity,
//                               )}`}
//                             >
//                               {totalDailyAllocated.toFixed(1)}h
//                             </div>
//                             <div className="text-xs text-gray-500">{weekUtilization.toFixed(0)}%</div>
//                           </div>
//                         </td>
//                       )
//                     })}
//                     <td className="px-4 py-4 text-center"></td>
//                   </tr>

//                   {/* Expanded Project Rows */}
//                   {isExpanded &&
//                     member.allocations.map((allocation) => (
//                       <tr key={allocation.projectId} className="bg-gray-25">
//                         <td className="px-6 py-3 pl-12">
//                           <div className="flex flex-col">
//                             <div className="font-medium text-gray-700">{allocation.projectName}</div>
//                             <div className="text-xs text-gray-500">
//                               {allocation.defaultHoursPerDay}h/day{" "}
//                               {allocation.allowWeekends ? "(7 days: " : "(5 days: "}
//                               {(allocation.defaultHoursPerDay * (allocation.allowWeekends ? 7 : 5)).toFixed(1)}h total)
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3"></td>
//                         {weeksData.map((week, weekIdx) => {
//                           const displayHours = allocation.defaultHoursPerDay || 0

//                           return (
//                             <td key={week.weekNumber} className="px-4 py-3 text-center">
//                               <div className="flex justify-center">
//                                 <div className="min-w-[40px] h-10 px-2 flex items-center justify-center bg-orange-400 text-white font-bold rounded text-sm shadow-sm">
//                                   {displayHours.toFixed(1)}h
//                                 </div>
//                               </div>
//                             </td>
//                           )
//                         })}
//                         <td className="px-4 py-3 text-center">
//                           <div className="inline-flex items-center gap-3">
//                             <button
//                               onClick={() => {
//                                 setDeletingTarget({
//                                   memberId: member.id,
//                                   projectId: allocation.projectId,
//                                   projectName: allocation.projectName,
//                                   assignmentId: allocation.assignmentId,
//                                 })
//                               }}
//                               className="text-red-600 hover:text-red-800"
//                               title="Delete project assignment"
//                             >
//                               <Trash className="h-4 w-4" />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}

//                   {/* Add Project Row */}
//                   {isExpanded && (
//                     <tr>
//                       <td className="px-6 py-3 pl-12" colSpan={weeksData.length + 3}>
//                         <button
//                           onClick={() => {
//                             setAddModalTarget(memberId)
//                             setAddForm({
//                               hours: 1,
//                               projectId: "",
//                               includeWeekends: false,
//                               startDate: new Date().toISOString().split("T")[0],
//                             })
//                           }}
//                           className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium"
//                         >
//                           <Plus className="h-4 w-4 mr-1" />
//                           Add Project
//                         </button>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               )
//             })}
//           </tbody>
//         </table>
//       </div>

//       {addModalTarget && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
//           <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
//             <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
//               <h3 className="text-lg font-semibold text-gray-900">Add Project</h3>
//             </div>
//             <div className="px-6 py-4 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
//                 <select
//                   value={addForm.projectId}
//                   onChange={(e) => setAddForm({ ...addForm, projectId: e.target.value })}
//                   className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
//                 >
//                   <option value="">Select a project</option>
//                   {projects.map((project) => (
//                     <option key={project.id} value={project.id}>
//                       {project.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Hours per workday</label>
//                 <input
//                   type="number"
//                   className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
//                   min={0}
//                   max={24}
//                   step={0.5}
//                   value={addForm.hours}
//                   onChange={(e) =>
//                     setAddForm((f) => ({
//                       ...f,
//                       hours: Math.max(0, Number(e.target.value)),
//                     }))
//                   }
//                 />
//               </div>
//               <label className="inline-flex items-center gap-2 text-sm text-gray-700">
//                 <input
//                   type="checkbox"
//                   className="h-4 w-4"
//                   checked={addForm.includeWeekends}
//                   onChange={(e) =>
//                     setAddForm((f) => ({
//                       ...f,
//                       includeWeekends: e.target.checked,
//                     }))
//                   }
//                 />
//                 Enable weekends
//               </label>
//             </div>
//             <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
//               <button
//                 className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
//                 onClick={() => {
//                   setAddModalTarget(null)
//                   setAddForm({
//                     projectId: "",
//                     hours: 8,
//                     includeWeekends: false,
//                     startDate: new Date().toISOString().split("T")[0],
//                   })
//                 }}
//               >
//                 Cancel
//               </button>
//               <button
//                 className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
//                 onClick={handleAddProject}
//                 disabled={addProjectMutation.isPending || !addForm.projectId}
//               >
//                 {addProjectMutation.isPending ? "Adding..." : "Add"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Save Confirmation Modal */}
//       {savingTarget && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
//             <div className="px-6 py-4 border-b border-gray-200">
//               <div className="flex items-center gap-3">
//                 <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
//                   <AlertTriangle className="h-6 w-6 text-red-600" />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900">Override Daily Allocations</h3>
//                   <p className="text-sm text-gray-500">
//                     This action will override previously set daily-based allocations
//                   </p>
//                 </div>
//               </div>
//             </div>
//             <div className="px-6 py-4 space-y-4">
//               <div className="bg-red-50 border border-red-200 rounded-md p-4">
//                 <p className="text-sm font-medium text-red-800 mb-2">⚠️ Severe Warning</p>
//                 <p className="text-sm text-red-700">
//                   Saving these weekly hours will <strong>permanently override</strong> any daily-based time allocations
//                   you have set for <strong>{savingTarget.projectName}</strong>. The hours will be distributed evenly
//                   across all days in each week.
//                 </p>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Type <strong>"CONFIRM"</strong> to proceed:
//                 </label>
//                 <input
//                   type="text"
//                   className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                   value={confirmationText}
//                   onChange={(e) => setConfirmationText(e.target.value)}
//                   placeholder="Type CONFIRM here"
//                   autoFocus
//                 />
//               </div>
//             </div>
//             <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
//               <button
//                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
//                 onClick={() => {
//                   setSavingTarget(null)
//                   setConfirmationText("")
//                 }}
//                 disabled={isSaving}
//               >
//                 Cancel
//               </button>
//               <button
//                 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
//                 onClick={handleSaveWeeklyHours}
//                 disabled={isSaving || confirmationText !== "CONFIRM"}
//               >
//                 {isSaving ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
//                     Saving...
//                   </>
//                 ) : (
//                   "Save & Override"
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   )
// }


"use client"

import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, Plus, Trash, AlertTriangle } from "lucide-react"
import ConfirmationModal from "@/components/ui/ConfirmationModal"
import { useOrganizationStore } from "@/lib/stores/organizationStore"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMonthlyCapacity } from "@/lib/hooks/useCapacity"
import {
  startOfWeek,
  startOfDay,
  parseISO,
  eachDayOfInterval,
  isWeekend,
  isPast,
  isToday,
  addDays,
  getDay,
} from "date-fns"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

interface ResourceAllocation {
  id: string
  organizationMemberId: string
  weeklyCapacityHours: number
  hourlyRate?: number
  isActive: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  organization_members: {
    id: string
    user_id: string
    status: string
    roles?: { id: string; name: string }
    users: {
      id: string
      full_name: string
      email: string
      avatar_url?: string
      position?: string
    }
  } | null
}

interface ProjectAssignment {
  id: string
  projectId: string
  projectName: string
  resourceAllocationId: string
  hoursPerWeek: number
  defaultHoursPerDay: number
  allowWeekends: boolean
  startDate: string
  endDate?: string | null
  notes?: string | null
}

interface ProjectWeeklyPlan {
  id: string
  resourceAllocationId: string
  projectId: string
  projectAssignmentId: string
  weekStartDate: string
  hoursSunday: number | null
  hoursMonday: number | null
  hoursTuesday: number | null
  hoursWednesday: number | null
  hoursThursday: number | null
  hoursFriday: number | null
  hoursSaturday: number | null
}

interface Member {
  id: string
  fullName: string
  jobTitle: string
  avatarUrl?: string
  capacity: number // Daily capacity
  allocations: Array<{
    projectId: string
    projectName: string
    hours: number // Default weekly hours
    weeklyHours: number[] // per week allocations aligned with weeksData
    assignmentId?: string // Added to store assignmentId
    defaultHoursPerDay: number // Added to store default hours per day
    allowWeekends: boolean // Added to store weekend allowance
  }>
}

interface WeekData {
  weekNumber: string
  startDate: string
  endDate: string
  label: string
}

interface MonthlyCapacityTableProps {
  selectedMonth?: number
  selectedYear?: number
  onAddResource?: () => void
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
}

interface AddProjectForm {
  projectId: string
  hours: number
  includeWeekends: boolean
  startDate: string
  endDate?: string
  notes?: string
}

const fetchResources = async (organizationId: string, userId: string): Promise<ResourceAllocation[]> => {
  if (!organizationId) throw new Error("Organization ID is required")

  const response = await fetch(
    `/api/capacity/resources?organizationId=${organizationId}&userId=${userId}&only_active=true`,
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status}`)
  }

  const data = await response.json()
  return data.resources || []
}

const fetchProjectAssignments = async (organizationId: string): Promise<ProjectAssignment[]> => {
  if (!organizationId) return []

  const response = await fetch(`/api/capacity/project-assignments?organizationId=${organizationId}`)
  if (!response.ok) throw new Error("Failed to fetch project assignments")
  const data = await response.json()
  return data.assignments || []
}

const fetchWeeklyPlansForMonth = async (
  organizationId: string,
  month: number,
  year: number,
): Promise<ProjectWeeklyPlan[]> => {
  if (!organizationId) return []

  // Fetch weekly plans for the month
  const response = await fetch(
    `/api/capacity/weekly-plans?organizationId=${organizationId}&month=${month}&year=${year}`,
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.weeklyPlans || []
}

const fetchProjects = async (organizationId: string): Promise<Project[]> => {
  const response = await fetch(`/api/projects?organizationId=${organizationId}`)
  if (!response.ok) throw new Error("Failed to fetch projects")
  const data = await response.json()
  return data.projects || []
}

export default function MonthlyCapacityTable({
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  onAddResource,
}: MonthlyCapacityTableProps) {
  const queryClient = useQueryClient()
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const { data: session } = useSession()

  const { currentOrganization } = useOrganizationStore()
  const [deletingTarget, setDeletingTarget] = useState<{
    memberId: string
    projectId: string
    assignmentId?: string // Add this to store assignment ID
    projectName?: string // Add this for better confirmation message
  } | null>(null)
  const [editingTarget, setEditingTarget] = useState<{
    memberId: string
    projectId: string
  } | null>(null)
  const [addModalTarget, setAddModalTarget] = useState<string | null>(null) // memberId
  const [addForm, setAddForm] = useState<AddProjectForm>({
    projectId: "",
    hours: 8,
    includeWeekends: false,
    startDate: new Date().toISOString().split("T")[0],
  })
  const [savingTarget, setSavingTarget] = useState<{
    memberId: string
    projectId: string
    projectName: string
  } | null>(null)
  const [confirmationText, setConfirmationText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editedWeeklyHours, setEditedWeeklyHours] = useState<{
    [key: string]: number[] // key: "memberId:projectId", value: array of weekly hours
  }>({})

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentOrganization?.id],
    queryFn: () => fetchProjects(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
  })

  const formatDateForDisplay = (date: Date): string => {
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]}`
  }

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const startStr = formatDateForDisplay(startDate)
    const endStr = formatDateForDisplay(endDate)
    return `${startStr} - ${endStr}`
  }

  // Use the monthly capacity API instead of separate queries
  const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`
  const {
    data: monthlyCapacityData,
    isLoading: monthlyLoading,
    error: monthlyError,
  } = useMonthlyCapacity(currentOrganization?.id || "", session?.user.id || "", monthStr, {
    only_active: true,
  })

  // Generate days for the selected month (MON-SUN like weekly view)
  const weeksData: WeekData[] = useMemo(() => {
    const days: WeekData[] = []

    // Get the first Monday of the month (or previous Monday if month starts mid-week)
    const monthStart = new Date(selectedYear, selectedMonth, 1)
    const firstMonday = new Date(monthStart)
    const dayOfWeek = monthStart.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    firstMonday.setDate(monthStart.getDate() - daysToSubtract)

    // Generate 7 days starting from Monday
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstMonday)
      currentDay.setDate(firstMonday.getDate() + i)

      days.push({
        weekNumber: dayNames[i],
        startDate: currentDay.toISOString(),
        endDate: currentDay.toISOString(),
        label: `${String(currentDay.getDate()).padStart(2, "0")}`,
      })
    }

    return days
  }, [selectedMonth, selectedYear, monthlyCapacityData])

  const addProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await fetch("/api/capacity/project-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add project assignment")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity"] })
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      toast.success("Project assignment added successfully!")
      setAddForm({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
      })
      setAddModalTarget(null)
    },
    onError: (error: Error) => {
      console.error("Project assignment error:", error)
      toast.error(error.message || "Failed to add project assignment")
    },
  })

  const updateWeeklyPlanMutation = useMutation({
    mutationFn: async (data: {
      weeklyPlanId: string
      hoursSunday: number
      hoursMonday: number
      hoursTuesday: number
      hoursWednesday: number
      hoursThursday: number
      hoursFriday: number
      hoursSaturday: number
      isLinked: boolean
    }) => {
      const response = await fetch("/api/capacity/weekly-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update weekly plan")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity"] })
    },
    onError: (error: Error) => {
      console.error("Update weekly plan error:", error)
      toast.error(error.message || "Failed to update weekly plan")
    },
  })

  const {
    data: projectAssignments = [],
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["project-assignments", currentOrganization?.id],
    queryFn: () => fetchProjectAssignments(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const deleteProjectAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/capacity/project-assignments?assignmentId=${assignmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete project assignment")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity"] })
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      toast.success("Project assignment deleted successfully!")
      setDeletingTarget(null)
    },
    onError: (error: Error) => {
      console.error("Delete project assignment error:", error)
      toast.error(error.message || "Failed to delete project assignment")
    },
  })

  const createWeeklyPlanMutation = useMutation({
    mutationFn: async (data: {
      organizationId: string
      resourceAllocationId: string
      projectId: string
      projectAssignmentId: string
      weekStartDate: string
      defaultHoursPerDay: number
      allowWeekends: boolean
      hoursSunday: number
      hoursMonday: number
      hoursTuesday: number
      hoursWednesday: number
      hoursThursday: number
      hoursFriday: number
      hoursSaturday: number
    }) => {
      const response = await fetch("/api/capacity/weekly-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create weekly plan")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity"] })
    },
    onError: (error: Error) => {
      console.error("Create weekly plan error:", error)
      toast.error(error.message || "Failed to create weekly plan")
    },
  })

  const handleAddProject = async () => {
    if (!addModalTarget || !addForm.projectId) {
      setAddModalTarget(null)
      return
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
      }

      const assignmentResponse = await addProjectMutation.mutateAsync(projectData)
      const projectAssignmentId = assignmentResponse.projectAssignment?.id

      if (!projectAssignmentId) {
        throw new Error("Failed to create project assignment")
      }

      // Step 2: Create weekly plans for ALL weeks in the current month
      const today = startOfDay(new Date())
      const dailyHours = addForm.hours
      const weekdayHours = dailyHours
      const weekendHours = addForm.includeWeekends ? dailyHours : 0

      // Create weekly plans for each week in the month
      const weeklyPlanPromises = weeksData.map(async (week) => {
        const weekStart = startOfDay(parseISO(week.startDate))
        const weekEnd = startOfDay(parseISO(week.endDate))

        const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 })

        // Calculate the Sunday of this week (6 days after Monday)
        const weekSunday = addDays(weekMonday, 6)

        // Calculate hours for each day of the week
        let hoursSunday = 0
        let hoursMonday = 0
        let hoursTuesday = 0
        let hoursWednesday = 0
        let hoursThursday = 0
        let hoursFriday = 0
        let hoursSaturday = 0

        // Get all days in this week
        const weekDays = eachDayOfInterval({
          start: weekMonday,
          end: weekSunday,
        })

        weekDays.forEach((day) => {
          const dayOfWeek = getDay(day) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          const isDayPast = isPast(day) && !isToday(day)

          // If day is in the past, set hours to 0
          if (isDayPast) {
            return // Hours already initialized to 0
          }

          // If day is today or in the future, set hours based on day type
          if (dayOfWeek === 0) {
            // Sunday
            hoursSunday = weekendHours
          } else if (dayOfWeek === 1) {
            // Monday
            hoursMonday = weekdayHours
          } else if (dayOfWeek === 2) {
            // Tuesday
            hoursTuesday = weekdayHours
          } else if (dayOfWeek === 3) {
            // Wednesday
            hoursWednesday = weekdayHours
          } else if (dayOfWeek === 4) {
            // Thursday
            hoursThursday = weekdayHours
          } else if (dayOfWeek === 5) {
            // Friday
            hoursFriday = weekdayHours
          } else if (dayOfWeek === 6) {
            // Saturday
            hoursSaturday = weekendHours
          }
        })

        console.log("weekStartDate", weekMonday.toISOString())

        // Create weekly plan via API
        const weeklyPlanResponse = await fetch("/api/capacity/weekly-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: currentOrganization?.id,
            resourceAllocationId: addModalTarget,
            projectId: addForm.projectId,
            projectAssignmentId: projectAssignmentId,
            weekStartDate: weekMonday.toISOString(),
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
        })

        if (!weeklyPlanResponse.ok) {
          const errorData = await weeklyPlanResponse.json()
          throw new Error(errorData.error || "Failed to create weekly plan")
        }

        return weeklyPlanResponse.json()
      })

      // Wait for all weekly plans to be created
      await Promise.all(weeklyPlanPromises)

      // Refresh the monthly capacity query
      queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })

      toast.success("Project assignment and weekly plans created successfully!")
      setAddForm({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
      })
      setAddModalTarget(null)
    } catch (error: any) {
      console.error("Add project error:", error)
      toast.error(error.message || "Failed to add project assignment")
    }
  }

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
  })

  // Weekly plans are now included in monthlyCapacityData

  const handleSaveWeeklyHours = async () => {
    if (!savingTarget) return

    const { memberId, projectId } = savingTarget
    const key = `${memberId}:${projectId}`
    const editedHours = editedWeeklyHours[key]

    if (!editedHours || editedHours.length === 0) {
      toast.error("No weekly hours to save")
      setSavingTarget(null)
      setConfirmationText("")
      return
    }

    // Find the project assignment from monthly data
    const resource = monthlyCapacityData?.resources?.find((r: any) => r.resource_allocation_id === memberId)

    const weekData = resource?.weeks?.[0]
    const projectData = weekData?.projects?.find((p: any) => p.project?.id === projectId)

    if (!projectData || !resource) {
      toast.error("Project assignment not found")
      setSavingTarget(null)
      setConfirmationText("")
      return
    }

    setIsSaving(true)

    try {
      // For each week, update or create weekly plan
      const updatePromises = weeksData.map(async (week, weekIndex) => {
        const weeklyHours = editedHours[weekIndex] || 0

        // Calculate Monday of the week
        const weekStart = startOfDay(parseISO(week.startDate))
        const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 })

        // Find existing weekly plan from monthly data
        const weekDataForWeek = resource.weeks?.find((w: any) => w.week_start_date === week.startDate.split("T")[0])
        const existingPlan = weekDataForWeek?.projects?.find((p: any) => p.project?.id === projectId)

        // Calculate hours per day (distribute evenly)
        // Check if weekends are allowed from project data
        const allowWeekends = projectData.allow_weekends || false
        const daysPerWeek = allowWeekends ? 7 : 5
        const hoursPerDay = weeklyHours / daysPerWeek

        const hoursSunday = allowWeekends ? hoursPerDay : 0
        const hoursMonday = hoursPerDay
        const hoursTuesday = hoursPerDay
        const hoursWednesday = hoursPerDay
        const hoursThursday = hoursPerDay
        const hoursFriday = hoursPerDay
        const hoursSaturday = allowWeekends ? hoursPerDay : 0

        // Use the upsert API which handles both create and update
        const response = await fetch("/api/capacity/weekly-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: currentOrganization?.id || "",
            resourceAllocationId: memberId,
            projectId: projectId,
            weekStartDate: weekMonday.toISOString(),
            defaultHoursPerDay: hoursPerDay,
            allowWeekends: allowWeekends,
            hoursSunday,
            hoursMonday,
            hoursTuesday,
            hoursWednesday,
            hoursThursday,
            hoursFriday,
            hoursSaturday,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to save weekly plan")
        }
      })

      await Promise.all(updatePromises)

      toast.success("Weekly hours saved successfully!")
      setEditingTarget(null)
      setSavingTarget(null)
      setConfirmationText("")

      // Clear edited hours after successful save
      setEditedWeeklyHours((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
    } catch (error: any) {
      console.error("Save weekly hours error:", error)
      toast.error(error.message || "Failed to save weekly hours")
    } finally {
      setIsSaving(false)
    }
  }

  const getUtilizationColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100
    if (percentage > 100) return "bg-red-500"
    if (percentage >= 80) return "bg-yellow-500"
    if (percentage >= 60) return "bg-green-500"
    return "bg-yellow-500"
  }

  const getUtilizationTextColor = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100
    if (percentage > 100) return "text-red-700"
    if (percentage >= 80) return "text-yellow-700"
    if (percentage >= 60) return "text-green-700"
    return "text-yellow-700"
  }

  const getStatusLabel = (allocated: number, capacity: number) => {
    const percentage = (allocated / capacity) * 100
    if (percentage > 100) return `(${Math.round(percentage - 100)}% over)`
    return ""
  }

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  const isEditing = (memberId: string, projectId: string) =>
    editingTarget?.memberId === memberId && editingTarget?.projectId === projectId

  const ensureWeeklyInitialized = (memberId: string, projectId: string, weeksCount: number) => {
    const key = `${memberId}:${projectId}`
    const allocation = members.find((m) => m.id === memberId)?.allocations.find((a) => a.projectId === projectId)

    if (!allocation) return

    // Initialize edited hours if not already set
    if (!editedWeeklyHours[key]) {
      const currentWeeklyHours =
        allocation.weeklyHours && allocation.weeklyHours.length === weeksCount
          ? allocation.weeklyHours
          : Array.from({ length: weeksCount }, () => allocation.hours)

      setEditedWeeklyHours((prev) => ({
        ...prev,
        [key]: [...currentWeeklyHours],
      }))
    }
  }

  const updateAllocationWeeklyHour = (
    memberId: string,
    projectId: string,
    weekIndex: number,
    value: number,
    weeksCount: number,
  ) => {
    const key = `${memberId}:${projectId}`

    setEditedWeeklyHours((prev) => {
      const current = prev[key] || []
      // Ensure array has correct length
      const arr =
        current.length === weeksCount ? [...current] : Array.from({ length: weeksCount }, (_, i) => current[i] ?? 0)

      arr[weekIndex] = Math.max(0, Number.isFinite(value) ? value : 0)

      return {
        ...prev,
        [key]: arr,
      }
    })
  }

  const members: Member[] = useMemo(() => {
    if (!monthlyCapacityData?.resources) return []

    return monthlyCapacityData.resources.map((resource: any) => {
      const userInfo = resource.user
      const resourceId = resource.resource_allocation_id

      // 1. Get all assignments for this resource
      const assignmentsForResource = projectAssignments.filter((pa: any) => pa.resourceAllocationId === resourceId)

      // 2. Map assignments to allocations
      const allocations = assignmentsForResource.map((assignment: any) => {
        const projectId = assignment.projectId
        const projectName = assignment.projectName || "Unknown Project"

        // Initialize weekly hours for all weeks in weeksData
        const weeklyHours = new Array(weeksData.length).fill(0)

        // 3. Fill in hours from monthlyCapacityData.resources[].weeks
        resource.weeks.forEach((week: any, weekIndex: number) => {
          // Look for this project in the API's week data
          const projectData = week.projects?.find((p: any) => p.project?.id === projectId)

          if (projectData) {
            const key = `${resourceId}:${projectId}`
            const editedHours = editedWeeklyHours[key]

            weeklyHours[weekIndex] =
              editedHours && editedHours[weekIndex] !== undefined
                ? editedHours[weekIndex]
                : projectData.weekly_hours || 0
          }
        })

        const avgHours = weeklyHours.reduce((sum, h) => sum + h, 0) / weeklyHours.length || 0

        return {
          projectId,
          projectName,
          hours: avgHours,
          weeklyHours,
          assignmentId: assignment.id,
          defaultHoursPerDay: assignment.defaultHoursPerDay || 0,
          allowWeekends: assignment.allowWeekends || false,
        }
      })

      return {
        id: resourceId,
        fullName: userInfo?.full_name || "Unknown User",
        jobTitle: userInfo?.position || "No Position",
        avatarUrl: userInfo?.avatar_url,
        capacity: resource.weekly_capacity_hours / 5,
        allocations,
      }
    })
  }, [monthlyCapacityData, weeksData, editedWeeklyHours, projectAssignments])

  console.log("[v0] Monthly Table Members mapped:", members)

  // Calculate total monthly capacity
  const totalMonthlyCapacity = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth, 1)
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const workingDays = allDays.filter((day) => !isWeekend(day)).length

    return members.reduce((sum, member) => {
      // Monthly capacity = daily capacity × working days in month
      return sum + member.capacity * workingDays
    }, 0)
  }, [members, selectedMonth, selectedYear])

  const totalMonthlyAllocated = useMemo(() => {
    if (monthlyCapacityData?.resources) {
      // Use API data - sum all used hours across all resources and weeks
      return monthlyCapacityData.resources.reduce((sum: number, resource: any) => {
        const resourceTotal = resource.weeks.reduce((weekSum: number, week: any) => {
          return weekSum + (week.used || 0)
        }, 0)
        return sum + resourceTotal
      }, 0)
    }

    // Fallback to members calculation
    return members.reduce((sum, member) => {
      const memberAllocated = member.allocations.reduce((allocSum, allocation) => {
        // Sum all weekly hours
        const weeklyTotal = allocation.weeklyHours.reduce((weekSum, hours) => {
          return weekSum + Number(hours)
        }, 0)
        return allocSum + weeklyTotal
      }, 0)
      return sum + memberAllocated
    }, 0)
  }, [members, monthlyCapacityData])

  const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated

  if (monthlyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading capacity data...</div>
      </div>
    )
  }

  if (monthlyError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">
          Error: {monthlyError instanceof Error ? monthlyError.message : "Failed to load capacity data"}
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-gray-600">No resources allocated yet</div>
        <button onClick={onAddResource} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add First Resource
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Capacity Overview */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Capacity Overview</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Total Monthly Capacity:</span>
            <span className="text-sm font-medium text-gray-900">{totalMonthlyCapacity}h</span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-500">Monthly Allocated:</span>
            <span className="text-sm font-medium text-gray-900">{totalMonthlyAllocated}h</span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-500">Available:</span>
            <span className="text-sm font-medium text-green-600">{totalMonthlyAvailable}h</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <ConfirmationModal
          isOpen={Boolean(deletingTarget)}
          onClose={() => setDeletingTarget(null)}
          onConfirm={async () => {
            if (!deletingTarget || !deletingTarget.assignmentId) return

            try {
              // Delete the project assignment (this will cascade delete all weekly plans)
              await deleteProjectAssignmentMutation.mutateAsync(deletingTarget.assignmentId)
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
                const weekStartDate = new Date(week.startDate)
                const weekEndDate = new Date(week.endDate)
                const dateRangeTooltip = formatDateRange(weekStartDate, weekEndDate)

                return (
                  <th
                    key={week.weekNumber}
                    className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help"
                    title={dateRangeTooltip}
                  >
                    <div>{week.weekNumber}</div>
                    <div className="text-xs text-gray-400">{week.label}</div>
                  </th>
                )
              })}
              <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member, idx) => {
              const memberId = member.id
              const isExpanded = expandedMembers.has(memberId)

              // Calculate monthly capacity: count working days in the month
              const monthStart = new Date(selectedYear, selectedMonth, 1)
              const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
              const allDays = eachDayOfInterval({
                start: monthStart,
                end: monthEnd,
              })
              const workingDays = allDays.filter((day) => !isWeekend(day)).length
              const monthlyCapacity = member.capacity * workingDays

              const totalAllocated = member.allocations.reduce((sum, allocation) => {
                // Sum all weekly hours for this allocation across all weeks
                const allocationTotal = (allocation.weeklyHours || []).reduce(
                  (weekSum, hours) => weekSum + (Number(hours) || 0),
                  0,
                )
                return sum + allocationTotal
              }, 0)

              const utilizationPercentage = monthlyCapacity > 0 ? (totalAllocated / monthlyCapacity) * 100 : 0
              const statusLabel = getStatusLabel(totalAllocated, monthlyCapacity)

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
                          <div className="font-medium text-gray-900">{member.fullName}</div>
                          <div className="text-sm text-gray-500">{member.jobTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500">
                        {totalAllocated.toFixed(1)}/{monthlyCapacity.toFixed(1)} h
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
                      const isWeekend = week.weekNumber === "SAT" || week.weekNumber === "SUN";

                      // For weekends, only sum hours from projects that allow weekends
                      // For weekdays, sum all projects
                      const totalDailyAllocated = member.allocations.reduce((sum, allocation) => {
                        if (isWeekend && !allocation.allowWeekends) {
                          return sum; // Don't include this project's hours on weekends
                        }
                        return sum + (allocation.defaultHoursPerDay || 0);
                      }, 0);

                      const hasWeekendAllocation = member.allocations.some((a) => a.allowWeekends)
                      const weekCapacity = member.capacity * (hasWeekendAllocation ? 7 : 5)
                      // Keep utilization calculation based on actual weekly hours if possible, or total daily vs daily capacity
                      const weekAllocatedTotal = member.allocations.reduce((sum, allocation) => {
                        return sum + (Number(allocation.weeklyHours?.[weekIndex]) || 0)
                      }, 0)
                      const weekUtilization = weekCapacity > 0 ? (weekAllocatedTotal / weekCapacity) * 100 : 0

                      // For weekends in member header, show "-" if no projects allow weekends
                      if (isWeekend && totalDailyAllocated === 0) {
                        return (
                          <td key={week.weekNumber} className="px-4 py-4 text-center bg-gray-50 opacity-50">
                            <div className="text-gray-300 text-sm">-</div>
                          </td>
                        );
                      }

                      return (
                        <td key={week.weekNumber} className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`inline-block px-3 py-1 rounded text-white text-sm font-medium ${getUtilizationColor(
                                totalDailyAllocated,
                                member.capacity,
                              )}`}
                            >
                              {totalDailyAllocated.toFixed(1)}h
                            </div>
                            <div className="text-xs text-gray-500">{weekUtilization.toFixed(0)}%</div>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-4 py-4 text-center"></td>
                  </tr>

                  {/* Expanded Project Rows */}
                  {isExpanded &&
                    member.allocations.map((allocation) => (
                      <tr key={allocation.projectId} className="bg-gray-25">
                        <td className="px-6 py-3 pl-12">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-700">{allocation.projectName}</div>
                            <div className="text-xs text-gray-500">
                              {allocation.defaultHoursPerDay}h/day{" "}
                              {allocation.allowWeekends ? "(7 days: " : "(5 days: "}
                              {(allocation.defaultHoursPerDay * (allocation.allowWeekends ? 7 : 5)).toFixed(1)}h total)
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"></td>
                        {weeksData.map((week, weekIdx) => {
                          const isWeekend = week.weekNumber === "SAT" || week.weekNumber === "SUN";
                          const shouldShowHours = !isWeekend || allocation.allowWeekends;
                          const displayHours = shouldShowHours ? (allocation.defaultHoursPerDay || 0) : 0;

                          return (
                            <td
                              key={week.weekNumber}
                              className={`px-4 py-3 text-center ${isWeekend && !allocation.allowWeekends ? "bg-gray-50 opacity-50" : ""}`}
                            >
                              {!shouldShowHours ? (
                                <div className="text-gray-300 text-sm">-</div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="min-w-[40px] h-10 px-2 flex items-center justify-center bg-orange-400 text-white font-bold rounded text-sm shadow-sm">
                                    {displayHours.toFixed(1)}h
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-3">
                            <button
                              onClick={() => {
                                setDeletingTarget({
                                  memberId: member.id,
                                  projectId: allocation.projectId,
                                  projectName: allocation.projectName,
                                  assignmentId: allocation.assignmentId,
                                })
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
                      <td className="px-6 py-3 pl-12" colSpan={weeksData.length + 3}>
                        <button
                          onClick={() => {
                            setAddModalTarget(memberId)
                            setAddForm({
                              hours: 1,
                              projectId: "",
                              includeWeekends: false,
                              startDate: new Date().toISOString().split("T")[0],
                            })
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
              )
            })}
          </tbody>
        </table>
      </div>

      {addModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Add Project</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={addForm.projectId}
                  onChange={(e) => setAddForm({ ...addForm, projectId: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours per workday</label>
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
                  setAddModalTarget(null)
                  setAddForm({
                    projectId: "",
                    hours: 8,
                    includeWeekends: false,
                    startDate: new Date().toISOString().split("T")[0],
                  })
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

      {/* Save Confirmation Modal */}
      {savingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Override Daily Allocations</h3>
                  <p className="text-sm text-gray-500">
                    This action will override previously set daily-based allocations
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm font-medium text-red-800 mb-2">⚠️ Severe Warning</p>
                <p className="text-sm text-red-700">
                  Saving these weekly hours will <strong>permanently override</strong> any daily-based time allocations
                  you have set for <strong>{savingTarget.projectName}</strong>. The hours will be distributed evenly
                  across all days in each week.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <strong>"CONFIRM"</strong> to proceed:
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type CONFIRM here"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={() => {
                  setSavingTarget(null)
                  setConfirmationText("")
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleSaveWeeklyHours}
                disabled={isSaving || confirmationText !== "CONFIRM"}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save & Override"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
