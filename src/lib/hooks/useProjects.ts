import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { projectAPI } from "@/utils/api/project";
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectsResponse,
  ProjectResponse,
  ProjectDocument,
  CreateProjectDocumentData,
  ProjectDocumentsResponse,
  ProjectDocumentResponse,
  ProjectDocumentDownloadResponse,
} from "@/utils/api/project";

// Query Keys Factory
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (organizationId: string, filters?: ProjectFilters) =>
    [...projectKeys.lists(), organizationId, filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string, organizationId: string) =>
    [...projectKeys.details(), id, organizationId] as const,
  progress: () => [...projectKeys.all, "progress"] as const,
  progressByProjects: (projectIds: string[]) =>
    [...projectKeys.progress(), projectIds] as const,
  documents: () => [...projectKeys.all, "documents"] as const,
  documentsByProject: (projectId: string, organizationId: string) =>
    [...projectKeys.documents(), projectId, organizationId] as const,
  capacity: () => [...projectKeys.all, "capacity"] as const,
  capacityAll: (organizationId: string) =>
    [...projectKeys.capacity(), "all", organizationId] as const,
};

// Types for filters
export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  capacity_planning_enabled?: boolean;
}

// ===== PROJECTS LIST =====

export function useProjects(
  organizationId: string,
  filters: ProjectFilters = {}
) {
  return useQuery({
    queryKey: projectKeys.list(organizationId, filters),
    queryFn: () => projectAPI.getProjects(organizationId, filters),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== SINGLE PROJECT =====

export function useProject(projectId: string, organizationId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId, organizationId),
    queryFn: () => projectAPI.getProject(projectId, organizationId),
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== PROJECT PROGRESS =====

export function useProjectsProgress(projectIds: string[]) {
  return useQuery({
    queryKey: projectKeys.progressByProjects(projectIds),
    queryFn: () => projectAPI.getProjectsProgress(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
}

// ===== CAPACITY PROJECTS =====

export function useAllCapacityProjects(organizationId: string) {
  return useQuery({
    queryKey: projectKeys.capacityAll(organizationId),
    queryFn: () => projectAPI.getAllCapacityProjects(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== PROJECT DOCUMENTS =====

export function useProjectDocuments(projectId: string, organizationId: string) {
  return useQuery({
    queryKey: projectKeys.documentsByProject(projectId, organizationId),
    queryFn: () => projectAPI.getProjectDocuments(projectId, organizationId),
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== MUTATIONS =====

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectData) => projectAPI.createProject(data),
    onSuccess: (data, variables) => {
      // Invalidate projects list for the organization
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
        predicate: (query) => {
          const [, , organizationId] = query.queryKey;
          return organizationId === variables.organization_id;
        },
      });

      // Add the new project to cache
      queryClient.setQueryData(
        projectKeys.detail(data.project.id, variables.organization_id),
        data
      );

      // Invalidate capacity projects if applicable
      queryClient.invalidateQueries({
        queryKey: projectKeys.capacityAll(variables.organization_id),
      });
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectData & { organizationId: string };
    }) => projectAPI.updateProject(id, data),
    onSuccess: (data, variables) => {
      const { id, data: updateData } = variables;

      // Update the specific project in cache
      queryClient.setQueryData(
        projectKeys.detail(id, updateData.organizationId),
        data
      );

      // Invalidate projects list to reflect changes
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
        predicate: (query) => {
          const [, , organizationId] = query.queryKey;
          return organizationId === updateData.organizationId;
        },
      });

      // Invalidate capacity projects if applicable
      queryClient.invalidateQueries({
        queryKey: projectKeys.capacityAll(updateData.organizationId),
      });
    },
    onError: (error) => {
      console.error("Failed to update project:", error);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => projectAPI.deleteProject(id, organizationId),
    onSuccess: (_, variables) => {
      const { id, organizationId } = variables;

      // Remove the project from cache
      queryClient.removeQueries({
        queryKey: projectKeys.detail(id, organizationId),
      });

      // Invalidate projects list
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
        predicate: (query) => {
          const [, , orgId] = query.queryKey;
          return orgId === organizationId;
        },
      });

      // Invalidate capacity projects
      queryClient.invalidateQueries({
        queryKey: projectKeys.capacityAll(organizationId),
      });

      // Invalidate progress queries that might include this project
      queryClient.invalidateQueries({
        queryKey: projectKeys.progress(),
      });
    },
    onError: (error) => {
      console.error("Failed to delete project:", error);
    },
  });
}

// ===== DOCUMENT MUTATIONS =====

export function useUploadProjectDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDocumentData) =>
      projectAPI.uploadProjectDocument(data),
    onSuccess: (data, variables) => {
      // Invalidate project documents
      queryClient.invalidateQueries({
        queryKey: projectKeys.documentsByProject(
          variables.projectId,
          variables.organizationId
        ),
      });
    },
    onError: (error) => {
      console.error("Failed to upload document:", error);
    },
  });
}

export function useDeleteProjectDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      documentId,
      organizationId,
    }: {
      projectId: string;
      documentId: string;
      organizationId: string;
    }) =>
      projectAPI.deleteProjectDocument(projectId, documentId, organizationId),
    onSuccess: (_, variables) => {
      // Invalidate project documents
      queryClient.invalidateQueries({
        queryKey: projectKeys.documentsByProject(
          variables.projectId,
          variables.organizationId
        ),
      });
    },
    onError: (error) => {
      console.error("Failed to delete document:", error);
    },
  });
}

// ===== UTILITY HOOKS =====

export function useProjectDocumentDownload() {
  return useMutation({
    mutationFn: ({
      projectId,
      documentId,
      organizationId,
    }: {
      projectId: string;
      documentId: string;
      organizationId: string;
    }) =>
      projectAPI.getProjectDocumentDownload(
        projectId,
        documentId,
        organizationId
      ),
    onError: (error) => {
      console.error("Failed to get document download URL:", error);
    },
  });
}

// ===== PREFETCH UTILITIES =====

export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (projectId: string, organizationId: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId, organizationId),
      queryFn: () => projectAPI.getProject(projectId, organizationId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export function usePrefetchProjectDocuments() {
  const queryClient = useQueryClient();

  return (projectId: string, organizationId: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.documentsByProject(projectId, organizationId),
      queryFn: () => projectAPI.getProjectDocuments(projectId, organizationId),
      staleTime: 5 * 60 * 1000,
    });
  };
}
