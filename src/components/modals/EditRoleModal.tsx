"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { useUpdateRole } from "@/lib/hooks/useRoles";
import { Permission, UpdateRoleRequest, Role } from "@/lib/types";
import { useOrganizationStore } from "@/lib/stores/organizationStore";

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role;
  permissions: Record<string, Permission[]>;
}

export default function EditRoleModal({
  isOpen,
  onClose,
  onSuccess,
  role,
  permissions,
}: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    display_name: "",
    description: "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { currentOrganization } = useOrganizationStore();
  const updateRoleMutation = useUpdateRole();

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        display_name: role.display_name,
        description: role.description || "",
      });
      setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization?.id) {
      return;
    }

    const updateData: UpdateRoleRequest = {
      ...formData,
      permission_ids: selectedPermissions,
    };

    updateRoleMutation.mutate(
      {
        id: role.id,
        data: { ...updateData, organizationId: currentOrganization.id },
      },
      {
        onSuccess: () => {
          onSuccess();
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    onClose();
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllInModule = (module: string) => {
    const modulePermissions = permissions[module]?.map((p) => p.id) || [];
    const allSelected = modulePermissions.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      // Deselect all in module
      setSelectedPermissions((prev) =>
        prev.filter((id) => !modulePermissions.includes(id))
      );
    } else {
      // Select all in module
      setSelectedPermissions((prev) => {
        const newSet = new Set([...prev, ...modulePermissions]);
        return Array.from(newSet);
      });
    }
  };

  const isDefaultRole = ["admin", "manager", "member"].includes(
    role?.name || ""
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Edit Role</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {updateRoleMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">
                  {updateRoleMutation.error.message || "Failed to update role"}
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Role Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={role.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Role name cannot be changed
                </p>
              </div>

              <div>
                <label
                  htmlFor="display_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Display Name *
                </label>
                <input
                  id="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="e.g., Project Manager"
                  required
                  disabled={isDefaultRole}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                    isDefaultRole
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : ""
                  }`}
                />
                {isDefaultRole && (
                  <p className="text-xs text-gray-500 mt-1">
                    Default role display name cannot be changed
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this role is for..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Permissions
              </h3>
              <div className="space-y-4">
                {Object.entries(permissions).map(
                  ([module, modulePermissions]) => (
                    <div
                      key={module}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {module}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInModule(module)}
                          className="text-sm text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          {modulePermissions.every((p) =>
                            selectedPermissions.includes(p.id)
                          )
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {modulePermissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 capitalize">
                              {permission.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={updateRoleMutation.isPending || !formData.display_name}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {updateRoleMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Update Role
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
