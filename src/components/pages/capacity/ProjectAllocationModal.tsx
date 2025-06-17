"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useProjectStore } from '@/lib/stores/projectStore';

interface ProjectAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

interface FormData {
  projectId: string;
  hoursPerDay: number;
}

const ProjectAllocationModal: React.FC<ProjectAllocationModalProps> = ({
  isOpen,
  onClose,
  employeeId,
}) => {
  const { projects, addAssignment } = useProjectStore();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      projectId: '',
      hoursPerDay: 8,
    },
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      await addAssignment({
        projectId: data.projectId,
        employeeId,
        hoursPerDay: data.hoursPerDay,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      });
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to add project assignment:', error);
    }
  };
  
  if (!isOpen) return null;
  
  // Filter only active projects
  const availableProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'planned');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Project Assignment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Project
            </label>
            <select
              {...register('projectId', { required: 'Please select a project' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Select a project</option>
              {availableProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-error-600">{errors.projectId.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hours Per Day
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              {...register('hoursPerDay', {
                required: 'Hours per day is required',
                min: { value: 0.5, message: 'Minimum 0.5 hours' },
                max: { value: 24, message: 'Maximum 24 hours' },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.hoursPerDay && (
              <p className="mt-1 text-sm text-error-600">{errors.hoursPerDay.message}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
            >
              Add Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectAllocationModal; 