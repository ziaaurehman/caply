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
  kanban_enabled?: boolean;
  timesheet_enabled?: boolean;
  team_availability_enabled?: boolean;
  capacity_planning_enabled?: boolean;
  visibility: 'admin_only' | 'team' | 'organization';
  created_by?: string;
  created_at: string;
  updated_at: string;
  project_members?: Array<{
    id: string;
    organization_member_id: string;
    role: string;
    joined_at: string;
    organization_members: {
      id: string;
      user_id: string;
      users: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
      };
    };
  }>;
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

interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface CreateProjectDocumentData {
  projectId: string;
  file: File;
  organizationId: string;
}

interface ProjectDocumentsResponse {
  documents: ProjectDocument[];
}

interface ProjectDocumentResponse {
  document: ProjectDocument;
}

interface ProjectDocumentDownloadResponse {
  document: ProjectDocument;
  download_url: string;
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
  getProjects: async (organizationId: string, filters?: { capacity_planning_enabled?: boolean }): Promise<ProjectsResponse> => {
    let url = '/api/projects';
    
    // Use the capacity-specific endpoint if filtering by capacity planning
    if (filters?.capacity_planning_enabled) {
      url = '/api/capacity/projects';
    }
    
    // Add organization ID as query parameter
    url += `?organizationId=${organizationId}`;
    
    const response = await fetch(url, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch projects');
    }
    const data = await response.json();
    return { projects: data.projects || [] };
  },

  // Get single project by ID
  getProject: async (id: string, organizationId: string): Promise<ProjectResponse> => {
    const response = await fetch(`/api/projects/${id}?organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
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
        'Content-Type': 'application/json',
        'x-organization-id': data.organization_id,
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
  updateProject: async (id: string, data: UpdateProjectData & { organizationId: string }): Promise<ProjectResponse> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
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
  deleteProject: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/projects/${id}?organizationId=${organizationId}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete project');
    }
  },

  // ===== PROJECT DOCUMENTS =====

  // Get project documents
  getProjectDocuments: async (projectId: string, organizationId: string): Promise<ProjectDocumentsResponse> => {
    const response = await fetch(`/api/projects/${projectId}/documents?organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch project documents');
    }
    const data = await response.json();
    return { documents: data.documents || [] };
  },

  // Upload project document
  uploadProjectDocument: async (data: CreateProjectDocumentData): Promise<ProjectDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('organizationId', data.organizationId);

    const response = await fetch(`/api/projects/${data.projectId}/documents`, {
      method: 'POST',
      headers: {
        'x-organization-id': data.organizationId,
      },
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload document');
    }
    const result = await response.json();
    return { document: result.document };
  },

  // Get project document download URL
  getProjectDocumentDownload: async (projectId: string, documentId: string, organizationId: string): Promise<ProjectDocumentDownloadResponse> => {
    const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get document');
    }
    return await response.json();
  },

  // Delete project document
  deleteProjectDocument: async (projectId: string, documentId: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete document');
    }
  }
};

export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectDocument,
  CreateProjectDocumentData,
  ProjectsResponse,
  ProjectResponse,
  ProjectDocumentsResponse,
  ProjectDocumentResponse,
  ProjectDocumentDownloadResponse
};
