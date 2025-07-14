interface Project {
  id: string;
  organization_id: string;
  client_id?: string;
  name: string;
  code?: string;
  description?: string;
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable';
  billing_rate?: number;
  budget_hours?: number;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  time_tracking_enabled: boolean;
  visibility: 'admin_only' | 'team' | 'organization';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectData {
  name: string;
  organization_id: string;
  client_id?: string | null;
  code?: string;
  description?: string;
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable';
  billing_rate?: number;
  budget_hours?: number;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  team_member_ids?: string[];
  task_categories?: string[];
  kanban_enabled?: boolean;
  timesheet_enabled?: boolean;
  team_availability_enabled?: boolean;
  capacity_planning_enabled?: boolean;
  state?: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  project_type?: 'time_materials' | 'fixed_fee' | 'non_billable';
  budget_hours?: number;
  budget_amount?: number;
  billing_rate?: number;
  status?: 'active' | 'on_hold' | 'completed' | 'cancelled';
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

// Projects API
export const projectAPI = {
  // Get all projects
  getProjects: async (): Promise<ProjectsResponse> => {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch projects');
    }
    const data = await response.json();
    return { projects: data.projects || [] };
  },

  // Get single project by ID
  getProject: async (id: string): Promise<ProjectResponse> => {
    const response = await fetch(`/api/projects/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch project');
    }
    const data = await response.json();
    return { project: data.project };
  },

  // Create new project
  createProject: async (data: CreateProjectData): Promise<ProjectResponse> => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create project');
    }
    
    const result = await response.json();
    return { project: result.project };
  },

  // Update existing project
  updateProject: async (id: string, data: UpdateProjectData): Promise<ProjectResponse> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update project');
    }
    
    const result = await response.json();
    return { project: result.project };
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete project');
    }
  }
};

export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectsResponse,
  ProjectResponse
};
