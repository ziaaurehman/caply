import { create } from "zustand"
import type { Project, CreateProjectData } from "@/lib/types"

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  fetchProjects: () => Promise<void>
  addProject: (project: CreateProjectData) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

// Mock data
const mockProjects: Project[] = [
  {
    id: "1",
    organization_id: "1",
    client_id: "1",
    name: "Website Redesign",
    code: "WEB-001",
    description: "Complete overhaul of company website",
    project_type: "time_materials",
    billing_rate: 125,
    budget_hours: 400,
    budget_amount: 50000,
    start_date: "2024-01-01",
    end_date: "2024-03-31",
    status: "active",
    time_tracking_enabled: true,
    visibility: "team",
    created_by: "1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    organization_id: "1",
    name: "Mobile App Development",
    description: "Native iOS and Android app",
    project_type: "fixed_fee",
    budget_hours: 800,
    budget_amount: 120000,
    start_date: "2024-02-15",
    end_date: "2024-06-30",
    status: "active",
    time_tracking_enabled: true,
    visibility: "organization",
    created_by: "1",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
]

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true })
    await new Promise((resolve) => setTimeout(resolve, 500))
    set({ projects: mockProjects, isLoading: false })
  },

  addProject: async (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      organization_id: projectData.organization_id || "1",
      status: 'active',
      time_tracking_enabled: true,
      visibility: projectData.visibility || 'team',
      created_by: "1", // This should come from auth context
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    set((state) => ({
      projects: [...state.projects, newProject],
    }))
  },

  updateProject: async (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) => 
        project.id === id 
          ? { ...project, ...updates, updated_at: new Date().toISOString() } 
          : project
      ),
    }))
  },

  deleteProject: async (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }))
  },
}))
