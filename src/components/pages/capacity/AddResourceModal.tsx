"use client"

import React, { useState, useEffect } from 'react';
import { X, Users, Clock, Calendar, User } from 'lucide-react';
import { capacityAPI } from '@/utils/api/capacity';
import { useOrganizationStore } from '@/lib/stores/organizationStore';
import { teamAPI } from '@/utils/api/team';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceAdded: () => void;
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

export default function AddResourceModal({ isOpen, onClose, onResourceAdded }: AddResourceModalProps) {
  const { currentOrganization } = useOrganizationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    organization_member_id: '',
    weekly_capacity_hours: 40,
  });

  useEffect(() => {
    const fetchProject = async () => {
      if (!currentOrganization?.id) return;
      try {
        setLoading(true);
        const teamRes = await teamAPI.getTeamMembers(currentOrganization.id);
        // Use organization members
        const members = (teamRes.members || []).map((m: any) => ({
          id: m.id,
          organization_member_id: m.id,
          role: m.roles?.name || '',
          organization_members: {
            id: m.id,
            user_id: m.users?.id,
            users: m.users
          }
        }));
        setAvailableMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch members');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProject();
    }
  }, [isOpen, currentOrganization?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organization_member_id) {
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

      const member = availableMembers.find(m => m.id === formData.organization_member_id);
      const res = await fetch('/api/capacity/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          organization_member_id: member?.organization_member_id || formData.organization_member_id,
          weekly_capacity_hours: formData.weekly_capacity_hours,
          is_active: true
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to add resource');
      }

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
      organization_member_id: '',
      weekly_capacity_hours: 40,
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedMember = availableMembers.find(member => member.id === formData.organization_member_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Add Resource</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* No project context here */}
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">⚠️</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Member Selection */}
            <div>
              <label htmlFor="organization_member_id" className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Team Member *
              </label>
              <select
                id="organization_member_id"
                value={formData.organization_member_id}
                onChange={(e) => setFormData(prev => ({ ...prev, organization_member_id: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select a team member...</option>
                 {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                     {member.organization_members.users.full_name} - {member.role}
                  </option>
                ))}
              </select>
              {availableMembers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No team members available for this project.</p>
              )}
            </div>

            {/* Selected Member Preview */}
            {selectedMember && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedMember.organization_members.users.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedMember.organization_members.users.email} • {selectedMember.role}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Capacity Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="allocated_hours_per_week" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Weekly Capacity Hours
                </label>
                <input
                  type="number"
                  id="allocated_hours_per_week"
                  value={formData.weekly_capacity_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekly_capacity_hours: Number(e.target.value) }))}
                  min="0"
                  max="168"
                  step="0.5"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 40"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum 168 hours per week</p>
              </div>

              <div></div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Start Date *
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  min={formData.start_date}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for ongoing allocation</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Additional notes about this allocation..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.organization_member_id}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </div>
              ) : (
                'Add Resource'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
