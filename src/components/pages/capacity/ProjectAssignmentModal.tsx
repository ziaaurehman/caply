"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import Button from "@/components/ui/Button";

interface Project {
    id: string;
    name: string;
}

interface ProjectAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    title: string;
    initialData?: {
        projectId?: string;
        hours?: number;
        includeWeekends?: boolean;
        startDate?: string;
        endDate?: string;
        notes?: string;
    };
    projects: Project[];
    isSubmitting?: boolean;
}

export default function ProjectAssignmentModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    initialData,
    projects,
    isSubmitting = false,
}: ProjectAssignmentModalProps) {
    const [formData, setFormData] = useState({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        notes: "",
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                projectId: initialData.projectId || "",
                hours: initialData.hours || 8,
                includeWeekends: initialData.includeWeekends || false,
                startDate: initialData.startDate || new Date().toISOString().split("T")[0],
                endDate: initialData.endDate || "",
                notes: initialData.notes || "",
            });
        } else {
            setFormData({
                projectId: "",
                hours: 8,
                includeWeekends: false,
                startDate: new Date().toISOString().split("T")[0],
                endDate: "",
                notes: "",
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project
                        </label>
                        <select
                            value={formData.projectId}
                            onChange={(e) =>
                                setFormData({ ...formData, projectId: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            disabled={!!initialData?.projectId}
                            required
                        >
                            <option value="">Select a project</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hours per workday
                        </label>
                        <input
                            type="number"
                            className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            min={0}
                            max={24}
                            step={0.5}
                            value={formData.hours}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    hours: Math.max(0, Number(e.target.value)),
                                })
                            }
                            required
                        />
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            checked={formData.includeWeekends}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    includeWeekends: e.target.checked,
                                })
                            }
                        />
                        Enable weekends
                    </label>

                    {/* Hidden fields to preserve state if needed or for future use */}
                    <div className="hidden">
                        <input type="date" value={formData.startDate} readOnly />
                        <input type="date" value={formData.endDate} readOnly />
                        <textarea value={formData.notes} readOnly />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-6 -mx-6 px-6 py-3 bg-gray-50">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.projectId}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </span>
                            ) : (
                                "Save" // Simple "Save" instead of "Save Assignment" to match Add's "Add"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
