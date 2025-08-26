"use client"

import { Plus } from "lucide-react"
import KanbanCard from "./KanbanCard"
import { Card, List, ProjectMember } from "./types"

interface KanbanColumnProps {
  list: List
  cards: Card[]
  projectMembers: ProjectMember[]
  onDragStart: (e: React.DragEvent, card: Card) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, listId: string) => void
  onAddCard: (listId: string) => void
  onCardClick: (card: Card) => void
}

export default function KanbanColumn({ 
  list, 
  cards, 
  projectMembers,
  onDragStart, 
  onDragOver, 
  onDrop, 
  onAddCard,
  onCardClick
}: KanbanColumnProps) {
  return (
    <div
      className="flex-shrink-0 w-80 bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 flex flex-col"
      style={{ height: 'calc(100vh - 120px)' }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, list.id)}
    >
      <div className="flex items-center mb-4 flex-shrink-0">
        <button
          onClick={() => onAddCard(list.id)}
          className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-100 mr-2"
          aria-label={`Add card to ${list.name}`}
        >
          <Plus className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-gray-800 text-base truncate flex-1">
          {list.name}
        </h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {cards.length}
        </span>
      </div>
      <div className="overflow-y-auto pr-1 -mr-1 space-y-3 flex-1">
        {cards.map((card) => (
          <KanbanCard 
            key={card.id} 
            card={card} 
            projectMembers={projectMembers}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
} 