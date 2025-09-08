"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (listName: string) => Promise<void>;
}

export default function AddListModal({
  isOpen,
  onClose,
  onSave,
}: AddListModalProps) {
  const [listName, setListName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(listName.trim());
      setListName("");
      onClose();
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setListName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Add New List</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* List Name */}
          <div>
            <label
              htmlFor="listName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              List Name *
            </label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter list name"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting || !listName.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create List
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
