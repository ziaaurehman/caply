"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  GripVertical,
} from "lucide-react";
import KanbanCard from "./KanbanCard";
import { Card, List, ProjectMember } from "./types";

interface KanbanColumnOptimizedProps {
  list: List;
  cards: Card[];
  projectMembers: ProjectMember[];
  onDragStart: (e: React.DragEvent, card: Card) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, listId: string) => void;
  onAddCard: (listId: string) => void;
  onCardClick: (card: Card) => void;
  onListArchive?: (listId: string, isArchived: boolean) => void;
  isDraggedOver?: boolean;
  draggedCardId?: string | null;
}

export default function KanbanColumnOptimized({
  list,
  cards,
  projectMembers,
  onDragStart,
  onDragOver,
  onDrop,
  onAddCard,
  onCardClick,
  onListArchive,
  isDraggedOver = false,
  draggedCardId = null,
}: KanbanColumnOptimizedProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleArchiveToggle = () => {
    if (onListArchive) {
      onListArchive(list.id, !list.is_archived);
    }
    setShowDropdown(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, list.id);
  };

  return (
    <div
      className={`w-80 bg-gray-100 rounded-lg p-4 transition-colors ${
        isDraggedOver ? "bg-blue-50 border-2 border-blue-300" : ""
      }`}
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">{list.name}</h3>
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
            {cards.length}
          </span>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              <button
                onClick={handleArchiveToggle}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                {list.is_archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    <span>Restore List</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    <span>Archive List</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3 min-h-[200px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            projectMembers={projectMembers}
            onDragStart={(e) => onDragStart(e, card)}
            onClick={() => onCardClick(card)}
            isBeingDragged={draggedCardId === card.id}
          />
        ))}

        {/* Add Card Button */}
        <button
          onClick={() => onAddCard(list.id)}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add a card</span>
        </button>
      </div>
    </div>
  );
}
