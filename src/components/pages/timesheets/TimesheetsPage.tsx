"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Save,
  Send,
  Check,
  X,
  User,
  Eye,
  StickyNote,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import {
  useTimesheetsStore,
  useTimesheetData,
  useSaveTimesheet,
  useSubmitTimesheet,
  useResolveSubmission,
  useTimesheetSubmissions,
  useAddTimesheetEntry,
  useUpdateTimesheetEntry,
  useDeleteTimesheetEntry,
  type TimesheetEntry as StoreTimesheetEntry,
  TimesheetEntry,
  useCapacityProjects,
} from "@/lib/stores/timesheetsStore";
import { PermissionChecks } from "@/utils/rbac";
import WeekPicker from "./WeekPicker";
import { canViewTimesheetSubmissions } from "@/utils/clientOrganizationUtils";
import { toast } from "sonner";
import { endOfWeek, isWithinInterval, startOfWeek } from "date-fns";
import { dateUtils } from "@/utils/dateUtils";

// Types
interface TimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  taskDescription: string;
  isPlanned: boolean;
  monday: { hours: number; notes: string };
  tuesday: { hours: number; notes: string };
  wednesday: { hours: number; notes: string };
  thursday: { hours: number; notes: string };
  friday: { hours: number; notes: string };
  total: number;
  isNew: boolean;
  isBillable: boolean;
}

interface TimesheetSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  entries: TimeEntry[];
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface EntryChanges {
  [entryId: string]: Partial<TimesheetEntry>;
}

interface Project {
  id: string;
  name: string;
  code?: string;
  isPlanned: boolean;
}

export default function TimesheetsPage() {
  const {
    currentOrganization,
    loading: organizationLoading,
    organizationContext,
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();

  const [submissionFilters, setSubmissionFilters] = useState({
    status: "submitted" as "submitted" | "approved" | "rejected",
    userId: "",
    selectedWeek: dateUtils.getCurrentWeekStart(),
    search: "",
    page: 1,
    limit: 10,
  });

  const [showSubmitModal, setShowSubmitModal] = useState<{
    totalHours: number;
    weekStart: string;
    weekEnd: string;
  } | null>(null);

  const [showApproveModal, setShowApproveModal] = useState<{
    submissionId: string;
    userName: string;
    weekStart: string;
    weekEnd: string;
  } | null>(null);

  const [showRejectModal, setShowRejectModal] = useState<{
    submissionId: string;
    userName: string;
    weekStart: string;
    weekEnd: string;
  } | null>(null);

  const { currentWeekStart, setWeekStart, activeTab, setActiveTab } =
    useTimesheetsStore();

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useTimesheetSubmissions(
    currentOrganization?.id || null,
    submissionFilters
  );

  const {
    data: timesheetData,
    isLoading: timesheetLoading,
    error: timesheetError,
    refetch: refetchTimesheet,
  } = useTimesheetData(currentOrganization?.id || null, currentWeekStart);

  const isTimesheetSubmitted =
    timesheetData?.submission?.status === "submitted" ||
    timesheetData?.submission?.status === "approved" ||
    timesheetData?.submission?.status === "rejected";

  const {
    data: capacityProjectsData,
    isLoading: capacityProjectsLoading,
    error: capacityProjectsError,
  } = useCapacityProjects(currentOrganization?.id || null);

  const saveMutation = useSaveTimesheet();
  const submitMutation = useSubmitTimesheet();
  const resolveMutation = useResolveSubmission();
  const updateEntryMutation = useUpdateTimesheetEntry();
  const deleteEntryMutation = useDeleteTimesheetEntry();

  // State for frontend-only entries
  const [frontendEntries, setFrontendEntries] = useState<TimesheetEntry[]>([]);

  // State for new entries only (not existing ones)
  const [newEntries, setNewEntries] = useState<TimesheetEntry[]>([]);
  // State for tracking changes to existing entries
  const [entryChanges, setEntryChanges] = useState<EntryChanges>({});
  // State for tracking deleted entries
  const [deletedEntryIds, setDeletedEntryIds] = useState<Set<string>>(
    new Set()
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // State
  const [error, setError] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{
    entryId: string;
    day: string;
    notes: string;
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] =
    useState<TimesheetSubmission | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState<{
    entryId: string;
    entryName: string;
  } | null>(null);

  const [showUnsavedWarning, setShowUnsavedWarning] = useState<{
    action: string;
    onConfirm: () => void;
  } | null>(null);

  // Initialize
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Handle week change - refetch data when week changes
  useEffect(() => {
    if (currentOrganization?.id && currentWeekStart) {
      refetchTimesheet();
    }
  }, [currentWeekStart, currentOrganization?.id, refetchTimesheet]);

  // Reset changes when timesheet data changes
  useEffect(() => {
    setNewEntries([]);
    setEntryChanges({});
    setDeletedEntryIds(new Set());
    setHasUnsavedChanges(false);
  }, [timesheetData?.submission?.id]);

  // Track changes to determine if save button should be active
  useEffect(() => {
    const hasChanges =
      newEntries.length > 0 ||
      Object.keys(entryChanges).length > 0 ||
      deletedEntryIds.size > 0;
    setHasUnsavedChanges(hasChanges);
  }, [newEntries, entryChanges, deletedEntryIds]);

  // Helper functions


  const canApproveTimesheets = canViewTimesheetSubmissions(organizationContext);

  function getWeekDays(weekStart: string): string[] {
    const start = new Date(weekStart);
    const days = [];
    for (let i = 0; i < 5; i++) {
      // Only Monday to Friday
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day.toISOString().split("T")[0]);
    }
    return days;
  }

  const checkUnsavedChanges = (action: string, onConfirm: () => void) => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning({ action, onConfirm });
    } else {
      onConfirm();
    }
  };

  // Event handlers
  const addTimeEntry = async () => {
    const newId = `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: TimesheetEntry = {
      id: newId,
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
      thursday_notes: "",
      friday_notes: "",
      is_billable: false,
    };
    setNewEntries([...newEntries, newEntry]);
    setHasUnsavedChanges(true);
  };

  const updateTimeEntry = async (
    entryId: string,
    field: string,
    value: any
  ) => {
    // Check if it's a new entry (starts with 'frontend-')
    const isNewEntry = entryId.startsWith("frontend-");

    if (isNewEntry) {
      // Update new entry
      setNewEntries((prevEntries) =>
        prevEntries.map((entry) => {
          if (entry.id === entryId) {
            if (field.includes(".")) {
              const [day, prop] = field.split(".");
              const updatedEntry = { ...entry };

              if (prop === "hours") {
                updatedEntry[`${day}_hours` as keyof TimesheetEntry] = value;
              } else if (prop === "notes") {
                updatedEntry[`${day}_notes` as keyof TimesheetEntry] = value;
              }

              return updatedEntry;
            } else {
              return { ...entry, [field]: value };
            }
          }
          return entry;
        })
      );
      setHasUnsavedChanges(true);
    } else {
      // Update existing entry with optimistic updates
      if (!currentOrganization?.id) {
        setError("Organization not found");
        return;
      }

      // Prepare the update data
      const updateData: Partial<TimesheetEntry> = {};

      if (field.includes(".")) {
        const [day, prop] = field.split(".");
        if (prop === "hours") {
          updateData[`${day}_hours` as keyof TimesheetEntry] = value;
        } else if (prop === "notes") {
          updateData[`${day}_notes` as keyof TimesheetEntry] = value;
        }
      } else {
        updateData[field as keyof TimesheetEntry] = value;
      }

      // Store the change locally for optimistic update
      setEntryChanges((prev) => ({
        ...prev,
        [entryId]: {
          ...prev[entryId],
          ...updateData,
        },
      }));

      // Perform optimistic update via API
      try {
        await updateEntryMutation.mutateAsync({
          organizationId: currentOrganization.id,
          entryId: entryId,
          data: updateData,
        });
        // Clear the change for this entry since it's now saved on the server
        // The refetch will bring the updated value, so we don't need to keep the change
        setEntryChanges((prev) => {
          const newChanges = { ...prev };
          // Only remove the fields that were just updated, keep other pending changes
          if (newChanges[entryId]) {
            const remainingChanges = { ...newChanges[entryId] };
            Object.keys(updateData).forEach((key) => {
              delete remainingChanges[key as keyof TimesheetEntry];
            });
            if (Object.keys(remainingChanges).length === 0) {
              delete newChanges[entryId];
            } else {
              newChanges[entryId] = remainingChanges as any;
            }
          }
          return newChanges;
        });
        setError(null);
      } catch (error: any) {
        // Revert the optimistic update on error
        setEntryChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[entryId];
          return newChanges;
        });
        setError(error.message || "Failed to update time entry");
      }
    }
  };

  const confirmDeleteTimeEntry = (entryId: string) => {
    // Find the entry to get its name for the confirmation dialog
    const allEntries = [...databaseTimeEntries, ...newTimeEntries];
    const entry = allEntries.find((e) => e.id === entryId);
    const entryName = entry
      ? `${entry.projectName} - ${entry.taskDescription}`
      : "this entry";

    setShowDeleteModal({
      entryId,
      entryName: entryName || "this entry",
    });
  };

  const deleteTimeEntry = async (entryId: string) => {
    // Check if it's a new entry
    const isNewEntry = entryId.startsWith("frontend-");

    if (isNewEntry) {
      // Remove from new entries
      setNewEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== entryId)
      );
      setHasUnsavedChanges(true);
    } else {
      // Delete existing entry
      if (!currentOrganization?.id) {
        setError("Organization not found");
        return;
      }

      // Mark as deleted locally for optimistic update
      setDeletedEntryIds((prev) => new Set([...prev, entryId]));

      try {
        await deleteEntryMutation.mutateAsync({
          organizationId: currentOrganization.id,
          entryId: entryId,
        });
        setError(null);
      } catch (error: any) {
        // Revert the optimistic update on error
        setDeletedEntryIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(entryId);
          return newSet;
        });
        setError(error.message || "Failed to delete time entry");
      }
    }

    setShowDeleteModal(null);
  };

  const calculateTotal = (entry: TimeEntry): number => {
    // Convert all hour values to numbers before adding
    return (
      Number(entry.monday?.hours || 0) +
      Number(entry.tuesday?.hours || 0) +
      Number(entry.wednesday?.hours || 0) +
      Number(entry.thursday?.hours || 0) +
      Number(entry.friday?.hours || 0)
    );
  };

  const saveTimesheet = async () => {
    if (!currentOrganization?.id) {
      setError("Organization not found");
      return;
    }

    try {
      // Prepare entries to save
      const entriesToSave: TimesheetEntry[] = [];

      // Add new entries
      entriesToSave.push(...newEntries);

      // Add existing entries with changes (excluding deleted ones)
      const existingEntries = timesheetData?.entries || [];
      existingEntries.forEach((entry) => {
        if (!deletedEntryIds.has(entry.id)) {
          const changes = entryChanges[entry.id] || {};
          entriesToSave.push({
            ...entry,
            ...changes,
          });
        }
      });

      await saveMutation.mutateAsync({
        organizationId: currentOrganization.id,
        weekStart: currentWeekStart,
        entries: entriesToSave,
        submissionId: timesheetData?.submission?.id,
      });

      // Clear local state after successful save
      setNewEntries([]);
      setEntryChanges({});
      setDeletedEntryIds(new Set());
      setHasUnsavedChanges(false);
      setError(null);
    } catch (error: any) {
      setError(error.message || "Failed to save timesheet");
    }
  };

  const submitTimesheet = async () => {
    if (!currentOrganization?.id || !timesheetData?.submission?.id) return;

    // Check for unsaved changes and prevent submission
    const hasNewEntries = newEntries.length > 0;
    const hasChangedEntries = Object.keys(entryChanges).length > 0;
    const hasDeletedEntries = deletedEntryIds.size > 0;
    const hasAnyUnsavedChanges = hasNewEntries || hasChangedEntries || hasDeletedEntries;

    if (hasAnyUnsavedChanges) {
      toast.error("Please save before submitting", {
        description: "You have unsaved changes. Please save your timesheet before submitting.",
        duration: 5000,
      });
      return;
    }

    // Validate entries
    const allEntries = [...(timesheetData?.entries || []), ...frontendEntries];

    const hasEntries = allEntries.length > 0;
    const hasValidEntries = allEntries.every(
      (entry) =>
        entry.project_id &&
        entry.task_description &&
        (entry.monday_hours > 0 ||
          entry.tuesday_hours > 0 ||
          entry.wednesday_hours > 0 ||
          entry.thursday_hours > 0 ||
          entry.friday_hours > 0)
    );

    if (!hasEntries) {
      toast.error("No time entries", {
        description: "Please add at least one time entry before submitting.",
        duration: 5000,
      });
      return;
    }

    if (!hasValidEntries) {
      toast.error("Incomplete entries", {
        description: "Please fill in all required fields (Project, Task, and at least some hours).",
        duration: 5000,
      });
      return;
    }

    // Show confirmation modal
    const weekStartDate = new Date(currentWeekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 4);

    setShowSubmitModal({
      totalHours: totalHours,
      weekStart: currentWeekStart,
      weekEnd: weekEndDate.toISOString().split("T")[0],
    });
  };

  // Add new function to handle confirmed submission
  const confirmSubmitTimesheet = async () => {
    if (!currentOrganization?.id || !timesheetData?.submission?.id) return;

    try {
      await submitMutation.mutateAsync({
        organizationId: currentOrganization.id,
        submissionId: timesheetData.submission.id,
      });

      toast.success("Timesheet submitted successfully!", {
        description: "Your timesheet has been sent for approval.",
        duration: 5000,
      });

      setShowSubmitModal(null);
      refetchTimesheet(); // Refresh the timesheet data
    } catch (error: any) {
      toast.error("Failed to submit timesheet", {
        description: error.message || "Please try again.",
        duration: 5000,
      });
      setError(error.message || "Failed to submit timesheet");
    }
  };

  const approveSubmission = async (submissionId: string) => {
    if (!currentOrganization?.id) return;

    try {
      await resolveMutation.mutateAsync({
        organizationId: currentOrganization.id,
        submissionId,
        action: "approve",
      });
      toast.success("Timesheet approved successfully!", {
        description: "The timesheet has been approved.",
        duration: 5000,
      });
      setShowApproveModal(null);
      refetchSubmissions();
    } catch (error: any) {
      toast.error("Failed to approve timesheet", {
        description: error.message || "Please try again.",
        duration: 5000,
      });
      setError(error.message || "Failed to approve submission");
    }
  };

  const rejectSubmission = async (submissionId: string) => {
    if (!currentOrganization?.id) return;

    try {
      await resolveMutation.mutateAsync({
        organizationId: currentOrganization.id,
        submissionId,
        action: "reject",
      });
      toast.success("Timesheet rejected successfully!", {
        description: "The timesheet has been rejected.",
        duration: 5000,
      });
      refetchSubmissions();
      setShowRejectModal(null);
    } catch (error: any) {
      toast.error("Failed to reject timesheet", {
        description: error.message || "Please try again.",
        duration: 5000,
      });
      setError(error.message || "Failed to reject submission");
    }
  };

  // Add new functions to show confirmation modals
  const showApproveConfirmation = (submission: TimesheetSubmission) => {
    setShowApproveModal({
      submissionId: submission.id,
      userName: submission.userName,
      weekStart: submission.weekStart,
      weekEnd: submission.weekEnd,
    });
  };

  const showRejectConfirmation = (submission: TimesheetSubmission) => {
    setShowRejectModal({
      submissionId: submission.id,
      userName: submission.userName,
      weekStart: submission.weekStart,
      weekEnd: submission.weekEnd,
    });
  };

  // Transform database entries to TimeEntry format
  const databaseTimeEntries: TimeEntry[] =
    timesheetData?.entries
      ?.filter((entry) => !deletedEntryIds.has(entry.id))
      ?.map((entry: StoreTimesheetEntry) => {
        const changes = entryChanges[entry.id] || {};
        const updatedEntry = { ...entry, ...changes };

        // Find the project for this entry
        const project = capacityProjectsData?.projects?.find(
          (p) => p.id === updatedEntry.project_id
        );

        return {
          id: updatedEntry.id || "",
          projectId: updatedEntry.project_id,
          projectName: project?.name || "",
          taskDescription: updatedEntry.task_description,
          isPlanned: project?.isPlanned || false,
          monday: {
            hours: Number(updatedEntry.monday_hours || 0),
            notes: updatedEntry.monday_notes || "",
          },
          tuesday: {
            hours: Number(updatedEntry.tuesday_hours || 0),
            notes: updatedEntry.tuesday_notes || "",
          },
          wednesday: {
            hours: Number(updatedEntry.wednesday_hours || 0),
            notes: updatedEntry.wednesday_notes || "",
          },
          thursday: {
            hours: Number(updatedEntry.thursday_hours || 0),
            notes: updatedEntry.thursday_notes || "",
          },
          friday: {
            hours: Number(updatedEntry.friday_hours || 0),
            notes: updatedEntry.friday_notes || "",
          },
          total:
            Number(updatedEntry.monday_hours || 0) +
            Number(updatedEntry.tuesday_hours || 0) +
            Number(updatedEntry.wednesday_hours || 0) +
            Number(updatedEntry.thursday_hours || 0) +
            Number(updatedEntry.friday_hours || 0),
          isNew: false,
          isBillable: updatedEntry.is_billable ?? false,
        };
      }) || [];

  const newTimeEntries: TimeEntry[] = newEntries.map((entry) => {
    const project = capacityProjectsData?.projects?.find(
      (p) => p.id === entry.project_id
    );

    return {
      id: entry.id,
      projectId: entry.project_id,
      projectName: project?.name || "",
      taskDescription: entry.task_description,
      isPlanned: project?.isPlanned || false,
      monday: {
        hours: Number(entry.monday_hours || 0),
        notes: entry.monday_notes || "",
      },
      tuesday: {
        hours: Number(entry.tuesday_hours || 0),
        notes: entry.tuesday_notes || "",
      },
      wednesday: {
        hours: Number(entry.wednesday_hours || 0),
        notes: entry.wednesday_notes || "",
      },
      thursday: {
        hours: Number(entry.thursday_hours || 0),
        notes: entry.thursday_notes || "",
      },
      friday: {
        hours: Number(entry.friday_hours || 0),
        notes: entry.friday_notes || "",
      },
      total:
        Number(entry.monday_hours || 0) +
        Number(entry.tuesday_hours || 0) +
        Number(entry.wednesday_hours || 0) +
        Number(entry.thursday_hours || 0) +
        Number(entry.friday_hours || 0),
      isNew: true,
      isBillable: entry.is_billable ?? false,
    };
  });

  const allTimeEntries = [...newTimeEntries, ...databaseTimeEntries];

  const submissions: TimesheetSubmission[] =
    submissionsData?.submissions?.map((sub: any) => ({
      id: sub.id,
      userId: sub.userId,
      userName: sub.userName,
      userEmail: sub.userEmail,
      weekStart: sub.weekStart,
      weekEnd: sub.weekEnd,
      totalHours: sub.totalHours,
      status: sub.status,
      entries: sub.data || [],
      submittedAt: sub.submittedAt,
      approvedAt: sub.approvedAt,
      approvedBy: sub.approvedBy,
    })) || [];

  const weekDays = getWeekDays(currentWeekStart);
  const totalHours = allTimeEntries.reduce(
    (sum, entry) => sum + calculateTotal(entry),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track and manage time entries across projects
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() =>
                checkUnsavedChanges("switching tabs", () =>
                  setActiveTab("my-timesheet")
                )
              }
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "my-timesheet"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              My Timesheet
            </button>
            {canApproveTimesheets && (
              <button
                onClick={() =>
                  checkUnsavedChanges("switching tabs", () =>
                    setActiveTab("approve-timesheets")
                  )
                }
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "approve-timesheets"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Approve Timesheets
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === "my-timesheet" ? (
          <MyTimesheetView
            selectedWeek={currentWeekStart}
            setSelectedWeek={(week) =>
              checkUnsavedChanges("changing week", () => setWeekStart(week))
            }
            timeEntries={allTimeEntries}
            projects={capacityProjectsData?.projects || []}
            weekDays={weekDays}
            totalHours={totalHours}
            onAddEntry={addTimeEntry}
            onUpdateEntry={updateTimeEntry}
            onDeleteEntry={confirmDeleteTimeEntry}
            onSave={saveTimesheet}
            onSubmit={submitTimesheet}
            onShowNoteModal={setShowNoteModal}
            loading={
              timesheetLoading ||
              saveMutation.isPending ||
              capacityProjectsLoading ||
              submitMutation.isPending
            }
            hasUnsavedChanges={hasUnsavedChanges}
            submissionStatus={timesheetData?.submission?.status}
            isReadOnly={isTimesheetSubmitted}
          />
        ) : (
          <ApproveTimesheetsView
            submissions={submissions}
            pagination={submissionsData?.pagination}
            onApprove={showApproveConfirmation}
            onReject={showRejectConfirmation}
            onShowDetails={setShowDetailsModal}
            loading={submissionsLoading || resolveMutation.isPending}
            filters={submissionFilters}
            onFiltersChange={(newFilters) => {
              setSubmissionFilters({ ...newFilters, page: 1 });
            }}
            onPageChange={(page) => {
              setSubmissionFilters((prev) => ({ ...prev, page }));
            }}
          />
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <NoteModal
          note={showNoteModal}
          onSave={(notes) => {
            updateTimeEntry(
              showNoteModal.entryId,
              `${showNoteModal.day}.notes`,
              notes
            );
            setShowNoteModal(null);
          }}
          onClose={() => setShowNoteModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          entryName={showDeleteModal.entryName}
          onConfirm={() => {
            deleteTimeEntry(showDeleteModal.entryId);
            setShowDeleteModal(null);
          }}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <UnsavedChangesModal
          action={showUnsavedWarning.action}
          onSave={() => {
            saveTimesheet().then(() => {
              setShowUnsavedWarning(null);
              showUnsavedWarning.onConfirm();
            });
          }}
          onDiscard={() => {
            setNewEntries([]);
            setEntryChanges({});
            setDeletedEntryIds(new Set());
            setShowUnsavedWarning(null);
            showUnsavedWarning.onConfirm();
          }}
          onCancel={() => setShowUnsavedWarning(null)}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <DetailsModal
          submission={showDetailsModal}
          onClose={() => setShowDetailsModal(null)}
        />
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <ApproveConfirmationModal
          submission={showApproveModal}
          onConfirm={() => approveSubmission(showApproveModal.submissionId)}
          onCancel={() => setShowApproveModal(null)}
          loading={resolveMutation.isPending}
        />
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <RejectConfirmationModal
          submission={showRejectModal}
          onConfirm={() => rejectSubmission(showRejectModal.submissionId)}
          onCancel={() => setShowRejectModal(null)}
          loading={resolveMutation.isPending}
        />
      )}

      {showSubmitModal && (
        <SubmitConfirmationModal
          submission={showSubmitModal}
          onConfirm={confirmSubmitTimesheet}
          onCancel={() => setShowSubmitModal(null)}
          loading={submitMutation.isPending}
        />
      )}
    </div>
  );
}

function MyTimesheetView({
  selectedWeek,
  setSelectedWeek,
  timeEntries,
  projects,
  weekDays,
  totalHours,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSave,
  onSubmit,
  onShowNoteModal,
  loading,
  hasUnsavedChanges,
  submissionStatus,
  isReadOnly = false,
}: {
  selectedWeek: string;
  setSelectedWeek: (week: string) => void;
  timeEntries: TimeEntry[];
  projects: Project[];
  weekDays: string[];
  totalHours: number;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, field: string, value: any) => void;
  onDeleteEntry: (entryId: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  onShowNoteModal: (modal: any) => void;
  loading: boolean;
  hasUnsavedChanges: boolean;
  submissionStatus?: string;
  isReadOnly?: boolean;
}) {
  return (
    <div>
      {/* Week Selector and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <WeekPicker
              value={selectedWeek}
              onChange={setSelectedWeek}
              className="flex items-center space-x-2"
            />
            {submissionStatus && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${submissionStatus === "approved"
                    ? "bg-green-100 text-green-800"
                    : submissionStatus === "submitted"
                      ? "bg-yellow-100 text-yellow-800"
                      : submissionStatus === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                >
                  {submissionStatus === "submitted"
                    ? "Pending Approval"
                    : submissionStatus}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Total Hours: <span className="font-semibold">{totalHours}</span>
            </div>
            {isReadOnly ? (
              <div className="text-sm text-gray-500 italic">
                This timesheet has been submitted and cannot be edited
              </div>
            ) : (
              <>
                {hasUnsavedChanges && (
                  <div className="text-sm text-orange-600 font-medium flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={onSave}
                  disabled={loading || !hasUnsavedChanges}
                  className={
                    hasUnsavedChanges
                      ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      : ""
                  }
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={onSubmit} disabled={loading}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Time Entries{" "}
              {isReadOnly && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  (Read-only)
                </span>
              )}
            </h3>
            {!isReadOnly && (
              <Button size="sm" onClick={onAddEntry} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project / Task
                </th>
                {weekDays.map((day, index) => (
                  <th
                    key={day}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {["Mon", "Tue", "Wed", "Thu", "Fri"][index]}
                    <br />
                    <span className="text-xs text-gray-400">
                      {new Date(day).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeEntries.map((entry, index) => {
                const isNewEntry = entry.isNew;

                return (
                  <tr
                    key={entry.id || index}
                    className={isNewEntry ? "bg-blue-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <select
                          value={entry.projectId || ""}
                          onChange={(e) =>
                            onUpdateEntry(
                              entry.id,
                              "project_id",
                              e.target.value
                            )
                          }
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          disabled={loading || isReadOnly}
                        >
                          <option value="">Select Project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name} {project.isPlanned && "(Planned)"}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={entry.taskDescription}
                          onChange={(e) =>
                            onUpdateEntry(
                              entry.id,
                              "task_description",
                              e.target.value
                            )
                          }
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Enter task description"
                          disabled={loading || isReadOnly}
                        />
                      </div>
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const dayKey = [
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                      ][dayIndex];
                      return (
                        <td
                          key={day}
                          className="px-6 py-4 whitespace-nowrap text-center"
                        >
                          <div className="flex flex-col space-y-1">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.25"
                              value={
                                entry[dayKey as keyof TimeEntry]?.hours || 0
                              }
                              onChange={(e) =>
                                onUpdateEntry(
                                  entry.id,
                                  `${dayKey}.hours`,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="block w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              disabled={loading || isReadOnly}
                            />
                            <button
                              onClick={() =>
                                onShowNoteModal({
                                  entryId: entry.id,
                                  day: dayKey,
                                  notes:
                                    entry[dayKey as keyof TimeEntry]?.notes ||
                                    "",
                                })
                              }
                              className="text-xs text-primary-600 hover:text-primary-800 flex items-center justify-center"
                              disabled={loading || isReadOnly}
                            >
                              <StickyNote className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {Number(entry.total || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.isBillable}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, "is_billable", e.target.checked)
                            }
                            disabled={loading || isReadOnly}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                        disabled={loading || isReadOnly}
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {timeEntries.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No time entries
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first time entry for this week.
            </p>
            <div className="mt-6">
              <Button onClick={onAddEntry}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  entryName,
  onConfirm,
  onCancel,
}: {
  entryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete Time Entry
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <strong>{entryName}</strong>? This
              action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Unsaved Changes Warning Modal Component
function UnsavedChangesModal({
  action,
  onSave,
  onDiscard,
  onCancel,
}: {
  action: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Unsaved Changes
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              You have unsaved changes. What would you like to do before{" "}
              {action}?
            </p>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <Button onClick={onSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={onDiscard}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              Discard Changes
            </Button>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproveTimesheetsView({
  submissions,
  pagination,
  onApprove,
  onReject,
  onShowDetails,
  loading,
  filters,
  onFiltersChange,
  onPageChange,
}: {
  submissions: TimesheetSubmission[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onApprove: (submission: TimesheetSubmission) => void;
  onReject: (submission: TimesheetSubmission) => void;
  onShowDetails: (submission: TimesheetSubmission) => void;
  loading: boolean;
  filters: {
    status: string;
    userId: string;
    selectedWeek: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  onPageChange: (page: number) => void;
}) {

  const filteredSubmissions = React.useMemo(() => {
    if (!filters.selectedWeek) return submissions;

    const weekStart = startOfWeek(new Date(filters.selectedWeek), {
      weekStartsOn: 1,
    });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    return submissions.filter((submission) =>
      isWithinInterval(new Date(submission.weekStart), {
        start: weekStart,
        end: weekEnd,
      })
    );
  }, [submissions, filters.selectedWeek]);

  return (
    <div>
      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week
            </label>
            <WeekPicker
              value={filters.selectedWeek || dateUtils.getCurrentWeekStart()}
              onChange={(weekStart) =>
                onFiltersChange({ ...filters, selectedWeek: weekStart })
              }
              className="w-full"
            />
          </div>

          {/* Search Filter */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Employee
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              placeholder="Search by name or email..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div> */}
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onFiltersChange({
                status: "submitted", // Default to submitted
                userId: "",
                selectedWeek: dateUtils.getCurrentWeekStart(),
                search: "",
              })
            }
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Timesheet Submissions
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {submission?.userAvatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={submission.userAvatar}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {submission.userName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(submission.weekStart).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}{" "}
                    -{" "}
                    {new Date(submission.weekEnd).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {submission.totalHours} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${submission.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : submission.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : submission.status === "submitted"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onShowDetails(submission)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {submission.status === "submitted" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(submission)}
                            disabled={loading}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(submission)}
                            disabled={loading}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {submissions.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No submissions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No timesheet submissions are waiting for approval.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteModal({
  note,
  onSave,
  onClose,
}: {
  note: { entryId: string; day: string; notes: string };
  onSave: (notes: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(note.notes);
  const dayNames = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Add Note for {dayNames[note.day as keyof typeof dayNames]}
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you worked on..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-24 resize-none"
          />
          <div className="flex items-center justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(notes)}>Save Note</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  submission,
  onClose,
}: {
  submission: TimesheetSubmission;
  onClose: () => void;
}) {
  // Helper function to format time entries
  const formatTimeEntries = (entries: any[]) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p>No time entries found for this week.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div
            key={entry.id || index}
            className="border rounded-lg p-4 bg-gray-50"
          >
            {/* Entry Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-medium text-gray-900">
                  {entry.projects?.name || "Unknown Project"}
                  {entry.projects?.code && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({entry.projects.code})
                    </span>
                  )}
                </h5>
                <p className="text-sm text-gray-600 mt-1">
                  {entry.task_description || "No description provided"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900">
                  Total:{" "}
                  {(
                    Number(entry.monday_hours || 0) +
                    Number(entry.tuesday_hours || 0) +
                    Number(entry.wednesday_hours || 0) +
                    Number(entry.thursday_hours || 0) +
                    Number(entry.friday_hours || 0)
                  ).toFixed(2)}
                  h
                </span>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="grid grid-cols-5 gap-3 text-sm">
              {[
                {
                  day: "Monday",
                  hours: entry.monday_hours || 0,
                  notes: entry.monday_notes,
                },
                {
                  day: "Tuesday",
                  hours: entry.tuesday_hours || 0,
                  notes: entry.tuesday_notes,
                },
                {
                  day: "Wednesday",
                  hours: entry.wednesday_hours || 0,
                  notes: entry.wednesday_notes,
                },
                {
                  day: "Thursday",
                  hours: entry.thursday_hours || 0,
                  notes: entry.thursday_notes,
                },
                {
                  day: "Friday",
                  hours: entry.friday_hours || 0,
                  notes: entry.friday_notes,
                },
              ].map((dayData, dayIndex) => (
                <div key={dayIndex} className="text-center">
                  <div className="font-medium text-gray-700 mb-1">
                    {dayData.day.slice(0, 3)}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">
                    {dayData.hours > 0 ? `${dayData.hours}h` : "-"}
                  </div>
                  {dayData.notes && (
                    <div className="text-xs text-gray-600 bg-white p-1 rounded border">
                      <div className="flex items-center justify-center mb-1">
                        <StickyNote className="w-3 h-3" />
                      </div>
                      <div className="max-h-16 overflow-y-auto">
                        {dayData.notes}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Entry Footer */}
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Entry ID: {entry.id}</span>
                <span>
                  Created:{" "}
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Timesheet Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Submission Info */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Employee:</span>{" "}
                {submission.userName}
              </div>
              <div>
                <span className="font-medium">Email:</span>{" "}
                {submission.userEmail}
              </div>
              <div>
                <span className="font-medium">Week:</span>{" "}
                {new Date(submission.weekStart).toLocaleDateString()} -{" "}
                {new Date(submission.weekEnd).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Total Hours:</span>{" "}
                {submission.totalHours}
              </div>
              <div>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${submission.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : submission.status === "submitted"
                      ? "bg-blue-100 text-blue-800"
                      : submission.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                >
                  {submission.status}
                </span>
              </div>
              {submission.submittedAt && (
                <div>
                  <span className="font-medium">Submitted:</span>{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                </div>
              )}
              {submission.approvedAt && (
                <div>
                  <span className="font-medium">Approved:</span>{" "}
                  {new Date(submission.approvedAt).toLocaleString()}
                </div>
              )}
              {/* {submission?.rejectionReason && (
                <div className="col-span-2">
                  <span className="font-medium">Rejection Reason:</span>{" "}
                  <span className="text-red-600">
                    {submission.rejectionReason}
                  </span>
                </div>
              )} */}
            </div>
          </div>

          {/* Time Entries Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Time Entries ({submission.entries?.length || 0})
              </h4>
              <div className="text-sm text-gray-500">
                Total: {submission.totalHours} hours
              </div>
            </div>

            {/* Time Entries Display */}
            <div className="max-h-96 overflow-y-auto">
              {formatTimeEntries(submission.entries || [])}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// Approve Confirmation Modal
function ApproveConfirmationModal({
  submission,
  onConfirm,
  onCancel,
  loading,
}: {
  submission: {
    submissionId: string;
    userName: string;
    weekStart: string;
    weekEnd: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Approve Timesheet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to approve the timesheet for{" "}
              <span className="font-semibold">{submission.userName}</span>?
            </p>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                <span className="font-medium">Week:</span>{" "}
                {new Date(submission.weekStart).toLocaleDateString()} -{" "}
                {new Date(submission.weekEnd).toLocaleDateString()}
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <Button
              onClick={onConfirm}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Approving..." : "Yes, Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reject Confirmation Modal
function RejectConfirmationModal({
  submission,
  onConfirm,
  onCancel,
  loading,
}: {
  submission: {
    submissionId: string;
    userName: string;
    weekStart: string;
    weekEnd: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <X className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reject Timesheet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to reject the timesheet for{" "}
              <span className="font-semibold">{submission.userName}</span>?
            </p>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                <span className="font-medium">Week:</span>{" "}
                {new Date(submission.weekStart).toLocaleDateString()} -{" "}
                {new Date(submission.weekEnd).toLocaleDateString()}
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <Button
              onClick={onConfirm}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Rejecting..." : "Yes, Reject"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this modal component at the end of the file
function SubmitConfirmationModal({
  submission,
  onConfirm,
  onCancel,
  loading,
}: {
  submission: {
    totalHours: number;
    weekStart: string;
    weekEnd: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Submit Timesheet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to submit your timesheet for approval?
            </p>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                <span className="font-medium">Week:</span>{" "}
                {new Date(submission.weekStart).toLocaleDateString()} -{" "}
                {new Date(submission.weekEnd).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Total Hours:</span>{" "}
                {submission.totalHours}
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Once submitted, you won't be able to edit this timesheet.
            </p>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <Button
              onClick={onConfirm}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Yes, Submit"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
