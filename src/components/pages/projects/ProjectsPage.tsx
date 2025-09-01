"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Filter, ChevronDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { projectAPI, type Project } from '@/utils/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { createDeleteConfirmation } from '@/utils/confirmations';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import ProjectModal from './ProjectModal';
import ProjectDetailsDialog from './ProjectDetailsDialog';
import ProjectsSkeleton from "./ProjectsSkeleton";
import { useOrganizationStore } from '@/lib/stores/organizationStore';
import { Input } from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // Project details dialog state
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { confirmation, confirm, handleConfirm, handleClose } = useConfirmation();
  const { 
    currentOrganization, 
    loading: organizationLoading, 
    fetchUserOrganizations,
    userOrganizations 
  } = useOrganizationStore();
  
  const fetchProjects = async (isInitialLoad = false) => {
    if (!currentOrganization?.id) return;
    
    // Use different loading states based on operation type
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsSearching(true);
    }
    
    setError(null);
    try {
      const data = await projectAPI.getProjects(currentOrganization.id, {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      
      setProjects(data.projects || []);
      
      // Update pagination metadata
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      const errorMessage = err.message || 'Failed to load projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsSearching(false);
      }
    }
  };

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Handle clicking outside the status dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('status-dropdown')
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, []);

  useEffect(() => {
    if (currentOrganization?.id) {
      // Initial load or pagination change
      const isInitialLoad = currentPage === 1 && searchTerm === ''
      fetchProjects(isInitialLoad)
    }
  }, [currentOrganization?.id, currentPage, statusFilter])

  // Optimized search with minimal delay
  useEffect(() => {
    // For empty search, load immediately
    if (searchTerm === '') {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else if (currentOrganization?.id) {
        fetchProjects(false) // Not initial load
      }
      return
    }

    // For search terms, use minimal debounce
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1) // Reset to first page on search
      } else if (currentOrganization?.id) {
        fetchProjects(false) // Not initial load
      }
    }, 100) // Reduced to 100ms for fast response

    return () => clearTimeout(timeoutId)
  }, [searchTerm])
  
  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!currentOrganization?.id) return;
    
    const project = projects.find(p => p.id === id);
    const projectName = project?.name || 'this project';
    
    const confirmation = createDeleteConfirmation({
      itemName: projectName,
      itemType: 'Project',
      additionalMessage: 'will remove all associated tasks, time entries, and other data',
      onDelete: async () => {
        try {
          await projectAPI.deleteProject(id, currentOrganization.id);
          toast.success(`Project "${projectName}" deleted successfully`);
          await fetchProjects(false);
        } catch (err: any) {
          console.error('Error deleting project:', err);
          toast.error(err.message || 'Failed to delete project');
        }
      }
    });
    
    confirm(confirmation.action, confirmation);
  };
  
  const handleAddNew = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleProjectDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedProjectId(null);
  };

  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'All Status';
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setIsStatusDropdownOpen(false);
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-blue-500';
      case 'on_hold':
        return 'border-yellow-500';
      case 'completed':
        return 'border-green-500';
      case 'cancelled':
        return 'border-gray-500';
      default:
        return 'border-gray-500';
    }
  };
  
  const calculateTimeProgress = (project: Project) => {
    if (!project.start_date || !project.end_date) return 0;
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();
    
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  };
  
  const getRemainingDays = (endDate: string | undefined) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const getBudgetUtilization = (project: Project) => {
    // Since we don't have actual spending data, we'll simulate it based on time progress
    const timeProgress = calculateTimeProgress(project);
    // Simulate that projects typically spend proportionally to time elapsed
    return Math.min(100, timeProgress + (Math.random() * 20 - 10)); // Add some variance
  };

  const getProjectBudget = (project: Project) => {
    if (project.project_type === 'fixed_fee' && project.budget_amount) {
      // For fixed fee projects, use the budget_amount directly
      const budgetUtilization = getBudgetUtilization(project);
      const spent = Math.round((budgetUtilization / 100) * project.budget_amount);
      return {
        type: 'fixed_fee',
        total: project.budget_amount,
        spent: spent,
        remaining: project.budget_amount - spent
      };
    } else if (project.project_type === 'time_materials' && project.budget_hours && project.billing_rate) {
      // For time & materials projects, calculate based on hours * rate
      const totalBudget = project.budget_hours * project.billing_rate;
      const budgetUtilization = getBudgetUtilization(project);
      const spent = Math.round((budgetUtilization / 100) * totalBudget);
      return {
        type: 'time_materials',
        total: totalBudget,
        spent: spent,
        remaining: totalBudget - spent
      };
    } else if (project.project_type === 'time_materials' && project.billing_rate) {
      // If only billing rate is set, calculate based on time progress
      const estimatedHours = project.budget_hours || 40; // Default to 40 hours if not set
      const totalBudget = estimatedHours * project.billing_rate;
      const budgetUtilization = getBudgetUtilization(project);
      const spent = Math.round((budgetUtilization / 100) * totalBudget);
      return {
        type: 'time_materials',
        total: totalBudget,
        spent: spent,
        remaining: totalBudget - spent
      };
    } else if (project.project_type === 'non_billable') {
      // For non-billable projects, show no budget
      return null;
    }
    return null;
  };
  
  const getProjectStatus = (project: Project) => {
    const timeProgress = calculateTimeProgress(project);
    const budgetUtilization = getBudgetUtilization(project);
    
    if (budgetUtilization > 90) return { label: 'Behind', color: 'bg-yellow-100 text-yellow-800' };
    if (budgetUtilization > timeProgress + 20) return { label: 'Behind', color: 'bg-yellow-100 text-yellow-800' };
    if (timeProgress > budgetUtilization + 20) return { label: 'Ahead', color: 'bg-green-100 text-green-800' };
    return { label: 'On Track', color: 'bg-blue-100 text-blue-800' };
  };
  
  // Projects are already filtered by API, no need for client-side filtering
  
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Projects</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchProjects(false)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (organizationLoading || !currentOrganization?.id || loading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">Manage your projects and track their progress for {currentOrganization?.name}</p>
        </div>
        
        {/* Search, Filter and Create Button Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative" id="status-dropdown">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center px-4 py-2.5 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                {getStatusLabel(statusFilter)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute z-10 mt-1 w-48 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusFilter(option.value)}
                      className={`${
                        statusFilter === option.value
                          ? 'bg-orange-50 text-orange-900'
                          : 'text-gray-900'
                      } group relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-orange-50 hover:text-orange-900 w-full text-left`}
                    >
                      <span className="block truncate font-normal">
                        {option.label}
                      </span>
                      {statusFilter === option.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear All
              </button>
            )}
            <Link href="/projects/new">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap text-sm font-medium h-10">
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </Link>
          </div>
        </div>
      </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">
                {searchTerm ? 'Searching projects...' : 'Loading projects...'}
              </span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {searchTerm ? (
                  <Search className="h-6 w-6 text-gray-400" />
                ) : (
                  <Plus className="h-6 w-6 text-gray-400" />
                )}
              </div>
              {searchTerm ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4">No projects match your search criteria for "{searchTerm}".</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
                  <Link href="/projects/new">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600">
                      Create Your First Project
                    </button>
                  </Link>
                </>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Progress
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Budget
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Timeline
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map(project => {
                  const timeProgress = calculateTimeProgress(project);
                  const budgetUtilization = getBudgetUtilization(project);
                  const remainingDays = getRemainingDays(project.end_date);
                  const status = getProjectStatus(project);
                  const statusIcon = getStatusIcon(project.status);
                  
                  return (
                    <tr 
                      key={project.id}
                      onClick={() => handleProjectDetails(project.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full border-2 ${statusIcon} mr-3`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.description}</div>
                            {project.code && (
                              <div className="text-xs text-gray-400">{project.code}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{project.progress || 0}%</span>
                          {project.progress_details && project.progress_details.totalCards > 0 && (
                            <div className="ml-2 text-xs text-gray-500">
                              ({project.progress_details.completedCards}/{project.progress_details.totalCards} cards)
                            </div>
                          )}
                          {(!project.progress_details || project.progress_details.totalCards === 0) && (
                            <div className="ml-2 text-xs text-gray-400">
                              (No Kanban data)
                            </div>
                          )}
                        </div>
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap">
                         {(() => {
                           const budget = getProjectBudget(project);
                           if (!budget) {
                             return (
                               <div className="text-sm text-gray-900">
                                 No budget set
                               </div>
                             );
                           }
                           
                           return (
                             <>
                               <div className="text-sm text-gray-900">
                                 ${budget.spent.toLocaleString()} / ${budget.total.toLocaleString()}
                               </div>
                               <div className="text-sm text-green-600">
                                 +${budget.remaining.toLocaleString()}
                               </div>
                             </>
                           );
                         })()}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {remainingDays > 0 ? `${remainingDays} days left` : 
                           remainingDays === 0 ? 'Due today' : 
                           `${Math.abs(remainingDays)} days overdue`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'No end date'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(project);
                          }}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
          
          {/* Pagination */}
          {!isSearching && projects.length > 0 && totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      
      {isModalOpen && (
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={selectedProject}
        />
      )}
      
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        type={confirmation.type}
        isLoading={confirmation.isLoading}
      />

      <ProjectDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        projectId={selectedProjectId}
      />
    </div>
  );
}
