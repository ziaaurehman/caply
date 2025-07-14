"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { X, CalendarIcon, ChevronDown } from 'lucide-react';
import { projectAPI, type Project, type CreateProjectData, type UpdateProjectData } from '@/utils/api';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

interface FormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable';
  budget_hours: number;
  budget_amount: number;
  billing_rate: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: project ? {
      name: project.name,
      description: project.description || '',
      start_date: project.start_date || new Date().toISOString().split('T')[0],
      end_date: project.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      project_type: project.project_type,
      budget_hours: project.budget_hours || 0,
      budget_amount: project.budget_amount || 0,
      billing_rate: project.billing_rate || 0,
      status: project.status,
    } : {
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      project_type: 'time_materials',
      budget_hours: 0,
      budget_amount: 0,
      billing_rate: 0,
      status: 'active',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      if (project) {
        await projectAPI.updateProject(project.id, data);
      } else {
        await projectAPI.createProject({
          ...data,
          organization_id: "1", // This should come from auth context
        });
      }
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {project ? 'Edit Project' : 'Add Project'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              {...register('name', { required: 'Project name is required' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register('start_date', { required: 'Start date is required' })}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="mm/dd/yyyy"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                </div>
              </div>
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register('end_date')}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="mm/dd/yyyy"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="projectType" className="block text-sm font-medium text-gray-700 mb-1">
              Project Type
            </label>
            <div className="relative">
              <select
                {...register('project_type')}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
              >
                <option value="time_materials">Time & Materials</option>
                <option value="fixed_fee">Fixed Fee</option>
                <option value="non_billable">Non-Billable</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {project && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  {...register('status')}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Hours
              </label>
              <input
                type="number"
                {...register('budget_hours', {
                  min: { value: 0, message: 'Hours must be positive' },
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
              {errors.budget_hours && (
                <p className="mt-1 text-sm text-red-600">{errors.budget_hours.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Amount
              </label>
              <input
                type="number"
                {...register('budget_amount', {
                  min: { value: 0, message: 'Amount must be positive' },
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
              {errors.budget_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.budget_amount.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="billingRate" className="block text-sm font-medium text-gray-700 mb-1">
              Billing Rate ($/hour)
            </label>
            <input
              type="number"
              {...register('billing_rate', {
                min: { value: 0, message: 'Rate must be positive' },
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
            {errors.billing_rate && (
              <p className="mt-1 text-sm text-red-600">{errors.billing_rate.message}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {project ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;

