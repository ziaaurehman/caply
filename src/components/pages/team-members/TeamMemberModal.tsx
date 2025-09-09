"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  Mail,
  Users,
  DollarSign,
  Clock,
  User,
  Shield,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  teamAPI,
  type Role,
  type Permission,
  type TeamMember,
} from "@/utils/api";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: TeamMember | null;
  onSave: (data: any) => Promise<void>;
}

interface FormData {
  email: string;
  roleId: string;
  department: string;
  hourlyRate: number;
  weeklyCapacity: number;
  message?: string;
}

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "HR",
  "Customer Success",
  "Quality Assurance",
  "IT",
];

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSave,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  const { currentOrganization } = useOrganizationStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      email: "",
      roleId: "",
      department: "",
      hourlyRate: 50,
      weeklyCapacity: 40,
      message: "",
    },
  });

  const watchedRoleId = watch("roleId");

  // Fetch roles on component mount
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      fetchRoles();
      checkEmailProvider();
      setShowAllPermissions(false);
    }
  }, [isOpen, currentOrganization?.id]);

  // Update form when member changes
  useEffect(() => {
    if (member && isOpen) {
      setValue("email", member.users.email);
      setValue("roleId", member.role_id);
      setValue("department", member.department || "");
      setValue("hourlyRate", member.hourly_rate || 50);
      setValue("weeklyCapacity", member.weekly_capacity || 40);
    } else if (isOpen) {
      reset();
    }
  }, [member, isOpen, setValue, reset]);

  // Update selected role when roleId changes
  useEffect(() => {
    const role = roles.find((r) => r.id === watchedRoleId);
    setSelectedRole(role || null);
    // Reset permissions view when role changes
    setShowAllPermissions(false);
  }, [watchedRoleId, roles]);

  const checkEmailProvider = async () => {
    try {
      const data = await teamAPI.getEmailProvider();
      setEmailProvider(data.provider);
    } catch (error) {
      console.error("Error checking email provider:", error);
      setEmailProvider("console");
    }
  };

  const fetchRoles = async () => {
    if (!currentOrganization?.id) return;

    setLoadingRoles(true);
    try {
      const data = await teamAPI.getRoles(currentOrganization.id);
      console.log("data", data);
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await onSave({
        ...data,
        id: member?.id,
      });
      onClose();
      reset();
    } catch (error) {
      console.error("Failed to save team member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!member;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Edit Team Member" : "Invite Team Member"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing
                ? "Update member details and permissions"
                : "Invite a new member to your organization with specific role and permissions"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Email Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Contact Information
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                {...register("email", { required: "Email is required" })}
                disabled={isEditing}
                placeholder="member@company.com"
                error={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  If this email has an account, they'll be added immediately.
                  Otherwise, they'll receive an invitation to create an account.
                  {emailProvider && emailProvider !== "console" && (
                    <span className="ml-1 text-orange-500">
                      Email will be sent via{" "}
                      {emailProvider === "sendgrid" ? "SendGrid" : "Resend"}.
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Role & Permissions Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Role & Permissions
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <Select
                {...register("roleId", { required: "Role is required" })}
                disabled={loadingRoles}
                error={!!errors.roleId}
              >
                <option value="">
                  {loadingRoles ? "Loading roles..." : "Select a role"}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name}
                  </option>
                ))}
              </Select>
              {errors.roleId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.roleId.message}
                </p>
              )}
            </div>

            {/* Role Details & Permissions */}
            {selectedRole && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">
                  {selectedRole.display_name}
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  {selectedRole.description}
                </p>

                {selectedRole.permissions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-800 mb-2">
                      Permissions included:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(showAllPermissions
                        ? selectedRole.permissions
                        : selectedRole.permissions.slice(0, 6)
                      ).map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center space-x-1"
                        >
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                          <span className="text-xs text-orange-700">
                            {permission.display_name}
                          </span>
                        </div>
                      ))}
                      {selectedRole.permissions.length > 6 &&
                        !showAllPermissions && (
                          <button
                            onClick={() => setShowAllPermissions(true)}
                            className="text-xs text-orange-600 hover:text-orange-800 hover:underline cursor-pointer text-left w-full"
                          >
                            +{selectedRole.permissions.length - 6} more
                            permissions
                          </button>
                        )}
                      {showAllPermissions &&
                        selectedRole.permissions.length > 6 && (
                          <button
                            onClick={() => setShowAllPermissions(false)}
                            className="text-xs text-orange-600 hover:text-orange-800 hover:underline cursor-pointer text-left  w-full"
                          >
                            Show less
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Work Details Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Work Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <select
                    {...register("department")}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1 text-orange-500" />
                  Weekly Capacity (hours)
                </label>
                <input
                  type="number"
                  {...register("weeklyCapacity", {
                    required: "Weekly capacity is required",
                    min: {
                      value: 1,
                      message: "Capacity must be at least 1 hour",
                    },
                    max: {
                      value: 168,
                      message: "Capacity cannot exceed 168 hours",
                    },
                  })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
                {errors.weeklyCapacity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.weeklyCapacity.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="inline h-4 w-4 mr-1 text-orange-500" />
                  Hourly Rate (CAD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("hourlyRate", {
                    min: { value: 0, message: "Rate must be positive" },
                  })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="50.00"
                />
                {errors.hourlyRate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.hourlyRate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invitation Message (only for new invites) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Invitation Message
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  {...register("message")}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Add a personal message to your invitation..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be included in the invitation email.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {isLoading
                ? isEditing
                  ? "Updating..."
                  : "Sending Invitation..."
                : isEditing
                  ? "Update Member"
                  : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberModal;
