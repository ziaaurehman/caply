"use client";
import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Settings,
  Users,
  Plus,
  Download,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useCapacityData, useCapacityProjects } from "@/lib/hooks/useCapacity";
import { useOrganizationStore } from "@/lib/stores/organizationStore";

import WeeklyCapacityTable from "./WeeklyCapacityTable";
import CapacitySkeleton from "./CapacitySkeleton";
import AddResourceModal from "./AddResourceModal";

interface Project {
  id: string;
  name: string;
  code?: string;
  capacity_planning_enabled?: boolean;
  project_members?: Array<{
    id: string;
    organization_member_id: string;
    role: string;
    joined_at: string;
    organization_members: {
      id: string;
      user_id: string;
      users: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
      };
    };
  }>;
}

export default function CapacityPlanningPage() {
  const {
    currentOrganization,
    loading: organizationLoading,
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [viewMode, setViewMode] = useState<"overview" | "weekly" | "monthly">(
    "overview"
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [filters, setFilters] = useState<{
    userIds: string[];
    projectIds: string[];
    onlyOverallocated: boolean;
    onlyActive: boolean;
  }>({
    userIds: [],
    projectIds: [],
    onlyOverallocated: false,
    onlyActive: true,
  });
  const [showWeekModal, setShowWeekModal] = useState<null | {
    userId: string;
    week: any;
    member: any;
  }>(null);

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Calculate date range based on view mode and month/year selection
  const calculateDateRange = (
    month: number,
    year: number,
    mode: "overview" | "weekly" | "monthly"
  ) => {
    const startDate = new Date(year, month, 1);
    let endDate: Date;

    if (mode === "monthly") {
      endDate = new Date(year, month + 1, 0);
    } else if (mode === "weekly") {
      endDate = new Date(year, month, 1);
      endDate.setDate(endDate.getDate() + 28);
    } else {
      endDate = new Date(year, month, 1);
      endDate.setDate(endDate.getDate() + 30);
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const selectedDateRange = calculateDateRange(
    selectedMonth,
    selectedYear,
    viewMode
  );

  const handleMonthChange = (month: number) => setSelectedMonth(month);
  const handleYearChange = (year: number) => setSelectedYear(year);
  const handleViewModeChange = (mode: "overview" | "weekly" | "monthly") =>
    setViewMode(mode);

  // React Query: projects
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useCapacityProjects(currentOrganization?.id || "");

  // React Query: allocations + overview (combined)
  const params = {
    project_id: selectedProject !== "all" ? selectedProject : undefined,
    start_date: selectedDateRange.startDate,
    end_date: selectedDateRange.endDate,
    filter_project_ids: filters.projectIds.length
      ? filters.projectIds
      : undefined,
    filter_user_ids: filters.userIds.length ? filters.userIds : undefined,
    only_overallocated: filters.onlyOverallocated,
    only_active: filters.onlyActive,
  };

  const {
    allocations,
    capacityOverview,
    summary,
    isLoading: capacityLoading,
    isError: capacityError,
    error: capacityErrorObj,
    refetch: refetchCapacity,
  } = useCapacityData(currentOrganization?.id || "", params);

  // Show loading while organization context is loading
  if (organizationLoading || !currentOrganization?.id) {
    return <CapacitySkeleton />;
  }

  // Error UI (capacity)
  if (capacityError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Capacity Data
              </h3>
              <p className="text-red-600 mb-4">
                {capacityErrorObj instanceof Error
                  ? capacityErrorObj.message
                  : "Failed to fetch capacity data"}
              </p>
              <button
                onClick={() => refetchCapacity()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state combining both
  const isLoading = projectsLoading || capacityLoading;

  if (isLoading) {
    return <CapacitySkeleton />;
  }

  const projects: Project[] = projectsData?.projects || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between ga  p-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Capacity Planning
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor team capacity utilization and resource allocation across
                projects
              </p>
              {/* Date Range Display */}
              <div className="mt-2 text-sm text-gray-500">
                Viewing:{" "}
                {new Date(selectedDateRange.startDate).toLocaleDateString()} -{" "}
                {new Date(selectedDateRange.endDate).toLocaleDateString()}
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                  {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i, 1).toLocaleString(undefined, {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <select
                  value={viewMode}
                  onChange={(e) =>
                    handleViewModeChange(
                      e.target.value as "overview" | "weekly" | "monthly"
                    )
                  }
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="overview">Overview</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <Button
                onClick={() => setShowAddResourceModal(true)}
                leftIcon={<Users className="h-4 w-4" />}
                className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                size="sm"
              >
                Add Resource
              </Button>
              <Button
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                size="sm"
                onClick={() => {
                  const headers = [
                    "User",
                    "Department/Role",
                    "Capacity",
                    "Allocated",
                    "Available",
                  ];
                  const rows = (capacityOverview || []).map((m) => [
                    m.member.user.full_name,
                    m.member.role || "",
                    m.capacity,
                    m.totalAllocatedHours,
                    m.availableHours,
                  ]);
                  const csv = [
                    headers.join(","),
                    ...rows.map((r) => r.join(",")),
                  ].join("\n");
                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "capacity_export.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8 z-10">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Capacity Overview
                {selectedProject !== "all" && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    - {projects.find((p) => p.id === selectedProject)?.name}
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total Capacity:</span>
                <span className="text-sm font-medium text-gray-900">
                  {summary?.totalCapacity ?? 0}h/week
                </span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">Allocated:</span>
                <span className="text-sm font-medium text-gray-900">
                  {summary?.totalAllocated ?? 0}h/week
                </span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">Available:</span>
                <span className="text-sm font-medium text-green-600">
                  {summary?.totalAvailable ?? 0}h/week
                </span>
              </div>
            </div>
          </div>

          {capacityOverview.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedProject === "all"
                  ? "No Projects Found"
                  : "No Team Members Found"}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {selectedProject === "all"
                  ? "No projects with capacity planning enabled found. Enable capacity planning in project settings to get started."
                  : "No team members found for this project. Add team members and configure their capacity to get started."}
              </p>
              {selectedProject !== "all" && (
                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </button>
              )}
            </div>
          ) : (
            <WeeklyCapacityTable
              capacityOverview={capacityOverview}
              allocations={allocations}
              projects={projects}
              organizationId={currentOrganization!.id}
              onWeekCellClick={({ userId, week, member }) =>
                setShowWeekModal({ userId, week, member })
              }
              onRefresh={() => {
                refetchCapacity();
                refetchProjects();
              }}
              onProjectClick={(projectId) => {
                window.location.href = `/kanban?projectId=${projectId}`;
              }}
              onAddResource={() => setShowAddResourceModal(true)}
              viewMode={viewMode}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </div>
      </div>

      {/* Add Resource Modal */}
      <AddResourceModal
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
        onResourceAdded={() => {
          refetchCapacity();
          refetchProjects();
        }}
      />

      {showWeekModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Week Breakdown</h3>
              <button
                onClick={() => setShowWeekModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {showWeekModal.member.user.full_name} •{" "}
              {new Date(showWeekModal.week.startDate).toLocaleDateString()} -{" "}
              {new Date(showWeekModal.week.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
