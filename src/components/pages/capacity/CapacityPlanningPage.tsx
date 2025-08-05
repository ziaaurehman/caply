"use client"

import React, { useState, useEffect } from 'react';
import { ChevronDown, Settings, Users, Plus, Filter, Download, Calendar, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { projectAPI } from "@/utils/api/project"
import { capacityAPI, CapacityOverview, ResourceAllocation } from '@/utils/api/capacity';
import { useOrganizationStore } from '@/lib/stores/organizationStore';
import CapacitySettingsModal from './CapacitySettingsModal';
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  });
  const [viewMode, setViewMode] = useState<'overview' | 'weekly' | 'monthly'>('overview');

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
  }, [selectedProject, selectedDateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCapacityData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch capacity overview
      const overviewParams: any = {
        start_date: selectedDateRange.startDate,
        end_date: selectedDateRange.endDate
      };

      // Only add project_id if a specific project is selected
      if (selectedProject !== 'all') {
        overviewParams.project_id = selectedProject;
      }

      const overviewResponse = await capacityAPI.getOverview(currentOrganization!.id, overviewParams);

      setCapacityOverview(overviewResponse.capacityOverview);
      setSummary(overviewResponse.summary);

      // Fetch allocations
      const allocationsParams: any = {
        start_date: selectedDateRange.startDate,
        end_date: selectedDateRange.endDate
      };

      if (selectedProject !== 'all') {
        allocationsParams.project_id = selectedProject;
      }

      const allocationsResponse = await capacityAPI.getAllocations(currentOrganization!.id, allocationsParams);
      setAllocations(allocationsResponse.allocations);
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
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Capacity Planning</h1>
              <p className="text-gray-600 mt-2">Monitor team capacity utilization and resource allocation across projects</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="overview">Overview</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Project:</label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-8 min-w-[200px]"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.code && `(${project.code})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDateRange.startDate}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={selectedDateRange.endDate}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <button 
                onClick={() => setShowAddResourceModal(true)}
                disabled={selectedProject === 'all'}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </button>
              <button 
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
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
            />
          )}
        </div>
      </div>

      {/* Capacity Settings Modal */}
      <CapacitySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        projectId={selectedProject === 'all' ? undefined : selectedProject}
      />

      {/* Add Resource Modal */}
      <AddResourceModal
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
        onResourceAdded={fetchCapacityData}
        projectId={selectedProject === 'all' ? '' : selectedProject}
      />
    </div>
  );
}
