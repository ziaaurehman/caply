"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { X, ChevronDown } from "lucide-react";
import {
  type Project,
  type CreateProjectData,
  type UpdateProjectData,
} from "@/utils/api/project";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { toast } from "sonner";
import { useCreateProject, useUpdateProject } from "@/lib/hooks/useProjects";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated?: () => void;
}

interface FormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  project_type: "time_materials" | "fixed_fee" | "non_billable";
  budget_hours: number;
  budget_amount: number;
  billing_rate: number;
  status: "active" | "on_hold" | "completed" | "cancelled";
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}) => {
  const { currentOrganization } = useOrganizationStore();

  // React Query mutations
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();

  // Helper function to format date for input field
  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    if (typeof date === 'string') {
      // If it's already a date string (YYYY-MM-DD), return it
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // If it's an ISO string, extract the date part
      return date.split('T')[0];
    }
    // If it's a Date object, convert to YYYY-MM-DD
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      project_type: "time_materials",
      budget_hours: 0,
      budget_amount: 0,
      billing_rate: 0,
      status: "active",
    },
  });

  // Reset form when modal closes or project changes
  React.useEffect(() => {
    if (!isOpen) {
      reset();
    } else if (project) {
      // Reset form with project data when modal opens with a project
      reset({
        name: project.name,
        description: project.description || "",
        start_date: formatDateForInput(project.start_date) || new Date().toISOString().split("T")[0],
        end_date: formatDateForInput(project.end_date) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        project_type: project.project_type,
        budget_hours: project.budget_hours || 0,
        budget_amount: project.budget_amount || 0,
        billing_rate: project.billing_rate || 0,
        status: project.status,
      });
    }
  }, [isOpen, project, reset]);

  const watchedProjectType = watch("project_type");

  const onSubmit = async (data: FormData) => {
    if (!currentOrganization?.id) {
      toast.error("Organization Error", {
        description:
          "No organization selected. Please refresh the page and try again.",
        duration: 5000,
      });
      return;
    }

    try {
      if (project) {
        // Update existing project
        await updateProjectMutation.mutateAsync({
          id: project.id,
          data: {
            ...data,
            organizationId: currentOrganization.id,
          },
        });
        toast.success("Project updated successfully!");
      } else {
        // Create new project
        await createProjectMutation.mutateAsync({
          ...data,
          organization_id: currentOrganization.id,
        });
        toast.success("Project created successfully!");
      }

      // Call the callback to refresh projects list
      if (onProjectUpdated) {
        onProjectUpdated();
      }

      onClose();
      reset();
    } catch (error: any) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project", {
        description:
          error.message || "An error occurred while saving the project.",
        duration: 5000,
      });
    }
  };

  // Determine loading state
  const isSubmitting =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[100vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {project ? "Edit Project" : "Add Project"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {project
                ? "Update project details and settings"
                : "Create a new project with all necessary information"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form
            id="project-form"
            onSubmit={handleSubmit(onSubmit, (errors) => {
              // Show validation errors in toast
              const errorMessages = Object.values(errors)
                .map((error) => error?.message)
                .filter(Boolean);
              if (errorMessages.length > 0) {
                toast.error("Please fix the following errors:", {
                  description: errorMessages.join(", "),
                  duration: 5000,
                });
              }
            })}
            className="space-y-6"
          >
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h3>

              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name", {
                    required: "Project name is required",
                  })}
                  className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors ${
                    errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Enter project name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors resize-none"
                  placeholder="Enter project description"
                />
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Timeline
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register("start_date", {
                      required: "Start date is required",
                    })}
                    className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors ${
                      errors.start_date
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    {...register("end_date")}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Project Type Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Project Type
              </h3>

              <div>
                <label
                  htmlFor="projectType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Type
                </label>
                <div className="relative">
                  <select
                    {...register("project_type")}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg appearance-none transition-colors"
                  >
                    <option value="time_materials">Time & Materials</option>
                    <option value="fixed_fee">Fixed Fee</option>
                    <option value="non_billable">Non-Billable</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section (only for existing projects) */}
            {project && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Status
                </h3>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Project Status
                  </label>
                  <div className="relative">
                    <select
                      {...register("status")}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg appearance-none transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Section - Only show for billable project types */}
            {(watchedProjectType === "time_materials" ||
              watchedProjectType === "fixed_fee") && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Budget & Billing
                </h3>

                {/* Time & Materials fields */}
                {watchedProjectType === "time_materials" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="billingRate"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Billing Rate ($/hour){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register("billing_rate", {
                            required:
                              watchedProjectType === "time_materials"
                                ? "Billing rate is required for Time & Materials projects"
                                : false,
                            min: { value: 0, message: "Rate must be positive" },
                          })}
                          className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors ${
                            errors.billing_rate
                              ? "border-red-300 bg-red-50"
                              : "border-gray-300"
                          }`}
                          placeholder="0.00"
                        />
                        {errors.billing_rate && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.billing_rate.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="budgetHours"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Budget Hours
                        </label>
                        <input
                          type="number"
                          {...register("budget_hours", {
                            min: {
                              value: 0,
                              message: "Hours must be positive",
                            },
                          })}
                          className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors ${
                            errors.budget_hours
                              ? "border-red-300 bg-red-50"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                        {errors.budget_hours && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.budget_hours.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Fixed Fee fields */}
                {watchedProjectType === "fixed_fee" && (
                  <div>
                    <label
                      htmlFor="budgetAmount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Fixed Fee Amount ($){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("budget_amount", {
                        required:
                          watchedProjectType === "fixed_fee"
                            ? "Fixed fee amount is required for Fixed Fee projects"
                            : false,
                        min: { value: 0, message: "Amount must be positive" },
                      })}
                      className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors ${
                        errors.budget_amount
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="0.00"
                    />
                    {errors.budget_amount && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.budget_amount.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-2 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="project-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isSubmitting
              ? project
                ? "Updating..."
                : "Creating..."
              : project
                ? "Update Project"
                : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
