import { create } from "zustand"
import type { Employee } from "@/lib/types"

interface EmployeeState {
  employees: Employee[]
  isLoading: boolean
  error: string | null
  fetchEmployees: () => Promise<void>
  getEmployeeById: (id: string) => Employee | undefined
  addEmployee: (employee: Omit<Employee, "id">) => Promise<Employee>
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<Employee>
  deleteEmployee: (id: string) => Promise<void>
}

// Mock data
const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    position: "Frontend Developer",
    department: "Engineering",
    capacityHours: 40,
    availability: "full-time",
    startDate: "2022-01-15",
    skills: ["React", "TypeScript", "CSS"],
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    position: "UX Designer",
    department: "Design",
    capacityHours: 40,
    availability: "full-time",
    avatar: "/avatars/jane-smith.jpg",
    startDate: "2021-11-01",
    skills: ["Figma", "UI Design", "User Research"],
  },
  {
    id: "3",
    name: "Michael Johnson",
    email: "michael.johnson@example.com",
    position: "Backend Developer",
    department: "Engineering",
    capacityHours: 30,
    availability: "part-time",
    startDate: "2023-02-10",
    skills: ["Node.js", "PostgreSQL", "API Design"],
  },
]

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))
      set({ employees: mockEmployees, isLoading: false })
    } catch (error) {
      set({ error: "Failed to fetch employees", isLoading: false })
    }
  },

  getEmployeeById: (id) => {
    return get().employees.find(employee => employee.id === id)
  },

  addEmployee: async (employee) => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const newEmployee: Employee = {
        ...employee,
        id: (get().employees.length + 1).toString(),
      }
      
      set((state) => ({
        employees: [...state.employees, newEmployee],
        isLoading: false,
      }))
      
      return newEmployee
    } catch (error) {
      set({ error: "Failed to add employee", isLoading: false })
      throw error
    }
  },

  updateEmployee: async (id, employeeData) => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const updatedEmployees = get().employees.map((employee) =>
        employee.id === id ? { ...employee, ...employeeData } : employee
      )
      
      set({ employees: updatedEmployees, isLoading: false })
      
      const updatedEmployee = updatedEmployees.find((employee) => employee.id === id)
      if (!updatedEmployee) {
        throw new Error("Employee not found")
      }
      
      return updatedEmployee
    } catch (error) {
      set({ error: "Failed to update employee", isLoading: false })
      throw error
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const updatedEmployees = get().employees.filter((employee) => employee.id !== id)
      set({ employees: updatedEmployees, isLoading: false })
    } catch (error) {
      set({ error: "Failed to delete employee", isLoading: false })
      throw error
    }
  },
}))
