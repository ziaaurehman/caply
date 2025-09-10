interface Project {
  id: string;
  organization_id: string;
  client_id?: string;
  name: string;
  code?: string;
  description?: string;
  project_type: "time_materials" | "fixed_fee" | "non_billable";
  billing_rate?: number;
  budget_hours?: number;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  status: "active" | "on_hold" | "completed" | "cancelled";
  time_tracking_enabled: boolean;
  kanban_enabled?: boolean;
  timesheet_enabled?: boolean;
  team_availability_enabled?: boolean;
  capacity_planning_enabled?: boolean;
  visibility: "admin_only" | "team" | "organization";
  created_by?: string;
  created_at: string;
  updated_at: string;
  progress?: number;
  progress_details?: {
    totalCards: number;
    completedCards: number;
    inProgressCards: number;
    todoCards: number;
  };
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
  project_type: "time_materials" | "fixed_fee" | "non_billable";
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
  project_type?: "time_materials" | "fixed_fee" | "non_billable";
  budget_hours?: number;
  budget_amount?: number;
  billing_rate?: number;
  status?: "active" | "on_hold" | "completed" | "cancelled";
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
  user_role?: string;
  total_projects?: number;
  access_level?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ProjectResponse {
  project: Project;
}

// Projects API
export const projectAPI = {
  // Get all projects with pagination and search
  getProjects: async (
    organizationId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      capacity_planning_enabled?: boolean;
    }
  ): Promise<ProjectsResponse> => {
    // COMMENTED OUT CACHING/DEDUPLICATION FOR NOW
    // const { deduplicateRequest, createRequestKey } = await import(
    //   "@/utils/requestDeduplication"
    // );

    let url = "/api/projects";

    // Use the capacity-specific endpoint if filtering by capacity planning
    if (params?.capacity_planning_enabled) {
      url = "/api/capacity/projects";
    }

    const requestParams = {
      organizationId,
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.search && { search: params.search }),
      ...(params?.status && { status: params.status }),
      ...(params?.capacity_planning_enabled && {
        capacity_planning_enabled: "true",
      }),
    };

    // COMMENTED OUT CACHING/DEDUPLICATION FOR NOW
    // const requestKey = createRequestKey(url, requestParams);

    // COMMENTED OUT CACHING/DEDUPLICATION FOR NOW
    // return deduplicateRequest(requestKey, async () => {
    const searchParams = new URLSearchParams(requestParams);
    const fullUrl = `${url}?${searchParams.toString()}`;

    const response = await fetch(fullUrl, {
      headers: {
        "x-organization-id": organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch projects");
    }
    return await response.json();
    // });
  },

  // Get single project by ID
  getProject: async (
    id: string,
    organizationId: string
  ): Promise<ProjectResponse> => {
    const { deduplicateRequest, createRequestKey } = await import(
      "@/utils/requestDeduplication"
    );

    const requestKey = createRequestKey(`/api/projects/${id}`, {
      organizationId,
    });

    return deduplicateRequest(requestKey, async () => {
      const response = await fetch(
        `/api/projects/${id}?organizationId=${organizationId}`,
        {
          headers: {
            "x-organization-id": organizationId,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch project");
      }
      const data = await response.json();
      return { project: data.project };
    });
  },

  // Create new project
  createProject: async (data: CreateProjectData): Promise<ProjectResponse> => {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": data.organization_id,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create project");
    }

    const result = await response.json();
    return { project: result.project };
  },

  // Update existing project
  updateProject: async (
    id: string,
    data: UpdateProjectData & { organizationId: string }
  ): Promise<ProjectResponse> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": data.organizationId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update project");
    }

    const result = await response.json();
    return { project: result.project };
  },

  // Delete project
  deleteProject: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(
      `/api/projects/${id}?organizationId=${organizationId}`,
      {
        method: "DELETE",
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete project");
    }
  },

  // ===== PROJECT DOCUMENTS =====

  // Get project documents
  getProjectDocuments: async (
    projectId: string,
    organizationId: string
  ): Promise<ProjectDocumentsResponse> => {
    const response = await fetch(
      `/api/projects/${projectId}/documents?organizationId=${organizationId}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch project documents");
    }
    const data = await response.json();
    return { documents: data.documents || [] };
  },

  // Upload project document
  uploadProjectDocument: async (
    data: CreateProjectDocumentData
  ): Promise<ProjectDocumentResponse> => {
    const formData = new FormData();
    formData.append("file", data.file);
    // Note: Don't append organizationId to formData since it's in headers

    const response = await fetch(`/api/projects/${data.projectId}/documents`, {
      method: "POST",
      headers: {
        "x-organization-id": data.organizationId,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload document");
    }
    const result = await response.json();
    return { document: result.document };
  },

  // Get project document download URL
  getProjectDocumentDownload: async (
    projectId: string,
    documentId: string,
    organizationId: string
  ): Promise<ProjectDocumentDownloadResponse> => {
    const response = await fetch(
      `/api/projects/${projectId}/documents/${documentId}`,
      {
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get document");
    }
    return await response.json();
  },

  // Delete project document
  deleteProjectDocument: async (
    projectId: string,
    documentId: string,
    organizationId: string
  ): Promise<void> => {
    const response = await fetch(
      `/api/projects/${projectId}/documents/${documentId}`,
      {
        method: "DELETE",
        headers: {
          "x-organization-id": organizationId,
        },
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete document");
    }
  },

  // ===== PROJECT PROGRESS =====

  // Get progress for multiple projects
  getProjectsProgress: async (
    projectIds: string[]
  ): Promise<{
    progress: Array<{
      projectId: string;
      progress: number;
      totalCards: number;
      completedCards: number;
      inProgressCards: number;
      todoCards: number;
    }>;
  }> => {
    const response = await fetch("/api/projects/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch project progress");
    }

    return await response.json();
  },
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
  ProjectDocumentDownloadResponse,
};
