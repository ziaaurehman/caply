"use client";

import { useState } from "react";
import { X, CheckSquare, Plus, Trash2 } from "lucide-react";
import { kanbanAPI } from "@/utils/api/kanban";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  content: string;
  is_completed: boolean;
  position: number;
  due_date?: string;
  assigned_to_project_member_id?: string;
}

interface Checklist {
  id: string;
  name: string;
  position: number;
  checklist_items: ChecklistItem[];
}

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  organizationId: string;
  checklists: Checklist[];
  onChecklistsChange: (checklists: Checklist[]) => void;
}

export default function ChecklistModal({
  isOpen,
  onClose,
  cardId,
  organizationId,
  checklists,
  onChecklistsChange,
}: ChecklistModalProps) {
  const [newChecklistName, setNewChecklistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateChecklist = async () => {
    if (!newChecklistName.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await kanbanAPI.createChecklist({
        card_id: cardId,
        name: newChecklistName,
        organizationId,
      });

      // Add the new checklist to the list
      onChecklistsChange([
        ...checklists,
        { ...response.checklist, checklist_items: [] },
      ]);
      setNewChecklistName("");
      setShowCreateForm(false);
      toast.success("Checklist created successfully!");
    } catch (error) {
      console.error("Error creating checklist:", error);
      toast.error("Failed to create checklist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChecklist = (checklistId: string) => {
    onChecklistsChange(checklists.filter((c) => c.id !== checklistId));
  };

  const handleToggleItem = (checklistId: string, itemId: string) => {
    const updatedChecklists = checklists.map((checklist) => {
      if (checklist.id === checklistId) {
        return {
          ...checklist,
          checklist_items: checklist.checklist_items.map((item) => {
            if (item.id === itemId) {
              return { ...item, is_completed: !item.is_completed };
            }
            return item;
          }),
        };
      }
      return checklist;
    });
    onChecklistsChange(updatedChecklists);
  };

  const getProgress = (checklist: Checklist) => {
    const total = checklist.checklist_items.length;
    const completed = checklist.checklist_items.filter(
      (item) => item.is_completed
    ).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add checklist</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Create New Checklist */}
          {showCreateForm ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Checklist"
                  value={newChecklistName}
                  onChange={(e) => setNewChecklistName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateChecklist}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Create a new checklist
            </button>
          )}

          {/* Existing Checklists */}
          {checklists.length > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700">
                Existing checklists
              </h3>
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {checklist.name}
                    </h4>
                    <button
                      onClick={() => handleDeleteChecklist(checklist.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{getProgress(checklist)}% complete</span>
                      <span>
                        {
                          checklist.checklist_items.filter(
                            (item) => item.is_completed
                          ).length
                        }{" "}
                        of {checklist.checklist_items.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgress(checklist)}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-1">
                    {checklist.checklist_items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <button
                          onClick={() =>
                            handleToggleItem(checklist.id, item.id)
                          }
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            item.is_completed
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {item.is_completed && (
                            <CheckSquare className="h-3 w-3" />
                          )}
                        </button>
                        <span
                          className={`flex-1 ${
                            item.is_completed
                              ? "line-through text-gray-500"
                              : "text-gray-700"
                          }`}
                        >
                          {item.content}
                        </span>
                      </div>
                    ))}
                    {checklist.checklist_items.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{checklist.checklist_items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
