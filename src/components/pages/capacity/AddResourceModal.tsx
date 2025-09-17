"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Clock, Calendar, User } from "lucide-react";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";
import { useCreateAllocation } from "@/lib/hooks/useCapacity";
import { toast } from "sonner";

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

export default function AddResourceModal({
  isOpen,
  onClose,
  onResourceAdded,
}: AddResourceModalProps) {
  const { currentOrganization } = useOrganizationStore();
  const [formData, setFormData] = useState<{
    organization_member_id: string;
    project_id: string;
    weekly_capacity_hours: number;
    start_date: string;
    end_date: string;
    notes: string;
  }>({
    organization_member_id: "",
    project_id: "",
    weekly_capacity_hours: 40,
    start_date: "",
    end_date: "",
    notes: "",
  });

  // React Query hooks
  const {
    data: teamData,
    isLoading: loadingMembers,
    error: membersError,
  } = useTeamMembers(currentOrganization?.id || "");

  const createAllocationMutation = useCreateAllocation();

  // Extract team members
  const availableMembers = teamData?.members || [];

  useEffect(() => {
    if (isOpen) {
      // Set default start date to current week
      const today = new Date();
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeekStart.setDate(today.getDate() - daysToSubtract);

      setFormData((prev) => ({
        ...prev,
        start_date: currentWeekStart.toISOString().split("T")[0],
        weekly_capacity_hours: 40,
      }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization?.id) {
      toast.error("No organization selected");
      return;
    }

    try {
      await createAllocationMutation.mutateAsync({
        organization_id: currentOrganization.id,
        project_id: formData.project_id,
        organization_member_id: formData.organization_member_id,
        hours_per_week: formData.weekly_capacity_hours,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
      });

      toast.success("Resource allocation added successfully!");
      onResourceAdded();
      onClose();

      // Reset form
      setFormData({
        organization_member_id: "",
        project_id: "",
        weekly_capacity_hours: 40,
        start_date: "",
        end_date: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding resource:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add resource"
      );
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add Resource Allocation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign team members to projects with specific capacity allocation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            disabled={createAllocationMutation.isPending}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Team Member Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">Team Member</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Team Member
              </label>
              <select
                value={formData.organization_member_id}
                onChange={(e) =>
                  handleInputChange("organization_member_id", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                required
                disabled={loadingMembers}
              >
                <option value="">
                  {loadingMembers
                    ? "Loading team members..."
                    : "Select a team member"}
                </option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.users?.full_name} ({member.users?.email})
                    {member.department && ` - ${member.department}`}
                  </option>
                ))}
              </select>
              {membersError && (
                <p className="mt-1 text-sm text-red-600">
                  Error loading team members: {membersError.message}
                </p>
              )}
            </div>
          </div>

          {/* Project Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">Project</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={formData.project_id}
                onChange={(e) =>
                  handleInputChange("project_id", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Enter project ID"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the project ID where this team member will be allocated
              </p>
            </div>
          </div>

          {/* Capacity Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Capacity Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.weekly_capacity_hours}
                  onChange={(e) =>
                    handleInputChange(
                      "weekly_capacity_hours",
                      Number(e.target.value)
                    )
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">Date Range</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    handleInputChange("end_date", e.target.value)
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  min={formData.start_date}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Add any additional notes about this allocation..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={createAllocationMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAllocationMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {createAllocationMutation.isPending
                ? "Adding Resource..."
                : "Add Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
