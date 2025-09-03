"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Save,
  Send,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  FileText,
  User,
  Calendar,
  AlertTriangle,
  Eye,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useOrganizationStore } from "@/lib/stores/organizationStore";

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

  // State
  const [activeTab, setActiveTab] = useState<
    "my-timesheet" | "approve-timesheets"
  >("my-timesheet");
  const [selectedWeek, setSelectedWeek] = useState<string>(
    getCurrentWeekStart()
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{
    entryId: string;
    day: string;
    notes: string;
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] =
    useState<TimesheetSubmission | null>(null);

  // Initialize
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchProjects();
      fetchTimeEntries();
      if (activeTab === "approve-timesheets") {
        fetchSubmissions();
      }
    }
  }, [currentOrganization?.id, selectedWeek, activeTab]);

  // Helper functions
  function getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0];
  }

  function getWeekDays(weekStart: string): string[] {
    const start = new Date(weekStart);
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day.toISOString().split("T")[0]);
    }
    return days;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function getWeekRange(weekStart: string): string {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(start.getDate() + 4);
    return `${formatDate(weekStart)} - ${formatDate(end.toISOString().split("T")[0])}`;
  }

  // API functions (dummy data for now)
  const fetchProjects = async () => {
    // Dummy projects - in real app, fetch from capacity planning API
    const dummyProjects: Project[] = [
      { id: "1", name: "Website Redesign", code: "WR", isPlanned: true },
      { id: "2", name: "Mobile App Development", code: "MAD", isPlanned: true },
      { id: "3", name: "Database Migration", code: "DM", isPlanned: true },
      { id: "4", name: "Client Support", code: "CS", isPlanned: false },
      { id: "5", name: "Training", code: "TR", isPlanned: false },
    ];
    setProjects(dummyProjects);
  };

  const fetchTimeEntries = async () => {
    // Dummy time entries
    const dummyEntries: TimeEntry[] = [
      {
        id: "1",
        projectId: "1",
        projectName: "Website Redesign",
        taskDescription: "Frontend development",
        isPlanned: true,
        monday: { hours: 8, notes: "Implemented responsive design" },
        tuesday: { hours: 6, notes: "Bug fixes and testing" },
        wednesday: { hours: 7, notes: "Performance optimization" },
        thursday: { hours: 8, notes: "Code review and documentation" },
        friday: { hours: 5, notes: "Final testing and deployment" },
        total: 34,
      },
      {
        id: "2",
        projectId: "2",
        projectName: "Mobile App Development",
        taskDescription: "Backend API development",
        isPlanned: true,
        monday: { hours: 4, notes: "API design and planning" },
        tuesday: { hours: 8, notes: "Core API development" },
        wednesday: { hours: 6, notes: "Authentication system" },
        thursday: { hours: 7, notes: "Database integration" },
        friday: { hours: 3, notes: "Testing and bug fixes" },
        total: 28,
      },
    ];
    setTimeEntries(dummyEntries);
  };

  const fetchSubmissions = async () => {
    // Dummy submissions for approval
    const dummySubmissions: TimesheetSubmission[] = [
      {
        id: "1",
        userId: "user1",
        userName: "John Doe",
        userEmail: "john@example.com",
        weekStart: "2024-01-15",
        weekEnd: "2024-01-19",
        totalHours: 40,
        status: "submitted",
        entries: [],
        submittedAt: "2024-01-19T17:00:00Z",
      },
      {
        id: "2",
        userId: "user2",
        userName: "Jane Smith",
        userEmail: "jane@example.com",
        weekStart: "2024-01-15",
        weekEnd: "2024-01-19",
        totalHours: 35,
        status: "approved",
        entries: [],
        submittedAt: "2024-01-19T16:30:00Z",
        approvedAt: "2024-01-20T09:00:00Z",
        approvedBy: "Manager Name",
      },
    ];
    setSubmissions(dummySubmissions);
  };

  // Event handlers
  const addTimeEntry = () => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      projectId: "",
      projectName: "",
      taskDescription: "",
      isPlanned: false,
      monday: { hours: 0, notes: "" },
      tuesday: { hours: 0, notes: "" },
      wednesday: { hours: 0, notes: "" },
      thursday: { hours: 0, notes: "" },
      friday: { hours: 0, notes: "" },
      total: 0,
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const updateTimeEntry = (entryId: string, field: string, value: any) => {
    setTimeEntries((entries) =>
      entries.map((entry) => {
        if (entry.id === entryId) {
          if (field.includes(".")) {
            const [day, prop] = field.split(".");
            return {
              ...entry,
              [day]: { ...entry[day as keyof typeof entry], [prop]: value },
            };
          }
          return { ...entry, [field]: value };
        }
        return entry;
      })
    );
  };

  const deleteTimeEntry = (entryId: string) => {
    setTimeEntries((entries) =>
      entries.filter((entry) => entry.id !== entryId)
    );
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
    setLoading(true);
    try {
      // TODO: Save to backend as draft
      console.log("Saving timesheet as draft...");
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Timesheet saved as draft!");
    } catch (error) {
      setError("Failed to save timesheet");
    } finally {
      setLoading(false);
    }
  };

  const submitTimesheet = async () => {
    setLoading(true);
    try {
      // Validate entries
      const hasEntries = timeEntries.length > 0;
      const hasValidEntries = timeEntries.every(
        (entry) =>
          entry.projectId && entry.taskDescription && calculateTotal(entry) > 0
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

      // TODO: Submit to backend
      console.log("Submitting timesheet...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Timesheet submitted successfully!");
    } catch (error) {
      setError("Failed to submit timesheet");
    } finally {
      setLoading(false);
    }
  };

  const approveSubmission = async (submissionId: string) => {
    setLoading(true);
    try {
      // TODO: Approve submission
      console.log("Approving submission...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                status: "approved" as const,
                approvedAt: new Date().toISOString(),
              }
            : sub
        )
      );
    } catch (error) {
      setError("Failed to approve submission");
    } finally {
      setLoading(false);
    }
  };

  const rejectSubmission = async (submissionId: string) => {
    setLoading(true);
    try {
      // TODO: Reject submission
      console.log("Rejecting submission...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? { ...sub, status: "rejected" as const }
            : sub
        )
      );
    } catch (error) {
      setError("Failed to reject submission");
    } finally {
      setLoading(false);
    }
  };

  const weekDays = getWeekDays(selectedWeek);
  const totalHours = timeEntries.reduce(
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
              onClick={() => setActiveTab("my-timesheet")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-timesheet"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Timesheet
            </button>
            <button
              onClick={() => setActiveTab("approve-timesheets")}
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
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            timeEntries={timeEntries}
            projects={projects}
            weekDays={weekDays}
            totalHours={totalHours}
            onAddEntry={addTimeEntry}
            onUpdateEntry={updateTimeEntry}
            onDeleteEntry={deleteTimeEntry}
            onSave={saveTimesheet}
            onSubmit={submitTimesheet}
            onShowNoteModal={setShowNoteModal}
            loading={loading}
          />
        ) : (
          <ApproveTimesheetsView
            submissions={submissions}
            onApprove={approveSubmission}
            onReject={rejectSubmission}
            onShowDetails={setShowDetailsModal}
            loading={loading}
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
}) {
  return (
    <div>
      {/* Week Selector and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Week:</span>
            </div>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-600">
              {new Date(selectedWeek).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(
                new Date(selectedWeek).getTime() + 4 * 24 * 60 * 60 * 1000
              ).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Total Hours: <span className="font-semibold">{totalHours}</span>
            </div>
            <Button variant="outline" onClick={onSave} disabled={loading}>
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
            <Button size="sm" onClick={onAddEntry}>
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
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <select
                        value={entry.projectId}
                        onChange={(e) => {
                          const project = projects.find(
                            (p) => p.id === e.target.value
                          );
                          onUpdateEntry(entry.id, "projectId", e.target.value);
                          onUpdateEntry(
                            entry.id,
                            "projectName",
                            project?.name || ""
                          );
                          onUpdateEntry(
                            entry.id,
                            "isPlanned",
                            project?.isPlanned || false
                          );
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Select Project</option>
                        {projects
                          .filter((p) => p.isPlanned)
                          .map((project) => (
                            <option
                              key={project.id}
                              value={project.id}
                              className="font-medium"
                            >
                              {project.name}{" "}
                              {project.code && `(${project.code})`}
                            </option>
                          ))}
                        <option disabled>──────────</option>
                        {projects
                          .filter((p) => !p.isPlanned)
                          .map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}{" "}
                              {project.code && `(${project.code})`}
                            </option>
                          ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Task description (required)"
                        value={entry.taskDescription}
                        onChange={(e) =>
                          onUpdateEntry(
                            entry.id,
                            "taskDescription",
                            e.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  </td>
                  {["monday", "tuesday", "wednesday", "thursday", "friday"].map(
                    (day) => (
                      <td key={day} className="px-6 py-4">
                        <div className="space-y-2">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entry[day as keyof TimeEntry].hours}
                            onChange={(e) =>
                              onUpdateEntry(
                                entry.id,
                                `${day}.hours`,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-center"
                          />
                          <button
                            onClick={() =>
                              onShowNoteModal({
                                entryId: entry.id,
                                day,
                                notes: entry[day as keyof TimeEntry].notes,
                              })
                            }
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-gray-600"
                            title="Add note"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )
                  )}
                  <td className="px-6 py-4 text-center">
                    <span className="font-medium text-gray-900">
                      {entry.monday.hours +
                        entry.tuesday.hours +
                        entry.wednesday.hours +
                        entry.thursday.hours +
                        entry.friday.hours}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteEntry(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
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
