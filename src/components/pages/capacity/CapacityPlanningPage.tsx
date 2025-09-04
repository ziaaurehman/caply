"use client"

import React, { useState, useEffect } from 'react';
import { ChevronDown, Settings, Users, Plus, Download, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { projectAPI } from "@/utils/api/project"
import { capacityAPI, CapacityOverview, ResourceAllocation } from '@/utils/api/capacity';
import { useOrganizationStore } from '@/lib/stores/organizationStore';

import WeeklyCapacityTable from './WeeklyCapacityTable';
import CapacitySkeleton from "./CapacitySkeleton"
import AddResourceModal from './AddResourceModal';

// Use the Project interface from the project API
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
    userOrganizations 
  } = useOrganizationStore();
  
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [capacityOverview, setCapacityOverview] = useState<CapacityOverview[]>([]);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    overallocatedMembers: 0,
    optimalMembers: 0,
    underutilizedMembers: 0,
    totalCapacity: 0,
    totalAllocated: 0,
    totalAvailable: 0
  });
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  });
  const [viewMode, setViewMode] = useState<'overview' | 'weekly' | 'monthly'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filters, setFilters] = useState<{ userIds: string[]; projectIds: string[]; onlyOverallocated: boolean; onlyActive: boolean }>({ userIds: [], projectIds: [], onlyOverallocated: false, onlyActive: true });
  const [showWeekModal, setShowWeekModal] = useState<null | { userId: string; week: any; member: any }>(null);

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Fetch projects on component mount
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchProjects();
    }
  }, [currentOrganization?.id]);

  // Update date range when month/year changes
  useEffect(() => {
    const newDateRange = calculateDateRange(selectedMonth, selectedYear, viewMode);
    setSelectedDateRange(newDateRange);
  }, [selectedMonth, selectedYear, viewMode]);

  // Calculate date range based on view mode and month/year selection
  const calculateDateRange = (month: number, year: number, mode: 'overview' | 'weekly' | 'monthly') => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(today.getDate() - daysToSubtract);

    if (mode === 'weekly') {
      // For weekly view, show only the current week (7 days)
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      return {
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
      };
    } else {
      // For overview and monthly, show 5 weeks from current week
      const fiveWeeksEnd = new Date(currentWeekStart);
      fiveWeeksEnd.setDate(currentWeekStart.getDate() + (5 * 7) - 1); // 5 weeks minus 1 day
      
      return {
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: fiveWeeksEnd.toISOString().split('T')[0]
      };
    }
  };

  // Handle month change
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  // Handle year change
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'overview' | 'weekly' | 'monthly') => {
    setViewMode(mode);
  };

  // Fetch projects from API
  const fetchProjects = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const response = await projectAPI.getProjects(currentOrganization.id, { capacity_planning_enabled: true });
      const fetchedProjects = response.projects;
      setProjects(fetchedProjects);
      
      // Auto-select first project if any projects exist and no project is selected
      if (fetchedProjects.length > 0 && selectedProject === 'all') {
        // Keep 'all' selected by default to show overview of all projects
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchCapacityData();
    }
  }, [selectedProject, selectedDateRange, filters, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCapacityData = async () => {
    console.log('fetchCapacityData called');
    setLoading(true);
    setError(null);

    try {
      // Fetch allocations first
      const allocationsParams: any = {
        start_date: selectedDateRange.startDate,
        end_date: selectedDateRange.endDate
      };

      if (selectedProject !== 'all') {
        allocationsParams.project_id = selectedProject;
      }

      if (filters.projectIds.length > 0) allocationsParams.filter_project_ids = filters.projectIds;
      
      const allocationsResponse = await capacityAPI.getAllocations(currentOrganization!.id, allocationsParams);
      setAllocations(allocationsResponse.allocations);

      // Fetch capacity overview for member info
      const overviewParams: any = {
        start_date: selectedDateRange.startDate,
        end_date: selectedDateRange.endDate
      };

      if (selectedProject !== 'all') {
        overviewParams.project_id = selectedProject;
      }

      if (filters.projectIds.length > 0) overviewParams.filter_project_ids = filters.projectIds;
      if (filters.userIds.length > 0) overviewParams.filter_user_ids = filters.userIds;
      overviewParams.only_overallocated = filters.onlyOverallocated;
      overviewParams.only_active = filters.onlyActive;

      const overviewResponse = await capacityAPI.getOverview(currentOrganization!.id, overviewParams);
      setCapacityOverview(overviewResponse.capacityOverview);

      // Calculate summary from allocations data
      const memberAllocations = new Map<string, { capacity: number; allocated: number; user: any; role: string }>();
      
      // Group allocations by member
      allocationsResponse.allocations.forEach(allocation => {
        const orgMemberId = (allocation as any)?.organization_member_id || 
                           (allocation as any)?.resource_allocations?.organization_member_id;
        
        if (orgMemberId) {
          if (!memberAllocations.has(orgMemberId)) {
            // Find member info from overview
            const memberInfo = overviewResponse.capacityOverview.find(o => 
              (o as any)?.member?.organization_member_id === orgMemberId
            );
            
            memberAllocations.set(orgMemberId, {
              capacity: memberInfo?.capacity || 40,
              allocated: 0,
              user: memberInfo?.member?.user,
              role: memberInfo?.member?.role || ''
            });
          }
          
          const member = memberAllocations.get(orgMemberId)!;
          member.allocated += Number(allocation.hours_per_week || 0);
        }
      });

      // Calculate summary
      const members = Array.from(memberAllocations.values());
      const totalCapacity = members.reduce((sum, m) => sum + m.capacity, 0);
      const totalAllocated = members.reduce((sum, m) => sum + m.allocated, 0);
      const totalAvailable = Math.max(0, totalCapacity - totalAllocated);
      
      const overallocatedMembers = members.filter(m => m.allocated > m.capacity).length;
      const optimalMembers = members.filter(m => m.allocated >= m.capacity * 0.6 && m.allocated <= m.capacity).length;
      const underutilizedMembers = members.filter(m => m.allocated < m.capacity * 0.6).length;

      setSummary({
        totalMembers: members.length,
        overallocatedMembers,
        optimalMembers,
        underutilizedMembers,
        totalCapacity,
        totalAllocated,
        totalAvailable
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch capacity data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overallocated':
        return 'bg-red-100 text-red-800';
      case 'optimal':
        return 'bg-green-100 text-green-800';
      case 'nearOptimal':
        return 'bg-blue-100 text-blue-800';
      case 'underutilized':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overallocated':
        return 'Overallocated';
      case 'optimal':
        return 'Optimal';
      case 'nearOptimal':
        return 'Near Optimal';
      case 'underutilized':
        return 'Underutilized';
      default:
        return 'Unknown';
    }
  };

  // Show loading while organization is loading or not loaded
  if (organizationLoading || !currentOrganization?.id) {
    return <CapacitySkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className=" mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Capacity Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchCapacityData}
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

  if (loading) {
    return <CapacitySkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className=" mx-auto">
        {/* Header Section */}
          <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Capacity Planning</h1>
              <p className="text-gray-600 mt-2">Monitor team capacity utilization and resource allocation across projects</p>
              {/* Date Range Display */}
              <div className="mt-2 text-sm text-gray-500">
                Viewing: {new Date(selectedDateRange.startDate).toLocaleDateString()} - {new Date(selectedDateRange.endDate).toLocaleDateString()}
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
                    <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <select
                  value={viewMode}
                  onChange={(e) => handleViewModeChange(e.target.value as 'overview' | 'weekly' | 'monthly')}
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
                    const headers = ['User', 'Department/Role', 'Capacity', 'Allocated', 'Available'];
                    const rows = capacityOverview.map(m => [m.member.user.full_name, m.member.role || '', m.capacity, m.totalAllocatedHours, m.availableHours]);
                    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'capacity_export.csv';
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
                {selectedProject !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    - {projects.find(p => p.id === selectedProject)?.name}
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total Capacity:</span>
                <span className="text-sm font-medium text-gray-900">{summary.totalCapacity}h/week</span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">Allocated:</span>
                <span className="text-sm font-medium text-gray-900">{summary.totalAllocated}h/week</span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">Available:</span>
                <span className="text-sm font-medium text-green-600">{summary.totalAvailable}h/week</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">Loading capacity data...</span>
            </div>
          ) : capacityOverview.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedProject === 'all' ? 'No Projects Found' : 'No Team Members Found'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {selectedProject === 'all' 
                  ? 'No projects with capacity planning enabled found. Enable capacity planning in project settings to get started.'
                  : 'No team members found for this project. Add team members and configure their capacity to get started.'
                }
              </p>
              {selectedProject !== 'all' && (
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
              onWeekCellClick={({ userId, week, member }) => setShowWeekModal({ userId, week, member })}
              onRefresh={fetchCapacityData}
              onProjectClick={(projectId) => {
                // Navigate to Kanban tab for the project
                window.location.href = `/dashboard/kanban?project=${projectId}`;
              }}
              onAddResource={() => setShowAddResourceModal(true)}
              viewMode={viewMode}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </div>
      </div>

      {/* Settings modal removed per new UI spec */}

      {/* Add Resource Modal */}
      <AddResourceModal
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
        onResourceAdded={fetchCapacityData}
      />

      {showWeekModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Week Breakdown</h3>
              <button onClick={() => setShowWeekModal(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{showWeekModal.member.user.full_name} • {new Date(showWeekModal.week.startDate).toLocaleDateString()} - {new Date(showWeekModal.week.endDate).toLocaleDateString()}</p>
          
          </div>
        </div>
      )}
    </div>
  );
}
