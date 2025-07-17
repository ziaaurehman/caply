"use client"

import { Calendar, MessageCircle, Paperclip, CheckSquare, User } from "lucide-react"
import { Card, ProjectMember } from "./types"

interface KanbanCardProps {
  card: Card
  projectMembers: ProjectMember[]
  onDragStart: (e: React.DragEvent, card: Card) => void
  onClick: (card: Card) => void
}

export default function KanbanCard({ card, projectMembers, onDragStart, onClick }: KanbanCardProps) {
  // Get assigned members
  const assignedMembers = card.card_members?.map(cm => 
    projectMembers.find(pm => pm.user_id === cm.user_id)
  ).filter(Boolean) || []

  // Count indicators for badges
  const hasComments = card.comments && card.comments.length > 0
  const hasAttachments = card.attachments && card.attachments.length > 0
  const hasChecklists = card.checklists && card.checklists.length > 0

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-orange-300 hover:shadow-orange-100/50 group"
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onClick={() => onClick(card)}
    >
      {/* Cover color */}
      {card.cover_color && (
        <div 
          className="h-2 rounded-t-2xl -mx-4 -mt-4 mb-3"
          style={{ backgroundColor: card.cover_color }}
        />
      )}

      {/* Card labels */}
      {card.card_labels && card.card_labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.card_labels.map((cardLabel) => (
            <div
              key={cardLabel.label_id}
              className="h-2 w-10 rounded-full shadow-sm"
              style={{ backgroundColor: cardLabel.labels.color }}
              title={cardLabel.labels.name}
            />
          ))}
        </div>
      )}

      {/* Title - only content shown prominently */}
      <h3 className="font-semibold text-gray-800 mb-3 text-sm leading-tight">
        {card.title}
      </h3>

      {/* Bottom row with minimal indicators and members */}
      <div className="flex items-center justify-between">
        {/* Small indicator badges */}
        <div className="flex items-center space-x-2">
          {hasComments && (
            <div className="flex items-center text-xs text-orange-500 bg-orange-50 rounded-full px-2 py-1">
              <MessageCircle className="h-3 w-3" />
            </div>
          )}
          
          {hasAttachments && (
            <div className="flex items-center text-xs text-blue-500 bg-blue-50 rounded-full px-2 py-1">
              <Paperclip className="h-3 w-3" />
            </div>
          )}
          
          {hasChecklists && (
            <div className="flex items-center text-xs text-green-500 bg-green-50 rounded-full px-2 py-1">
              <CheckSquare className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Assigned members */}
        {assignedMembers.length > 0 && (
          <div className="flex -space-x-1">
            {assignedMembers.slice(0, 3).map((member, index) => (
              <div
                key={member?.user_id || index}
                className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md"
                title={member?.users.full_name || 'Unknown User'}
              >
                {member?.users.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
              </div>
            ))}
            {assignedMembers.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md">
                +{assignedMembers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 