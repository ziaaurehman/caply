"use client"

import { Board } from "./types"

interface BoardSettingsModalProps {
  board: Board
  isOpen: boolean
  onClose: () => void
  onBoardUpdate: (board: Board) => void
}

export default function BoardSettingsModal({ 
  board, 
  isOpen, 
  onClose, 
  onBoardUpdate 
}: BoardSettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Board Settings</h2>
          <p className="text-gray-600 mb-4">Board: {board.name}</p>
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
