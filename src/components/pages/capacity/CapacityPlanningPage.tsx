"use client"

import React, { useState, useEffect } from 'react';
import { ChevronDown, Settings, Users, Plus } from 'lucide-react';
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
}

export default function CapacityPlanningPage() {
  const { 
    currentOrganization, 
    loading: organizationLoading, 
    fetchUserOrganizations,
    userOrganizations 
  } = useOrganizationStore();
  
  const [selectedProject, setSelectedProject] = useState<string>('');
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
      
      // Auto-select first project if any projects exist
      if (fetchedProjects.length > 0) {
        setSelectedProject(fetchedProjects[0].id);
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
  }, [selectedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCapacityData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch capacity overview
      const overviewResponse = await capacityAPI.getOverview(currentOrganization!.id, {
        project_id: selectedProject
      });

      setCapacityOverview(overviewResponse.capacityOverview);
      setSummary(overviewResponse.summary);

      // Fetch allocations
      const allocationsResponse = await capacityAPI.getAllocations(currentOrganization!.id, {
        project_id: selectedProject
      });

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
      <div className="min-h-screen bg-gray-50 p-2">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchCapacityData}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Capacity Planning</h1>
            <p className="text-sm text-gray-500">Monitor team capacity utilization and resource allocation across projects</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 appearance-none pr-8"
              >
                {projects.length === 0 && (
                  <option value="">No projects available</option>
                )}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button 
              onClick={() => setShowAddResourceModal(true)}
              disabled={!selectedProject}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </button>
            <button 
              onClick={() => setShowSettingsModal(true)}
              disabled={!selectedProject}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">Loading capacity data...</span>
            </div>
          ) : !selectedProject ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
              <p className="text-gray-500 mb-4">Please select a project to view capacity planning.</p>
            </div>
          ) : capacityOverview.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Capacity Found</h3>
              <p className="text-gray-500 mb-4">No capacity data found for this project. Add team members to get started.</p>
            </div>
          ) : (
            <WeeklyCapacityTable 
              capacityOverview={capacityOverview}
              allocations={allocations}
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
        projectId={selectedProject}
      />
    </div>
  );
}
