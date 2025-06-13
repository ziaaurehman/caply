export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee"
  avatar?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  position: string
  department: string
  capacityHours: number
  availability: "full-time" | "part-time" | "contractor"
  avatar?: string
  startDate: string
  skills: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  status: "planned" | "in-progress" | "completed" | "on-hold"
  startDate: string
  endDate: string
  budget: {
    hours: number
    cost: number
  }
  actual: {
    hours: number
    cost: number
  }
  clientId?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  assignedTo: string[]
  projectId: string
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
}

export interface Assignment {
  id: string
  employeeId: string
  projectId: string
  hoursPerDay: number
  startDate: string
  endDate: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  type: "vacation" | "sick-leave" | "personal" | "unpaid-leave" | "other"
  startDate: string
  endDate: string
  status: "pending" | "approved" | "rejected"
  comment?: string
}

export interface TimesheetEntry {
  id: string
  employeeId: string
  projectId: string
  taskId?: string
  date: string
  hours: number
  description: string
  status: "draft" | "submitted" | "approved"
}
