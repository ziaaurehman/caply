"use client";

import { useState } from "react";
import { X, Calendar, User, Palette, Loader2 } from "lucide-react";
import { ProjectMember } from "./types";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (listId: string, cardData: any) => Promise<void>;
  listId: string | null;
  projectMembers: ProjectMember[];
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  listId,
  projectMembers,
}: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    cover_color: "",
    assignee_ids: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const coverColors = [
    { name: "None", value: "" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Yellow", value: "#eab308" },
    { name: "Green", value: "#22c55e" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listId || !formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(listId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        due_date: formData.due_date || undefined,
        cover_color: formData.cover_color || undefined,
        assignee_ids: formData.assignee_ids,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        due_date: "",
        cover_color: "",
        assignee_ids: [],
      });
      onClose();
    } catch (error) {
      console.error("Error creating card:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssigneeToggle = (projectMemberId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(projectMemberId)
        ? prev.assignee_ids.filter((id) => id !== projectMemberId)
        : [...prev.assignee_ids, projectMemberId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Add New Card
            </h2>
            {isSubmitting && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Creating...</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {/* {isSubmitting && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Creating your card...</p>
            </div>
          </div>
        )} */}

        <form onSubmit={handleSubmit} className="p-4 space-y-4 relative">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Enter card title"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Enter card description"
              disabled={isSubmitting}
            />
          </div>

          {/* Due Date */}
          <div>
            <label
              htmlFor="due_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            />
          </div>

          {/* Cover Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="h-4 w-4 inline mr-1" />
              Cover Color
            </label>
            <div className="flex flex-wrap gap-2">
              {coverColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      cover_color: color.value,
                    }))
                  }
                  className={`w-8 h-8 rounded-md border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.cover_color === color.value
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{
                    backgroundColor: color.value || "#f3f4f6",
                    borderStyle: color.value ? "solid" : "dashed",
                  }}
                  title={color.name}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>

          {/* Assignees */}
          {projectMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assign to Team Members
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {projectMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignee_ids.includes(member.id)}
                      onChange={() => handleAssigneeToggle(member.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                        {member.organization_members.users.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "??"}
                      </div>
                      <span className="text-sm text-gray-700">
                        {member.organization_members.users.full_name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Card"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
