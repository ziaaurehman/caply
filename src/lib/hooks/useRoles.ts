import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, permissionsApi } from "@/utils/api/roles";
import type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
} from "@/lib/types";
import { toast } from "sonner";

// Query Keys Factory
export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (organizationId: string, filters?: RoleFilters) =>
    [...roleKeys.lists(), organizationId, filters] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: string, organizationId: string) =>
    [...roleKeys.details(), id, organizationId] as const,
  permissions: () => ["permissions"] as const,
  permissionsByOrg: (organizationId: string) =>
    [...roleKeys.permissions(), organizationId] as const,
};

export interface RoleFilters {
  page?: number;
  limit?: number;
  search?: string;
}

// Hooks for Roles
export const useRoles = (
  organizationId: string,
  filters?: RoleFilters,
  enabled = true
) => {
  return useQuery({
    queryKey: roleKeys.list(organizationId, filters),
    queryFn: () => rolesApi.getAll(organizationId, filters),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRole = (id: string, organizationId: string, enabled = true) => {
  return useQuery({
    queryKey: roleKeys.detail(id, organizationId),
    queryFn: () => rolesApi.getById(id, organizationId),
    enabled: enabled && !!id && !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const usePermissions = (organizationId: string, enabled = true) => {
  return useQuery({
    queryKey: roleKeys.permissionsByOrg(organizationId),
    queryFn: () => permissionsApi.getAll(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes - permissions change less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Mutation Hooks
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleRequest & { organizationId: string }) =>
      rolesApi.create(data),
    onSuccess: (data, variables) => {
      // Invalidate all roles list queries
      queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
        exact: false,
      });

      // Invalidate team member queries (roles affect team members)
      queryClient.invalidateQueries({
        queryKey: ["teamMembers"],
        exact: false,
      });

      // Optionally add the new role to the cache
      queryClient.setQueryData(
        roleKeys.detail(data.id, variables.organizationId),
        data
      );

      toast.success("Role created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create role");
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoleRequest & { organizationId: string };
    }) => rolesApi.update(id, data),
    onSuccess: (updatedRole, variables) => {
      // Update the specific role in cache
      queryClient.setQueryData(
        roleKeys.detail(variables.id, variables.data.organizationId),
        updatedRole
      );

      // Invalidate all roles list queries
      queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
        exact: false,
      });

      // Invalidate team member queries (role changes affect team members)
      queryClient.invalidateQueries({
        queryKey: ["teamMembers"],
        exact: false,
      });

      toast.success("Role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => rolesApi.delete(id, organizationId),
    onSuccess: (_, variables) => {
      // Remove the role from cache
      queryClient.removeQueries({
        queryKey: roleKeys.detail(variables.id, variables.organizationId),
      });

      // Invalidate all roles list queries
      queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
        exact: false,
      });

      // Invalidate team member queries (role deletion affects team members)
      queryClient.invalidateQueries({
        queryKey: ["teamMembers"],
        exact: false,
      });

      toast.success("Role deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete role");
    },
  });
};

// Utility hooks
export const useRolePermissions = (organizationId: string, enabled = true) => {
  const rolesQuery = useRoles(organizationId, {}, enabled);
  const permissionsQuery = usePermissions(organizationId, enabled);

  return {
    roles: rolesQuery.data?.roles || [],
    permissions:
      permissionsQuery.data?.data || permissionsQuery.data?.permissions || {},
    pagination: rolesQuery.data?.pagination,
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    error: rolesQuery.error || permissionsQuery.error,
    refetch: () => {
      rolesQuery.refetch();
      permissionsQuery.refetch();
    },
  };
};
