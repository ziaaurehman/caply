"use client"

import { Card, ProjectMember } from "./types"

interface CardDetailModalProps {
  card: Card
  isOpen: boolean
  onClose: () => void
  projectMembers: ProjectMember[]
  boardId?: string
  onCardUpdate: () => void
}

export default function CardDetailModal({ 
  card, 
  isOpen, 
  onClose, 
  projectMembers, 
  boardId, 
  onCardUpdate 
}: CardDetailModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{card.title}</h2>
          <p className="text-gray-600 mb-4">{card.description}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
