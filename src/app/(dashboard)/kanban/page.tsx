"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import KanbanBoard from "@/components/pages/kanban/kanbanPage";
import { projectAPI } from "@/utils/api/project";
import KanbanSkeleton from "@/components/pages/kanban/KanbanSkeleton";
import { useOrganizationStore } from "@/lib/stores/organizationStore";

interface Project {
  id: string;
  name: string;
  kanban_enabled?: boolean;
}

export default function Kanban() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Load persisted project selection on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem("kanban-selected-project");
    if (savedProjectId) {
      setSelectedProjectId(savedProjectId);
    }
  }, []);

  const {
    currentOrganization,
    loading: organizationLoading,
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  const loadProjects = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await projectAPI.getProjects(currentOrganization.id);
      const kanbanProjects = response.projects.filter((p) => p.kanban_enabled);
      setProjects(kanbanProjects);
      setFilteredProjects(kanbanProjects);

      // Auto-select first project if available and no saved selection
      if (kanbanProjects.length > 0 && !selectedProjectId) {
        const savedProjectId = localStorage.getItem("kanban-selected-project");
        if (
          savedProjectId &&
          kanbanProjects.find((p) => p.id === savedProjectId)
        ) {
          // Saved project exists in current list
          setSelectedProjectId(savedProjectId);
        } else {
          // Select first project and save it
          setSelectedProjectId(kanbanProjects[0].id);
          localStorage.setItem("kanban-selected-project", kanbanProjects[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, selectedProjectId]);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadProjects();
    }
  }, [loadProjects, currentOrganization?.id]);

  // Handle project search
  useEffect(() => {
    if (!projectSearch.trim()) {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter((project) =>
        project.name.toLowerCase().includes(projectSearch.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projectSearch, projects]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("project-dropdown");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProjectSelect = (projectId: string, projectName: string) => {
    if (selectedProjectId !== projectId) {
      setSelectedProjectId(projectId);
      localStorage.setItem("kanban-selected-project", projectId);
    }
    setProjectSearch(projectName);
    setIsProjectDropdownOpen(false);
    // Persist selection to localStorage
  };

  const clearProjectSearch = () => {
    setProjectSearch("");
    // setSelectedProjectId(null)
    setIsProjectDropdownOpen(true);
    // Remove from localStorage
    // localStorage.removeItem('kanban-selected-project')
  };

  const getSelectedProjectName = () => {
    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    return selectedProject?.name || "";
  };

  // Show loading while organization is loading or not loaded
  if (organizationLoading || !currentOrganization?.id || isLoading) {
    return (
      <div className="min-h-screen  ">
        {/* make skeleton bar  like navbar */}
        <div className="w-full h-16 bg-gray-200 animate-pulse"></div>
        <div className="w-full h-16 bg-gray-200 animate-pulse"></div>
        <KanbanSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Projects
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Kanban Projects
            </h3>
            <p className="text-gray-600 mb-4">
              No projects with Kanban enabled were found. Create a project with
              Kanban enabled to get started.
            </p>
            <a
              href="/projects"
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 inline-block"
            >
              Go to Projects
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Project Selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="w-full">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Kanban Board
            </h1>
            <div className="relative" id="project-dropdown">
              <div
                className="flex items-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer min-w-[250px]"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              >
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  value={
                    selectedProjectId ? getSelectedProjectName() : projectSearch
                  }
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setIsProjectDropdownOpen(true);
                  }}
                  placeholder="Search projects..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectedProjectId) {
                      setIsProjectDropdownOpen(true);
                    }
                  }}
                />
                {selectedProjectId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProjectSearch();
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-gray-700 ml-2 transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>

              {/* Dropdown Menu */}
              {isProjectDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() =>
                          handleProjectSelect(project.id, project.name)
                        }
                        className={`${
                          selectedProjectId === project.id
                            ? "bg-orange-50 text-orange-900"
                            : "text-gray-900"
                        } group relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-orange-50 hover:text-orange-900 w-full text-left`}
                      >
                        <span className="block truncate font-normal">
                          {project.name}
                        </span>
                        {selectedProjectId === project.id && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="py-2 px-3 text-gray-500 text-sm">
                      {projectSearch
                        ? "No projects found"
                        : "No Kanban projects available"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {selectedProjectId && <KanbanBoard projectId={selectedProjectId} />}
    </div>
  );
}
