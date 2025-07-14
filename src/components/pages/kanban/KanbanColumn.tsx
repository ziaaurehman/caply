"use client"

import { Plus } from "lucide-react"
import KanbanCard from "./KanbanCard"
import { Task, Column } from "./types"

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  onDragStart: (e: React.DragEvent, task: Task) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
  onAddTask: (columnId: string) => void
}

export default function KanbanColumn({ column, tasks, onDragStart, onDragOver, onDrop, onAddTask }: KanbanColumnProps) {
  return (
    <div
      className="flex-shrink-0 w-80 bg-white rounded-xl shadow-md p-4 flex flex-col min-h-[350px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="flex items-center mb-4">
        <button
          onClick={() => onAddTask(column.id)}
          className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-100 mr-2"
          aria-label={`Add card to ${column.title}`}
        >
          <Plus className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-gray-800 text-base truncate flex-1">
          {column.title}
        </h2>
      </div>
      <div className="flex-grow overflow-y-auto pr-1 -mr-1 mb-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onDragStart={onDragStart} showUserIcon />
        ))}
      </div>
    </div>
  )
} 