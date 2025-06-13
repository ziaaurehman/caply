import { create } from "zustand"
import type { Employee } from "@/lib/types"

interface EmployeeState {
  employees: Employee[]
  isLoading: boolean
  fetchEmployees: () => Promise<void>
  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
}

// Mock data
const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    position: "Senior Developer",
    department: "Engineering",
    capacityHours: 40,
    availability: "full-time",
    startDate: "2023-01-15",
    skills: ["React", "TypeScript", "Node.js"],
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    position: "UX Designer",
    department: "Design",
    capacityHours: 35,
    availability: "full-time",
    startDate: "2023-02-01",
    skills: ["Figma", "Adobe Creative Suite", "User Research"],
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    position: "Project Manager",
    department: "Operations",
    capacityHours: 40,
    availability: "full-time",
    startDate: "2022-11-10",
    skills: ["Agile", "Scrum", "Risk Management"],
  },
]

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: false,

  fetchEmployees: async () => {
    set({ isLoading: true })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    set({ employees: mockEmployees, isLoading: false })
  },

  addEmployee: async (employee) => {
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
    }
    set((state) => ({
      employees: [...state.employees, newEmployee],
    }))
  },

  updateEmployee: async (id, updates) => {
    set((state) => ({
      employees: state.employees.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)),
    }))
  },

  deleteEmployee: async (id) => {
    set((state) => ({
      employees: state.employees.filter((emp) => emp.id !== id),
    }))
  },
}))
