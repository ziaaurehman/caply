export interface Task {
  id: string
  title: string
  description: string
  hours: number
  dueDate: string
  assigneeName: string
  assigneeAvatar: string
  progress: number
}

export interface Column {
  id: string
  title: string
  tasks: Task[]
} 