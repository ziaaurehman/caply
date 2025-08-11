"use client"

import { Calendar, MessageCircle, Paperclip, CheckSquare, User, Tag, Clock, FileText } from "lucide-react"
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
    projectMembers.find(pm => pm.id === cm.project_member_id)
  ).filter(Boolean) || []

  // Check for content indicators
  const hasComments = card.comments && card.comments.length > 0
  const hasAttachments = card.attachments && card.attachments.length > 0
  const hasChecklists = card.checklists && card.checklists.length > 0
  const hasDescription = card.description && card.description.trim().length > 0
  const hasDueDate = card.due_date

  // Calculate checklist progress
  const totalChecklistItems = card.checklists?.reduce((total, checklist) => 
    total + (checklist.checklist_items?.length || 0), 0) || 0
  const completedChecklistItems = card.checklists?.reduce((total, checklist) => 
    total + (checklist.checklist_items?.filter(item => item.is_completed).length || 0), 0) || 0

  // Format due date in Trello style
  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const isOverdue = date < today
    const isDueToday = date.toDateString() === today.toDateString()
    const isDueTomorrow = date.toDateString() === tomorrow.toDateString()
    
    if (isOverdue) return { text: 'Overdue', color: 'bg-red-100 text-red-700', textColor: 'text-red-700' }
    if (isDueToday) return { text: 'Due today', color: 'bg-red-100 text-red-700', textColor: 'text-red-700' }
    if (isDueTomorrow) return { text: 'Due tomorrow', color: 'bg-yellow-100 text-yellow-700', textColor: 'text-yellow-700' }
    
    return { 
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'bg-gray-100 text-gray-700',
      textColor: 'text-gray-700'
    }
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group mb-3"
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onClick={() => onClick(card)}
    >
      {/* Card Cover */}
      {card.cover?.color && (
        <div 
          className={`w-full rounded-t-xl ${card.cover.size === 'large' ? 'h-16' : 'h-2'}`}
          style={{ backgroundColor: card.cover.color }}
        />
      )}

      <div className="p-2">
        {/* Labels - Small text badges at top */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label, index) => (
              <span
                key={label.id || `label-${index}`}
                className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-normal text-gray-900 line-clamp-3 leading-tight mb-2">
          {card.title}
        </h3>

        {/* Bottom Row - Horizontal layout with icons and members */}
        {(hasDescription || hasComments || hasAttachments || hasChecklists || hasDueDate || assignedMembers.length > 0) && (
          <div className="flex items-center justify-between">
            {/* Left side - Icons */}
            <div className="flex items-center gap-1">
              {/* Due Date */}
              {hasDueDate && card.due_date && (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${formatDueDate(card.due_date).color}`}>
                  <Clock className="h-3 w-3" />
                  <span>{formatDueDate(card.due_date).text}</span>
                </div>
              )}
              
              {/* Description Icon */}
              {hasDescription && (
                <div className="text-gray-400 hover:text-gray-600">
                  <FileText className="h-3 w-3" />
                </div>
              )}

              {/* Comments */}
              {hasComments && (
                <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">{card.comments?.length}</span>
                </div>
              )}

              {/* Attachments */}
              {hasAttachments && (
                <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs">{card.attachments?.length}</span>
                </div>
              )}

              {/* Checklists */}
              {hasChecklists && (
                <div className={`flex items-center gap-1 text-xs ${
                  completedChecklistItems === totalChecklistItems ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <CheckSquare className="h-3 w-3" />
                  <span>{completedChecklistItems}/{totalChecklistItems}</span>
                </div>
              )}
            </div>

            {/* Right side - Members */}
            {assignedMembers.length > 0 && (
              <div className="flex -space-x-1">
                {assignedMembers.slice(0, 3).map((member, index) => (
                  <div
                    key={member?.id || index}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                    title={member?.organization_members.users.full_name}
                  >
                    {member?.organization_members.users.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                  </div>
                ))}
                {assignedMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                    +{assignedMembers.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 