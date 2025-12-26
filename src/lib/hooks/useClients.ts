import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientAPI } from "@/utils/api/client";
import type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientsResponse,
  ClientResponse,
} from "@/utils/api/client";

// Query Keys Factory
export const clientKeys = {
  all: ["clients"] as const,
  lists: () => [...clientKeys.all, "list"] as const,
  list: (organizationId: string) =>
    [...clientKeys.lists(), organizationId] as const,
  details: () => [...clientKeys.all, "detail"] as const,
  detail: (id: string, organizationId: string) =>
    [...clientKeys.details(), id, organizationId] as const,
  projects: (clientId: string, organizationId: string) =>
    [...clientKeys.detail(clientId, organizationId), "projects"] as const,
};

// ===== CLIENTS LIST =====

export function useClients(organizationId: string) {
  return useQuery({
    queryKey: clientKeys.list(organizationId),
    queryFn: () => clientAPI.getClients(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===== SINGLE CLIENT =====

export function useClient(clientId: string, organizationId: string) {
  return useQuery({
    queryKey: clientKeys.detail(clientId, organizationId),
    queryFn: () => clientAPI.getClient(clientId, organizationId),
    enabled: !!clientId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ====== Client All Projects
export function useClientProjects(clientId: string, organizationId: string) {
  return useQuery({
    queryKey: clientKeys.projects(clientId, organizationId),
    queryFn: () => clientAPI.ClientProjects(clientId, organizationId),
    enabled: !!clientId && !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ===== MUTATIONS =====

export function useCreateClient(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientData & { organizationId: string }) =>
      clientAPI.createClient(data),
    onSuccess: (data) => {
      // Invalidate all clients list queries
      queryClient.invalidateQueries({
        queryKey: clientKeys.lists(),
        exact: false,
      });

      // Add the new client to cache
      queryClient.setQueryData(
        clientKeys.detail(data.client.id, organizationId),
        data
      );
    },
    onError: (error) => {
      console.error("Failed to create client:", error);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateClientData & { organizationId: string };
    }) => clientAPI.updateClient(id, data),
    onSuccess: (data, variables) => {
      const { id, data: updateData } = variables;

      // Update the specific client in cache
      queryClient.setQueryData(
        clientKeys.detail(id, updateData.organizationId),
        data
      );

      // Invalidate all clients list queries
      queryClient.invalidateQueries({
        queryKey: clientKeys.lists(),
        exact: false,
      });

      // Invalidate all client details queries
      queryClient.invalidateQueries({
        queryKey: clientKeys.details(),
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to update client:", error);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => clientAPI.deleteClient(id, organizationId),
    onSuccess: (_, variables) => {
      const { id, organizationId } = variables;

      // Remove the client from cache
      queryClient.removeQueries({
        queryKey: clientKeys.detail(id, organizationId),
      });

      // Invalidate all clients list queries
      queryClient.invalidateQueries({
        queryKey: clientKeys.lists(),
        exact: false,
      });

      // Invalidate project queries (projects are related to clients)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to delete client:", error);
    },
  });
}
