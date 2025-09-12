"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, ChevronLeft, Search, Plus, Edit3 } from "lucide-react";
import { kanbanAPI } from "@/utils/api/kanban";

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
}

export default function LabelsModal({
  isOpen,
  onClose,
  boardId,
  organizationId,
  selectedLabels,
  onLabelsChange,
}: LabelsModalProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3B82F6");
  const [localSelectedLabels, setLocalSelectedLabels] =
    useState<string[]>(selectedLabels);

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

  useEffect(() => {
    if (isOpen) {
      loadLabels();
    }
  }, [isOpen]);

  // Sync local state when selectedLabels prop changes
  useEffect(() => {
    setLocalSelectedLabels(selectedLabels);
  }, [selectedLabels]);

  const loadLabels = async () => {
    try {
      setIsLoading(true);
      console.log("Loading labels for board:", boardId, "org:", organizationId);
      const response = await kanbanAPI.getLabels(boardId, organizationId);
      console.log("Labels response:", response);
      setLabels(response.labels || []);
    } catch (error) {
      console.error("Error loading labels:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

      console.log("Creating label with data:", labelData);
      console.log("Board ID:", boardId);
      console.log("Organization ID:", organizationId);

      const response = await kanbanAPI.createLabel(labelData);
      console.log("Create label response:", response);

      // Add the new label to the list
      setLabels((prev) => [...prev, response.label]);

      // Automatically select the newly created label
      // const newLabelId = response.label.id
      // if (!localSelectedLabels.includes(newLabelId)) {
      //   const newSelection = [...localSelectedLabels, newLabelId]
      //   setLocalSelectedLabels(newSelection)
      //   onLabelsChange(newSelection)
      // }

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
      // Removed immediate onLabelsChange call
    } else {
      const newSelection = [...localSelectedLabels, labelId];
      console.log("Adding label, new selection:", newSelection);
      setLocalSelectedLabels(newSelection);
      // Removed immediate onLabelsChange call
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
              {filteredLabels.map((label) => (
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
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              ))}
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
