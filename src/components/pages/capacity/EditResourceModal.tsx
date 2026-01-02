"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, User } from "lucide-react";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: {
        id: string; // resource_allocation_id
        fullName?: string;
        email?: string;
        role?: string;
        weeklyCapacityHours: number;
        hourlyRate?: number;
        isActive?: boolean;
    };
}

export default function EditResourceModal({
    isOpen,
    onClose,
    resource,
}: EditResourceModalProps) {
    const queryClient = useQueryClient();
    const { currentOrganization } = useOrganizationStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        weekly_capacity_hours: number;
        hourly_rate: number | "";
        is_active: boolean;
    }>({
        weekly_capacity_hours: 40,
        hourly_rate: "",
        is_active: true,
    });

    useEffect(() => {
        if (isOpen && resource) {
            setFormData({
                weekly_capacity_hours: resource.weeklyCapacityHours || 40,
                // Check if hourlyRate is defined (including 0), otherwise use empty string
                hourly_rate: resource.hourlyRate !== undefined && resource.hourlyRate !== null ? resource.hourlyRate : "",
                is_active: resource.isActive ?? true,
            });
        }
    }, [isOpen, resource]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization?.id) {
            setError("Organization not found");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const res = await fetch("/api/capacity/resources", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId: resource.id,
                    organizationId: currentOrganization.id,
                    weeklyCapacityHours: formData.weekly_capacity_hours,
                    hourlyRate: formData.hourly_rate === "" ? null : Number(formData.hourly_rate),
                    isActive: formData.is_active,
                }),
            });

            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || "Failed to update resource");
            }

            queryClient.invalidateQueries({
                queryKey: ["resources"],
                exact: false,
            });
            queryClient.invalidateQueries({
                queryKey: ["capacity"],
                exact: false,
            });

            toast.success("Resource updated successfully!");
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to update resource"
            );
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Edit Resource
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
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

                    <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {resource.fullName || "Unknown Member"}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {resource.email}
                                    {resource.role && ` • ${resource.role}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Capacity Configuration */}
                        <div>
                            <label
                                htmlFor="weekly_capacity_hours"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                <Clock className="inline h-4 w-4 mr-1" />
                                Weekly Capacity Hours *
                            </label>
                            <input
                                type="number"
                                id="weekly_capacity_hours"
                                value={formData.weekly_capacity_hours}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        weekly_capacity_hours: Number(e.target.value),
                                    }))
                                }
                                min="0"
                                max="168"
                                step="0.5"
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="hourly_rate"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                <Clock className="inline h-4 w-4 mr-1" />
                                Hourly Rate ($)
                            </label>
                            <input
                                type="number"
                                id="hourly_rate"
                                value={formData.hourly_rate}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        hourly_rate: e.target.value === "" ? "" : Number(e.target.value),
                                    }))
                                }
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="e.g., 50.00"
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_active: e.target.checked,
                                        }))
                                    }
                                    className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Active Resource
                                </span>
                            </label>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </div>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
