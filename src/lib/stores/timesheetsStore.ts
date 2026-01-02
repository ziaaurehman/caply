import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timesheetsAPI } from "@/utils/api/timesheets";
import { capacityAPI } from "@/utils/api/capacity";
import { dateUtils } from "@/utils/dateUtils";

// Types
export interface TimesheetEntry {
  id?: string;
  project_id: string;
  task_description: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  monday_notes?: string;
  tuesday_notes?: string;
  wednesday_notes?: string;
  thursday_notes?: string;
  friday_notes?: string;
  is_billable?: boolean;
}

export interface TimesheetProject {
  id: string;
  name: string;
  code?: string;
  isPlanned: boolean;
}

export interface WeekTimesheetData {
  submission: any;
  entries: TimesheetEntry[];
  projects: TimesheetProject[];
  totalHours: number;
}

interface TimesheetsStore {
  // State
  currentWeekStart: string;
  activeTab: "my-timesheet" | "approve-timesheets";

  // Cache
  currentTimesheet: WeekTimesheetData | null;
  submissions: any[];

  // Actions
  setWeekStart: (weekStart: string) => void;
  setActiveTab: (tab: "my-timesheet" | "approve-timesheets") => void;
  updateTimesheetEntry: (
    entryId: string | null,
    entry: Partial<TimesheetEntry>
  ) => void;
  removeTimesheetEntry: (entryId: string) => void;
  addTimesheetEntry: () => void;
}

// Helper function to get current week start (Monday)
// Helper function to get current week start (Monday)
export const getCurrentWeekStart = (): string => {
  return dateUtils.getCurrentWeekStart();
};

// Store
export const useTimesheetsStore = create<TimesheetsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentWeekStart: getCurrentWeekStart(),
      activeTab: "my-timesheet",
      currentTimesheet: null,
      submissions: [],

      // Actions
      setWeekStart: (weekStart: string) => {
        set({ currentWeekStart: weekStart });
        set({ currentTimesheet: null });
      },

      setActiveTab: (tab: "my-timesheet" | "approve-timesheets") => {
        set({ activeTab: tab });
      },

      updateTimesheetEntry: (
        entryId: string | null,
        entry: Partial<TimesheetEntry>
      ) => {
        const { currentTimesheet } = get();
        if (!currentTimesheet) {
          const newTimesheet: WeekTimesheetData = {
            entries: [],
            totalHours: 0,
            submission: null,
            projects: [],
          };

          // Add the new entry
          const newEntry: TimesheetEntry = {
            project_id: entry.project_id || "",
            task_description: entry.task_description || "",
            monday_hours: entry.monday_hours || 0,
            tuesday_hours: entry.tuesday_hours || 0,
            wednesday_hours: entry.wednesday_hours || 0,
            thursday_hours: entry.thursday_hours || 0,
            friday_hours: entry.friday_hours || 0,
            monday_notes: entry.monday_notes || "",
            tuesday_notes: entry.tuesday_notes || "",
            wednesday_notes: entry.wednesday_notes || "",
            thursday_notes: entry.thursday_notes || "",
            friday_notes: entry.friday_notes || "",
          };

          newTimesheet.entries.push(newEntry);

          set({ currentTimesheet: newTimesheet });
          return;
        }

        const updatedEntries = [...currentTimesheet.entries];
        const index = updatedEntries.findIndex((e) => e.id === entryId);

        if (index >= 0) {
          updatedEntries[index] = { ...updatedEntries[index], ...entry };
        } else {
          // This is a new entry
          const newEntry: TimesheetEntry = {
            project_id: entry.project_id || "",
            task_description: entry.task_description || "",
            monday_hours: entry.monday_hours || 0,
            tuesday_hours: entry.tuesday_hours || 0,
            wednesday_hours: entry.wednesday_hours || 0,
            thursday_hours: entry.thursday_hours || 0,
            friday_hours: entry.friday_hours || 0,
            monday_notes: entry.monday_notes || "",
            tuesday_notes: entry.tuesday_notes || "",
            wednesday_notes: entry.wednesday_notes || "",
            thursday_notes: entry.thursday_notes || "",
            friday_notes: entry.friday_notes || "",
          };
          updatedEntries.push(newEntry);
        }

        const totalHours = updatedEntries.reduce(
          (sum, entry) =>
            sum +
            entry.monday_hours +
            entry.tuesday_hours +
            entry.wednesday_hours +
            entry.thursday_hours +
            entry.friday_hours,
          0
        );

        set({
          currentTimesheet: {
            ...currentTimesheet,
            entries: updatedEntries,
            totalHours,
          },
        });
      },

      removeTimesheetEntry: (entryId: string) => {
        const { currentTimesheet } = get();
        if (!currentTimesheet) return;

        const updatedEntries = currentTimesheet.entries.filter(
          (e) => e.id !== entryId
        );
        const totalHours = updatedEntries.reduce(
          (sum, entry) =>
            sum +
            entry.monday_hours +
            entry.tuesday_hours +
            entry.wednesday_hours +
            entry.thursday_hours +
            entry.friday_hours,
          0
        );

        set({
          currentTimesheet: {
            ...currentTimesheet,
            entries: updatedEntries,
            totalHours,
          },
        });
      },

      addTimesheetEntry: () => {
        const { currentTimesheet } = get();
        // If no timesheet exists, create a new one
        if (!currentTimesheet) {
          const newTimesheet: WeekTimesheetData = {
            entries: [],
            totalHours: 0,
            submission: null,
            projects: [],
          };

          const newEntry: TimesheetEntry = {
            project_id: "",
            task_description: "",
            monday_hours: 0,
            tuesday_hours: 0,
            wednesday_hours: 0,
            thursday_hours: 0,
            friday_hours: 0,
            monday_notes: "",
            tuesday_notes: "",
            wednesday_notes: "",
            thursday_notes: "",
            friday_notes: "",
            is_billable: false,
          };

          set({
            currentTimesheet: {
              ...newTimesheet,
              entries: [newEntry],
              totalHours: 0,
            },
          });
          return;
        }

        const newEntry: TimesheetEntry = {
          project_id: "",
          task_description: "",
          monday_hours: 0,
          tuesday_hours: 0,
          wednesday_hours: 0,
          thursday_hours: 0,
          friday_hours: 0,
          monday_notes: "",
          tuesday_notes: "",
          wednesday_notes: "",
          thursday_notes: "",
          friday_notes: "",
          is_billable: false,
        };

        set({
          currentTimesheet: {
            ...currentTimesheet,
            entries: [...currentTimesheet.entries, newEntry],
          },
        });
      },
    }),
    {
      name: "timesheets-store",
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    }
  )
);

// React Query hooks for timesheets
export const useTimesheetData = (
  organizationId: string | null,
  weekStart: string
) => {
  return useQuery({
    queryKey: ["timesheet", organizationId, weekStart],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required");

      // Fetch draft timesheet
      const [timesheetResponse] = await Promise.all([
        timesheetsAPI.getDraftTimesheet(organizationId, weekStart),
      ]);

      // Transform database entries to component format
      const entries: TimesheetEntry[] =
        timesheetResponse.submission?.timesheet_entries?.map((entry: any) => ({
          id: entry.id,
          project_id: entry.project_id,
          task_description: entry.task_description,
          monday_hours: entry.monday_hours,
          tuesday_hours: entry.tuesday_hours,
          wednesday_hours: entry.wednesday_hours,
          thursday_hours: entry.thursday_hours,
          friday_hours: entry.friday_hours,
          monday_notes: entry.monday_notes,
          tuesday_notes: entry.tuesday_notes,
          wednesday_notes: entry.wednesday_notes,
          thursday_notes: entry.thursday_notes,
          friday_notes: entry.friday_notes,
          is_billable: entry.is_billable,
        })) || [];

      // Transform projects and mark planned ones
      const projectsWithPlanned = [];

      // Sort projects: planned first, then alphabetically
      const sortedProjects = [];

      return {
        submission: timesheetResponse.submission,
        entries,
        projects: [],
        totalHours: timesheetResponse.submission?.total_hours || 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSaveTimesheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      weekStart,
      entries,
      submissionId,
    }: {
      organizationId: string;
      weekStart: string;
      entries: TimesheetEntry[];
      submissionId?: string;
    }) => {
      // Calculate total hours
      const totalHours = entries.reduce(
        (sum, entry) =>
          sum +
          entry.monday_hours +
          entry.tuesday_hours +
          entry.wednesday_hours +
          entry.thursday_hours +
          entry.friday_hours,
        0
      );

      // Filter out entries with no project selected or no hours
      const validEntries = entries.filter(
        (entry) =>
          entry.project_id &&
          (entry.monday_hours > 0 ||
            entry.tuesday_hours > 0 ||
            entry.wednesday_hours > 0 ||
            entry.thursday_hours > 0 ||
            entry.friday_hours > 0 ||
            entry.task_description.trim())
      );

      return await timesheetsAPI.saveDraftTimesheet(organizationId, {
        submissionId,
        weekStart,
        entries: validEntries,
        totalHours,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate all timesheet queries
      queryClient.invalidateQueries({
        queryKey: ["timesheet"],
        exact: false,
      });

      // Invalidate capacity queries (timesheets affect capacity)
      queryClient.invalidateQueries({
        queryKey: ["capacity"],
        exact: false,
      });
    },
  });
};

// Hook to add timesheet entry with API call
export const useAddTimesheetEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      weekStart,
    }: {
      organizationId: string;
      weekStart: string;
    }) => {
      // Create a new empty entry
      const newEntry = {
        project_id: "",
        task_description: "",
        monday_hours: 0,
        tuesday_hours: 0,
        wednesday_hours: 0,
        thursday_hours: 0,
        friday_hours: 0,
        monday_notes: "",
        tuesday_notes: "",
        wednesday_notes: "",
        thursday_notes: "",
        friday_notes: "",
        is_billable: false,
      };

      // Save the draft with the new entry
      return await timesheetsAPI.saveDraftTimesheet(organizationId, {
        weekStart,
        entries: [newEntry],
        totalHours: 0,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the timesheet data
      queryClient.invalidateQueries({
        queryKey: ["timesheet", variables.organizationId, variables.weekStart],
      });
    },
  });
};

export const useSubmitTimesheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      submissionId,
    }: {
      organizationId: string;
      submissionId: string;
    }) => {
      return timesheetsAPI.submitTimesheet(organizationId, submissionId);
    },
    onSuccess: (data, variables) => {
      // Invalidate all timesheet queries
      queryClient.invalidateQueries({
        queryKey: ["timesheet"],
        exact: false,
      });

      // Invalidate all submissions queries
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
        exact: false,
      });

      // Invalidate capacity queries (timesheets affect capacity)
      queryClient.invalidateQueries({
        queryKey: ["capacity"],
        exact: false,
      });
    },
  });
};

export const useTimesheetSubmissions = (
  organizationId: string | null,
  filters?: {
    status?: "submitted" | "approved" | "rejected";
    userId?: string;
    selectedWeek?: string;
    page?: number;
    limit?: number;
    search?: string;
  }
) => {
  return useQuery({
    queryKey: ["submissions", organizationId, filters],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required");

      let apiFilters: { [key: string]: string | number | undefined } = {
        ...filters,
      };
      if (filters?.selectedWeek) {
        const weekStart = new Date(filters.selectedWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4); // Friday

        apiFilters = {
          ...filters,
          weekStart: weekStart.toISOString().split("T")[0],
          weekEnd: weekEnd.toISOString().split("T")[0],
        };
        delete apiFilters.selectedWeek;
      }

      return timesheetsAPI.getSubmissionsForApproval(
        organizationId,
        apiFilters
      );
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useResolveSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      submissionId,
      action,
      rejectionReason,
    }: {
      organizationId: string;
      submissionId: string;
      action: "approve" | "reject";
      rejectionReason?: string;
    }) => {
      return timesheetsAPI.resolveSubmission(
        organizationId,
        submissionId,
        action,
        rejectionReason
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate all submissions queries
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
        exact: false,
      });

      // Invalidate timesheet queries
      queryClient.invalidateQueries({
        queryKey: ["timesheet"],
        exact: false,
      });

      // Invalidate capacity queries (approved timesheets affect capacity)
      queryClient.invalidateQueries({
        queryKey: ["capacity"],
        exact: false,
      });
    },
  });
};

// Hook to get capacity projects for current user
export const useCapacityProjects = (organizationId: string | null) => {
  return useQuery({
    queryKey: ["capacity-projects", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required");

      return await timesheetsAPI.getCapacityProjects(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateTimesheetEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      entryId,
      data,
    }: {
      organizationId: string;
      entryId: string;
      data: {
        project_id?: string;
        task_description?: string;
        monday_hours?: number;
        tuesday_hours?: number;
        wednesday_hours?: number;
        thursday_hours?: number;
        friday_hours?: number;
        monday_notes?: string;
        tuesday_notes?: string;
        wednesday_notes?: string;
        thursday_notes?: string;
        friday_notes?: string;
        is_billable?: boolean;
      };
    }) => {
      return timesheetsAPI.updateTimesheetEntry(organizationId, entryId, data);
    },
    onSuccess: (data, variables) => {
      // Invalidate all timesheet queries
      queryClient.invalidateQueries({
        queryKey: ["timesheet"],
        exact: false,
      });
    },
  });
};

export const useDeleteTimesheetEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      entryId,
    }: {
      organizationId: string;
      entryId: string;
    }) => {
      return timesheetsAPI.deleteTimesheetEntry(organizationId, entryId);
    },
    onSuccess: (data, variables) => {
      // Invalidate all timesheet queries
      queryClient.invalidateQueries({
        queryKey: ["timesheet"],
        exact: false,
      });
    },
  });
};
