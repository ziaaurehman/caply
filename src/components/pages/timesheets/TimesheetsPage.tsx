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
import WeekPicker from "./WeekPicker";

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
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();

  const { currentWeekStart, setWeekStart, activeTab, setActiveTab } =
    useTimesheetsStore();

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useTimesheetSubmissions(currentOrganization?.id || null);

  const {
    data: timesheetData,
    isLoading: timesheetLoading,
    error: timesheetError,
    refetch: refetchTimesheet,
  } = useTimesheetData(currentOrganization?.id || null, currentWeekStart);

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
  const [selectedWeek, setSelectedWeek] = useState<string>(
    getCurrentWeekStart()
  );
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
  function getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(now);
    monday.setDate(diff);
    return monday.toISOString().split("T")[0];
  }

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
      friday_notes: "",
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
  };

  const calculateTotal = (entry: TimeEntry): number => {
    return (
      entry.monday.hours +
      entry.tuesday.hours +
      entry.wednesday.hours +
      entry.thursday.hours +
      entry.friday.hours
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

    // First save any pending changes
    if (hasUnsavedChanges) {
      await saveTimesheet();
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
      alert("Please add at least one time entry");
      return;
    }

    if (!hasValidEntries) {
      alert(
        "Please fill in all required fields (Project, Task, and at least some hours)"
      );
      return;
    }

    try {
      await submitMutation.mutateAsync({
        organizationId: currentOrganization.id,
        submissionId: timesheetData.submission.id,
      });
      alert("Timesheet submitted successfully!");
    } catch (error: any) {
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
      refetchSubmissions();
    } catch (error: any) {
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
      refetchSubmissions();
    } catch (error: any) {
      setError(error.message || "Failed to reject submission");
    }
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
            hours: updatedEntry.monday_hours,
            notes: updatedEntry.monday_notes || "",
          },
          tuesday: {
            hours: updatedEntry.tuesday_hours,
            notes: updatedEntry.tuesday_notes || "",
          },
          wednesday: {
            hours: updatedEntry.wednesday_hours,
            notes: updatedEntry.wednesday_notes || "",
          },
          thursday: {
            hours: updatedEntry.thursday_hours,
            notes: updatedEntry.thursday_notes || "",
          },
          friday: {
            hours: updatedEntry.friday_hours,
            notes: updatedEntry.friday_notes || "",
          },
          total:
            updatedEntry.monday_hours +
            updatedEntry.tuesday_hours +
            updatedEntry.wednesday_hours +
            updatedEntry.thursday_hours +
            updatedEntry.friday_hours,
          isNew: false,
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
      monday: { hours: entry.monday_hours, notes: entry.monday_notes || "" },
      tuesday: {
        hours: entry.tuesday_hours,
        notes: entry.tuesday_notes || "",
      },
      wednesday: {
        hours: entry.wednesday_hours,
        notes: entry.wednesday_notes || "",
      },
      thursday: {
        hours: entry.thursday_hours,
        notes: entry.thursday_notes || "",
      },
      friday: { hours: entry.friday_hours, notes: entry.friday_notes || "" },
      total:
        entry.monday_hours +
        entry.tuesday_hours +
        entry.wednesday_hours +
        entry.thursday_hours +
        entry.friday_hours,
      isNew: true,
    };
  });

  const allTimeEntries = [...databaseTimeEntries, ...newTimeEntries];

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

  const weekDays = getWeekDays(selectedWeek);
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-timesheet"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Timesheet
            </button>
            <button
              onClick={() =>
                checkUnsavedChanges("switching tabs", () =>
                  setActiveTab("approve-timesheets")
                )
              }
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "approve-timesheets"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Approve Timesheets
            </button>
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
            frontendEntries={frontendEntries}
          />
        ) : (
          <ApproveTimesheetsView
            submissions={submissions}
            onApprove={approveSubmission}
            onReject={rejectSubmission}
            onShowDetails={setShowDetailsModal}
            loading={submissionsLoading || resolveMutation.isPending}
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
          onConfirm={() => deleteTimeEntry(showDeleteModal.entryId)}
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
  frontendEntries,
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
  frontendEntries: TimesheetEntry[];
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
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Total Hours: <span className="font-semibold">{totalHours}</span>
            </div>
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
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Time Entries</h3>
            <Button size="sm" onClick={onAddEntry} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
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
                          disabled={loading}
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
                          disabled={loading}
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
                              disabled={loading}
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
                              disabled={loading}
                            >
                              <StickyNote className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                        disabled={loading}
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
              variant="destructive"
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
  onApprove,
  onReject,
  onShowDetails,
  loading,
}: {
  submissions: TimesheetSubmission[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onShowDetails: (submission: TimesheetSubmission) => void;
  loading: boolean;
}) {
  return (
    <div>
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
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
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
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        submission.status === "approved"
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
                            onClick={() => onApprove(submission.id)}
                            disabled={loading}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(submission.id)}
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

// Details Modal Component
function DetailsModal({
  submission,
  onClose,
}: {
  submission: TimesheetSubmission;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Timesheet Details - {submission.userName}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
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
                <span className="font-medium">Status:</span> {submission.status}
              </div>
              {submission.submittedAt && (
                <div>
                  <span className="font-medium">Submitted:</span>{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Time Entries</h4>
              <p className="text-sm text-gray-600">
                Detailed time entries would be displayed here...
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end mt-6">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
