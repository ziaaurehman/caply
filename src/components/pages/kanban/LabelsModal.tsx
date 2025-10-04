"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, ChevronLeft, Search, Plus, Edit3, Trash2 } from "lucide-react";
import { kanbanAPI } from "@/utils/api/kanban";
import { useQueryClient } from "@tanstack/react-query";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  organizationId: string;
  selectedLabels: string[];
  onLabelsChange: (labelIds: string[]) => void;
  labels: any[];
  isLoading: boolean;
}

export default function LabelsModal({
  isOpen,
  onClose,
  boardId,
  organizationId,
  selectedLabels,
  onLabelsChange,
  labels,
  isLoading,
}: LabelsModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3B82F6");
  const [localSelectedLabels, setLocalSelectedLabels] =
    useState<string[]>(selectedLabels);

  // Edit state
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const colors = [
    "#10B981", // green
    "#F59E0B", // yellow
    "#F97316", // orange
    "#EF4444", // red
    "#8B5CF6", // purple
    "#3B82F6", // blue
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#EC4899", // pink
    "#6B7280", // gray
    "#1F2937", // dark gray
    "#F3F4F6", // light gray
  ];

  // Sync local state when selectedLabels prop changes
  useEffect(() => {
    setLocalSelectedLabels(selectedLabels);
  }, [selectedLabels]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      setIsCreating(true);

      const labelData = {
        board_id: boardId,
        name: newLabelName,
        color: newLabelColor,
        organizationId,
      };

      const response = await kanbanAPI.createLabel(labelData);
      queryClient.invalidateQueries({
        queryKey: ["board-labels", boardId, organizationId],
      });
      console.log("Create label response:", response);

      setNewLabelName("");
      setNewLabelColor("#3B82F6");
      setShowCreateForm(false);

      console.log("Label created and applied successfully!");
      toast.success(`Label "${newLabelName}" created successfully!`);
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error("Failed to create label");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditLabel = (e: React.MouseEvent, label: Label) => {
    e.stopPropagation(); // Prevent checkbox toggle
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
    setShowCreateForm(false); // Close create form if open
  };

  const handleUpdateLabel = async () => {
    if (!editLabelName.trim() || !editingLabelId) return;

    try {
      setIsUpdating(true);

      await kanbanAPI.updateLabel(editingLabelId, {
        name: editLabelName,
        color: editLabelColor,
        organizationId,
      });

      queryClient.invalidateQueries({
        queryKey: ["board-labels", boardId, organizationId],
      });

      setEditingLabelId(null);
      setEditLabelName("");
      setEditLabelColor("");

      toast.success("Label updated successfully!");
    } catch (error) {
      console.error("Error updating label:", error);
      toast.error("Failed to update label");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      setIsDeleting(true);

      await kanbanAPI.deleteLabel(labelId);

      queryClient.invalidateQueries({
        queryKey: ["board-labels", boardId, organizationId],
      });

      // Remove from local selected labels if it was selected
      setLocalSelectedLabels((prev) => prev.filter((id) => id !== labelId));

      setEditingLabelId(null);

      toast.success("Label deleted successfully!");
    } catch (error) {
      console.error("Error deleting label:", error);
      toast.error("Failed to delete label");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelEdit = () => {
    setEditingLabelId(null);
    setEditLabelName("");
    setEditLabelColor("");
  };

  const handleLabelToggle = (labelId: string) => {
    const isSelected = localSelectedLabels.includes(labelId);
    console.log(
      "Label toggle:",
      labelId,
      "isSelected:",
      isSelected,
      "current selected:",
      localSelectedLabels
    );
    if (isSelected) {
      const newSelection = localSelectedLabels.filter((id) => id !== labelId);
      console.log("Removing label, new selection:", newSelection);
      setLocalSelectedLabels(newSelection);
    } else {
      const newSelection = [...localSelectedLabels, labelId];
      console.log("Adding label, new selection:", newSelection);
      setLocalSelectedLabels(newSelection);
    }
  };

  // Check if there are changes to apply
  const hasChanges = () => {
    return (
      JSON.stringify(localSelectedLabels.sort()) !==
      JSON.stringify(selectedLabels.sort())
    );
  };

  // Handle applying changes
  const handleApplyChanges = () => {
    onLabelsChange(localSelectedLabels);
    onClose();
  };

  // Handle canceling changes
  const handleCancel = () => {
    setLocalSelectedLabels(selectedLabels); // Reset to original state
    setEditingLabelId(null);
    setShowCreateForm(false);
    onClose();
  };

  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Labels</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search labels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Labels List */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Labels</h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLabels.map((label) =>
                editingLabelId === label.id ? (
                  // Edit Form
                  <div
                    key={label.id}
                    className="p-3 border border-gray-300 rounded-lg bg-gray-50"
                  >
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Label name"
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">
                          Color
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditLabelColor(color)}
                              className={`w-8 h-8 rounded border-2 ${
                                editLabelColor === color
                                  ? "border-gray-900"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateLabel}
                          disabled={isUpdating || !editLabelName.trim()}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(label.id)}
                          disabled={isDeleting}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isUpdating || isDeleting}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal Label Row
                  <div
                    key={label.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleLabelToggle(label.id)}
                  >
                    <input
                      type="checkbox"
                      checked={localSelectedLabels.includes(label.id)}
                      onChange={() => handleLabelToggle(label.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div
                      className="w-6 h-3 rounded"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-gray-900 flex-1">
                      {label.name}
                    </span>
                    <button
                      onClick={(e) => handleEditLabel(e, label)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Create New Label */}
        {showCreateForm ? (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Create a new label
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-8 h-8 rounded border-2 ${
                        newLabelColor === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLabel}
                  disabled={isCreating || !newLabelName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
              >
                Create a new label
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {hasChanges() && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={handleApplyChanges}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Update Labels
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
