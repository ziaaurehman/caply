"use client"

interface Task {
  id: string
  title: string
  description: string
  hours: number
  dueDate: string
  assigneeName: string
  assigneeAvatar: string
  progress: number
}

interface KanbanCardProps {
  task: Task
  onDragStart: (e: React.DragEvent, task: Task) => void
  showUserIcon?: boolean
}

export default function KanbanCard({ task, onDragStart, showUserIcon }: KanbanCardProps) {
  const initials = (task.assigneeName || "").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()

  return (
    <div
      className="bg-white rounded-lg shadow p-3 mb-3 cursor-grab active:cursor-grabbing border border-gray-200 hover:border-blue-400 transition-colors relative"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
    >
      <h3 className="font-medium text-gray-800 mb-1 text-sm leading-tight">{task.title}</h3>
      <p className="text-xs text-gray-600 leading-snug whitespace-pre-line">{task.description}</p>
      {showUserIcon && (
        <div className="absolute bottom-2 right-2">
          <div className="h-7 w-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 border border-white shadow">
            {initials}
          </div>
        </div>
      )}
    </div>
  )
} 