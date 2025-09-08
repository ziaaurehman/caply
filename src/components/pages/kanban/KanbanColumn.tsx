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

interface KanbanColumnProps {
  list: List;
  cards: Card[];
  projectMembers: ProjectMember[];
  isLoadingCards?: boolean;
  onDragStart: (e: React.DragEvent, card: Card) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, listId: string) => void;
  onAddCard: (listId: string) => void;
  onCardClick: (card: Card) => void;
  onListDragStart?: (e: React.DragEvent, list: List) => void;
  onListDragOver?: (e: React.DragEvent, listId: string) => void;
  onListDragLeave?: () => void;
  onListDrop?: (e: React.DragEvent, listId: string) => void;
  onListArchive?: (listId: string, isArchived: boolean) => void;
  onListDragEnd?: () => void;
  isDraggedOver?: boolean;
  isBeingDragged?: boolean;
}

export default function KanbanColumn({
  list,
  cards,
  projectMembers,
  isLoadingCards = false,
  onDragStart,
  onDragOver,
  onDrop,
  onAddCard,
  onCardClick,
  onListDragStart,
  onListDragOver,
  onListDragLeave,
  onListDrop,
  onListArchive,
  onListDragEnd,
  isDraggedOver = false,
  isBeingDragged = false,
}: KanbanColumnProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isListDragging, setIsListDragging] = useState(false);
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

  const handleGripDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsListDragging(true);
    if (onListDragStart) {
      onListDragStart(e, list);
    }
  };

  const handleGripDragEnd = () => {
    setIsListDragging(false);
    if (onListDragEnd) {
      onListDragEnd();
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-80 rounded-xl shadow-md p-4 flex flex-col transition-all duration-200 ${
        isBeingDragged
          ? "opacity-50 scale-95 bg-blue-50/80 backdrop-blur-sm border-2 border-blue-300 border-dashed"
          : isDraggedOver
            ? "bg-blue-50/90 backdrop-blur-sm border-2 border-blue-400 shadow-lg transform scale-105"
            : "bg-white/90 backdrop-blur-sm hover:shadow-lg"
      }`}
      style={{ height: "calc(100vh - 120px)" }}
      draggable={false}
      onDragOver={(e) => {
        onDragOver(e);
        onListDragOver?.(e, list.id);
      }}
      onDragLeave={onListDragLeave}
      onDrop={(e) => {
        onDrop(e, list.id);
        onListDrop?.(e, list.id);
      }}
    >
      <div className="flex items-center mb-4 flex-shrink-0">
        {/* Drag Handle */}
        {onListDragStart && (
          <div
            className="text-gray-400 hover:text-gray-600 p-1 cursor-grab mr-1"
            draggable={true}
            onDragStart={handleGripDragStart}
            onDragEnd={handleGripDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Add Card Button */}
        <button
          onClick={() => onAddCard(list.id)}
          className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-100 mr-2"
          aria-label={`Add card to ${list.name}`}
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* List Name */}
        <h2 className="font-semibold text-gray-800 text-base truncate flex-1">
          {list.name}
        </h2>

        {/* Card Count */}
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full mr-2">
          {cards.length}
        </span>

        {/* Three Dots Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            aria-label="List options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
              <button
                onClick={handleArchiveToggle}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {list.is_archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive List
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive List
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-y-auto pr-1 -mr-1 space-y-3 flex-1">
        {isLoadingCards ? (
          // Show loading skeleton while cards are loading
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          // Show actual cards
          cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              projectMembers={projectMembers}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
