import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

// Query Keys Factory
export const permissionKeys = {
  all: ["permissions"] as const,
  user: (userId: string, organizationId: string) =>
    [...permissionKeys.all, "user", userId, organizationId] as const,
  context: (userId: string, organizationId: string) =>
    [...permissionKeys.all, "context", userId, organizationId] as const,
};

// Hook to get user permissions with caching
export function useUserPermissions(organizationId?: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: permissionKeys.user(userId || "", organizationId || ""),
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const response = await fetch(
        `/api/users/${userId}/permissions?organizationId=${organizationId}`
      );
      if (!response.ok) throw new Error("Failed to fetch permissions");
      return response.json();
    },
    enabled: !!userId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// Hook to get organization context with caching
export function useOrganizationContext(organizationId?: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: permissionKeys.context(userId || "", organizationId || ""),
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const response = await fetch(
        `/api/context/organization?organizationId=${organizationId}&includePermissions=true`
      );
      if (!response.ok) throw new Error("Failed to fetch context");
      return response.json();
    },
    enabled: !!userId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
