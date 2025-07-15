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

  // Format due date
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const isOverdue = date < now
    
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isOverdue
    }
  }

  const dueDate = formatDueDate(card.due_date)

  // Check if card has attachments, comments, or checklists
  const hasAttachments = card.attachments && card.attachments.length > 0
  const hasComments = card.comments && card.comments.length > 0
  const hasChecklists = card.checklists && card.checklists.length > 0

  // Calculate checklist progress
  const checklistProgress = card.checklists?.reduce((acc, checklist) => {
    const totalItems = checklist.checklist_items?.length || 0
    const completedItems = checklist.checklist_items?.filter(item => item.is_completed).length || 0
    return {
      total: acc.total + totalItems,
      completed: acc.completed + completedItems
    }
  }, { total: 0, completed: 0 })

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300"
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onClick={() => onClick(card)}
    >
      {/* Cover color */}
      {card.cover_color && (
        <div 
          className="h-2 rounded-t-lg -mx-3 -mt-3 mb-3"
          style={{ backgroundColor: card.cover_color }}
        />
      )}

      {/* Card labels */}
      {card.card_labels && card.card_labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.card_labels.map((cardLabel) => (
            <div
              key={cardLabel.label_id}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: cardLabel.labels.color }}
              title={cardLabel.labels.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="font-medium text-gray-800 mb-2 text-sm leading-tight">
        {card.title}
      </h3>

      {/* Description preview */}
      {card.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Card badges/icons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Due date */}
          {dueDate && (
            <div className={`flex items-center text-xs px-2 py-1 rounded ${
              dueDate.isOverdue 
                ? 'bg-red-100 text-red-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Calendar className="h-3 w-3 mr-1" />
              {dueDate.text}
            </div>
          )}

          {/* Checklist progress */}
          {hasChecklists && checklistProgress && checklistProgress.total > 0 && (
            <div className={`flex items-center text-xs px-2 py-1 rounded ${
              checklistProgress.completed === checklistProgress.total
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <CheckSquare className="h-3 w-3 mr-1" />
              {checklistProgress.completed}/{checklistProgress.total}
            </div>
          )}

          {/* Comments count */}
          {hasComments && (
            <div className="flex items-center text-xs text-gray-500">
              <MessageCircle className="h-3 w-3 mr-1" />
              {card.comments?.length}
            </div>
          )}

          {/* Attachments count */}
          {hasAttachments && (
            <div className="flex items-center text-xs text-gray-500">
              <Paperclip className="h-3 w-3 mr-1" />
              {card.attachments?.length}
            </div>
          )}
        </div>

        {/* Assigned members */}
        {assignedMembers.length > 0 && (
          <div className="flex -space-x-1">
            {assignedMembers.slice(0, 3).map((member, index) => (
              <div
                key={member?.user_id || index}
                className="h-6 w-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700 border border-white shadow-sm"
                title={member?.users.full_name || 'Unknown User'}
              >
                {member?.users.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
              </div>
            ))}
            {assignedMembers.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border border-white shadow-sm">
                +{assignedMembers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 