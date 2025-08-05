"use client"

import React, { useState, useEffect } from 'react';
import { X, Users, Clock, Calendar, User } from 'lucide-react';
import { capacityAPI, ResourceAllocation } from '@/utils/api/capacity';
import { projectAPI } from '@/utils/api/project';
import { useOrganizationStore } from '@/lib/stores/organizationStore';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceAdded: () => void;
  projectId: string;
}

interface ProjectMember {
  id: string;
  role: string;
  organization_member_id: string;
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
}

interface Project {
  id: string;
  name: string;
  code?: string;
  project_members?: ProjectMember[];
}

export default function AddResourceModal({ isOpen, onClose, onResourceAdded, projectId }: AddResourceModalProps) {
  const { currentOrganization } = useOrganizationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [availableMembers, setAvailableMembers] = useState<ProjectMember[]>([]);
  const [formData, setFormData] = useState({
    project_member_id: '',
    allocated_hours_per_week: 40,
    start_date: '',
    end_date: '',
    role: '',
    notes: ''
  });

  useEffect(() => {
    const fetchProject = async () => {
      if (!currentOrganization?.id || !projectId) return;
      
      try {
        setLoading(true);
        const response = await projectAPI.getProject(projectId, currentOrganization.id);
        setProject(response.project);
        
        // Filter out members who already have current allocations
        const members = response.project.project_members || [];
        setAvailableMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && projectId) {
      fetchProject();
      // Set default start date to current week
      const today = new Date();
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeekStart.setDate(today.getDate() - daysToSubtract);
      
      setFormData(prev => ({
        ...prev,
        start_date: currentWeekStart.toISOString().split('T')[0],
        allocated_hours_per_week: 40
      }));
    }
  }, [isOpen, projectId, currentOrganization?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_member_id || !formData.start_date || formData.allocated_hours_per_week <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    if (!currentOrganization?.id) {
      setError('Organization not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await capacityAPI.createAllocation({
        project_id: projectId,
        project_member_id: formData.project_member_id,
        allocated_hours_per_week: formData.allocated_hours_per_week,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        role: formData.role || null,
        notes: formData.notes || null,
        is_active: true,
        organization_id: currentOrganization.id
      });

      onResourceAdded();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add resource allocation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_member_id: '',
      allocated_hours_per_week: 40,
      start_date: '',
      end_date: '',
      role: '',
      notes: ''
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedMember = availableMembers.find(member => member.id === formData.project_member_id);

  if (!isOpen) return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create resource allocation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_member_id: '',
      allocated_hours_per_week: 0,
      start_date: '',
      end_date: '',
      role: '',
      notes: ''
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Resource Allocation</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="project_member_id" className="block text-sm font-medium text-gray-700 mb-1">
                Team Member *
              </label>
              <select
                id="project_member_id"
                value={formData.project_member_id}
                onChange={(e) => setFormData(prev => ({ ...prev, project_member_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select a team member</option>
                {project?.project_members?.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.organization_members?.users?.full_name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="allocated_hours_per_week" className="block text-sm font-medium text-gray-700 mb-1">
                Hours per Week *
              </label>
              <input
                type="number"
                id="allocated_hours_per_week"
                min="0"
                max="168"
                step="0.5"
                value={formData.allocated_hours_per_week}
                onChange={(e) => setFormData(prev => ({ ...prev, allocated_hours_per_week: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role in Allocation (Optional)
              </label>
              <input
                type="text"
                id="role"
                placeholder="e.g., Frontend Developer, Designer"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Additional notes about this allocation..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
