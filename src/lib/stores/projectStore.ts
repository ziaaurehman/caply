import { create } from "zustand"
import type { Project, Assignment } from "@/lib/types"

interface ProjectState {
  projects: Project[]
  assignments: Assignment[]
  isLoading: boolean
  fetchProjects: () => Promise<void>
  fetchAssignments: () => Promise<void>
  addProject: (project: Omit<Project, "id">) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>
}

// Mock data
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete overhaul of company website",
    status: "in-progress",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    budget: { hours: 400, cost: 50000 },
    actual: { hours: 280, cost: 35000 },
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Native iOS and Android app",
    status: "planned",
    startDate: "2024-02-15",
    endDate: "2024-06-30",
    budget: { hours: 800, cost: 120000 },
    actual: { hours: 0, cost: 0 },
  },
]

const mockAssignments: Assignment[] = [
  {
    id: "1",
    employeeId: "1",
    projectId: "1",
    hoursPerDay: 6,
    startDate: "2024-01-01",
    endDate: "2024-03-31",
  },
  {
    id: "2",
    employeeId: "2",
    projectId: "1",
    hoursPerDay: 4,
    startDate: "2024-01-15",
    endDate: "2024-03-15",
  },
]

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  assignments: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true })
    await new Promise((resolve) => setTimeout(resolve, 500))
    set({ projects: mockProjects, isLoading: false })
  },

  fetchAssignments: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    set({ assignments: mockAssignments })
  },

  addProject: async (project) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
    }
    set((state) => ({
      projects: [...state.projects, newProject],
    }))
  },

  updateProject: async (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) => (project.id === id ? { ...project, ...updates } : project)),
    }))
  },

  deleteProject: async (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }))
  },

  updateAssignment: async (id, updates) => {
    set((state) => ({
      assignments: state.assignments.map((assignment) =>
        assignment.id === id ? { ...assignment, ...updates } : assignment,
      ),
    }))
  },

  deleteAssignment: async (id) => {
    set((state) => ({
      assignments: state.assignments.filter((assignment) => assignment.id !== id),
    }))
  },
}))
