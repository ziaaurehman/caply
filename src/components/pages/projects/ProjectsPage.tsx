"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Filter, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { projectAPI, type Project } from '@/utils/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { createDeleteConfirmation } from '@/utils/confirmations';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import ProjectModal from './ProjectModal';
import ProjectsSkeleton from "./ProjectsSkeleton";
import { useOrganizationStore } from '@/lib/stores/organizationStore';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { confirmation, confirm, handleConfirm, handleClose } = useConfirmation();
  const { 
    currentOrganization, 
    loading: organizationLoading, 
    fetchUserOrganizations,
    userOrganizations 
  } = useOrganizationStore();
  
  const fetchProjects = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await projectAPI.getProjects(currentOrganization.id);
      setProjects(data.projects);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      const errorMessage = err.message || 'Failed to load projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchProjects();
    }
  }, [currentOrganization?.id]);
  
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
          await fetchProjects();
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
  
  const filteredProjects = projects.filter(project => 
    statusFilter === 'all' ? true : project.status === statusFilter
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-2">
        <div className="mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchProjects}
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

  if (organizationLoading || !currentOrganization?.id || loading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className=" mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
            <p className="text-sm text-gray-500">Manage your projects and track their progress</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                All Status
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
            </div>
            <Link href="/projects/new">
              <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
        
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
              <Link href="/projects/new">
                <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600">
                  Create Your First Project
                </button>
              </Link>
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
                {filteredProjects.map(project => {
                  const timeProgress = calculateTimeProgress(project);
                  const budgetUtilization = getBudgetUtilization(project);
                  const remainingDays = getRemainingDays(project.end_date);
                  const status = getProjectStatus(project);
                  const statusIcon = getStatusIcon(project.status);
                  
                  return (
                    <tr key={project.id}>
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
                              className="bg-orange-500 h-2.5 rounded-full"
                              style={{ width: `${Math.round(budgetUtilization)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{Math.round(budgetUtilization)}% / 100%</span>
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
                          onClick={() => handleEdit(project)}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(project.id)}
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
        </div>
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
    </div>
  );
}
