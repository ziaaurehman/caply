import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  status: string;
  hourly_rate?: number;
  weekly_capacity?: number;
  department?: string;
  hire_date?: string;
  joined_at: string;
  role: {
    id: string;
    name: string;
    display_name: string;
    description: string;
    permissions: Array<{
      resource: string;
      action: string;
    }>;
  };
}

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  role: string;
  is_owner: boolean;
}

interface OrganizationContext {
  id: string;
  membership: OrganizationMember;
}

interface UserPermissions {
  [key: string]: boolean;
}

interface OrganizationStore {
  // State
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  organizationContext: OrganizationContext | null;
  permissions: UserPermissions;
  loading: boolean;
  error: string | null;

  // Cache metadata
  lastFetch: number | null;
  cacheValid: boolean;
  cachedUserId: string | null; // Track which user the cache belongs to

  // API actions
  fetchUserOrganizations: (userId?: string) => Promise<void>;
  fetchOrganizationContext: (
    organizationId: string,
    includePermissions?: boolean
  ) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  clearOrganizationData: () => void;

  // Performance optimizations
  warmCaches: () => Promise<void>;
  prefetchOrganization: (organizationId: string) => Promise<void>;

  // Cache helper (internal)
  isCacheValid: () => boolean;

  // State refresh methods
  refreshUserOrganizations: (userId?: string) => Promise<void>;
  invalidateCache: () => void;
  handleInvitationAccepted: (organizationId: string) => Promise<void>;

  // Permission helpers
  hasPermission: (resource: string, action: string) => boolean;
  getUserPermissions: () => Array<{ resource: string; action: string }>;
  hasRole: (roleName: string) => boolean;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for organizations (they rarely change)
const REQUEST_DEDUPE_WINDOW = 5 * 1000; // 5 seconds to prevent duplicate requests

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrganization: null,
      userOrganizations: [],
      organizationContext: null,
      permissions: {},
      loading: false,
      error: null,
      lastFetch: null,
      cacheValid: false,
      cachedUserId: null,

      // Cache helper (internal)
      isCacheValid: (currentUserId?: string) => {
        const { lastFetch, cachedUserId } = get();
        if (!lastFetch) return false;

        // If userId is provided, check if cache belongs to this user
        if (currentUserId && cachedUserId !== currentUserId) {
          // Cache is for a different user, invalidate it
          set({
            cacheValid: false,
            lastFetch: null,
            cachedUserId: null,
            userOrganizations: [],
          });
          return false;
        }

        return Date.now() - lastFetch < CACHE_DURATION;
      },

      // Fetch user organizations (lightweight with request deduplication)
      fetchUserOrganizations: async (userId?: string) => {
        const { isCacheValid, loading, lastFetch } = get();

        // Get current user ID from session if not provided
        if (!userId && typeof window !== "undefined") {
          // Try to get from NextAuth session
          try {
            const { useSession } = await import("next-auth/react");
            // We can't use hooks here, so we'll fetch fresh data if userId is not provided
            // This ensures we always get data for the current user
          } catch (e) {
            // Ignore
          }
        }

        // Return cached data if valid AND belongs to current user
        if (
          userId &&
          isCacheValid(userId) &&
          get().userOrganizations.length > 0
        ) {
          return;
        }

        // If no userId provided or cache invalid, clear cache to force fresh fetch
        if (!userId || !isCacheValid(userId)) {
          set({ cacheValid: false, lastFetch: null });
        }

        // Prevent duplicate requests within 5 seconds
        if (
          loading ||
          (lastFetch && Date.now() - lastFetch < REQUEST_DEDUPE_WINDOW)
        ) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await fetch(
            "/api/context/organization?includeOrganizations=true",
            {
              headers: {
                "Cache-Control": "max-age=300", // 5 minute browser cache
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch organizations: ${response.status}`
            );
          }

          const data = await response.json();
          const organizations = data.organizations || [];

          // Get current user ID from the API response
          const currentUserId = data.userId || userId || null;

          set({
            userOrganizations: organizations,
            lastFetch: Date.now(),
            cacheValid: true,
            cachedUserId: currentUserId, // Store which user this cache belongs to
            loading: false,
            error: null,
          });

          // Automatically set current organization if not set and we have a saved preference
          const { currentOrganization } = get();
          if (!currentOrganization && organizations.length > 0) {
            const savedOrgId =
              typeof window !== "undefined"
                ? localStorage.getItem("selectedOrganizationId")
                : null;

            const orgToSet = savedOrgId
              ? organizations.find(
                  (org: Organization) => org.id === savedOrgId
                ) || organizations[0]
              : organizations[0];

            set({ currentOrganization: orgToSet });
          }
        } catch (error) {
          console.error("Error fetching organizations:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch organizations",
            loading: false,
          });
        }
      },

      // Fetch organization context with permissions
      fetchOrganizationContext: async (
        organizationId: string,
        includePermissions = true
      ) => {
        const { loading, organizationContext } = get();
        // Don't fetch if we already have context for this organization
        if (organizationContext?.id === organizationId) {
          console.log(
            "Organization context already loaded for:",
            organizationId
          );
          return;
        }
        // Prevent multiple simultaneous requests
        if (loading) {
          console.log("Another request is already loading, skipping duplicate");
          return;
        }
        set({ loading: true, error: null });

        try {
          const params = new URLSearchParams({
            organizationId,
            includePermissions: includePermissions.toString(),
          });

          const response = await fetch(`/api/context/organization?${params}`);

          if (!response.ok) {
            throw new Error("Failed to fetch organization context");
          }

          const data = await response.json();

          set({
            organizationContext: data.currentOrganization || null,
            permissions: data.permissions || {},
            loading: false,
          });
        } catch (error) {
          console.error("Error fetching organization context:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch organization context",
            loading: false,
          });
        }
      },

      // Switch organization (optimized with instant UI updates)
      switchOrganization: async (organizationId: string) => {
        const { userOrganizations, currentOrganization } = get();

        // No-op if already selected
        if (currentOrganization?.id === organizationId) {
          return;
        }

        // Find the organization in the cached list
        const newOrg = userOrganizations.find(
          (org) => org.id === organizationId
        );
        if (!newOrg) {
          set({ error: "Organization not found in cache" });
          return;
        }

        // Optimistically update UI immediately for instant switching
        set({
          currentOrganization: newOrg,
          error: null,
          // Keep permissions temporarily to avoid flicker
          permissions: {},
        });

        // Store selection immediately for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedOrganizationId", organizationId);
        }

        // Fetch fresh context for the new organization in background
        try {
          await get().fetchOrganizationContext(organizationId);
        } catch (error) {
          console.error(
            "Error fetching organization context after switch:",
            error
          );
          // Don't revert the organization switch, just log the error
          set({ error: "Failed to load organization permissions" });
        }
      },

      // Clear all organization data
      clearOrganizationData: () => {
        set({
          currentOrganization: null,
          userOrganizations: [],
          organizationContext: null,
          permissions: {},
          loading: false,
          error: null,
          lastFetch: null,
          cacheValid: false,
          cachedUserId: null, // Clear cached user ID
        });

        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedOrganizationId");
        }
      },

      // Performance optimizations
      warmCaches: async () => {
        const { userOrganizations } = get();

        // Prefetch context for the first 3 organizations (most likely to be used)
        const organizationsToWarm = userOrganizations.slice(0, 3);

        organizationsToWarm.forEach((org: Organization) => {
          // Fire and forget - don't await
          get().prefetchOrganization(org.id);
        });
      },

      prefetchOrganization: async (organizationId: string) => {
        try {
          // Use the API to warm the cache
          await fetch(
            `/api/context/organization?organizationId=${organizationId}&includePermissions=true`,
            {
              headers: {
                "Cache-Control": "max-age=300",
              },
            }
          );
        } catch (error) {
          // Silent fail for prefetching
          console.debug(
            "Prefetch failed for organization:",
            organizationId,
            error
          );
        }
      },

      // Permission helpers
      hasPermission: (resource: string, action: string) => {
        const { permissions } = get();
        return permissions[`${resource}:${action}`] || false;
      },

      // Get current user's permissions in the current organization
      getUserPermissions: () => {
        const { organizationContext } = get();
        return organizationContext?.membership?.role?.permissions || [];
      },

      // Check if user has a specific role
      hasRole: (roleName: string) => {
        const { organizationContext } = get();
        return organizationContext?.membership?.role?.name === roleName;
      },

      // State refresh methods
      refreshUserOrganizations: async (userId?: string) => {
        const { fetchUserOrganizations } = get();
        // Force refresh by clearing cache validity
        set({ cacheValid: false, lastFetch: null, cachedUserId: null });
        await fetchUserOrganizations(userId);
      },

      invalidateCache: () => {
        set({
          cacheValid: false,
          lastFetch: null,
          cachedUserId: null,
          loading: false,
          error: null,
        });
      },

      handleInvitationAccepted: async (organizationId: string) => {
        const {
          refreshUserOrganizations,
          switchOrganization,
          userOrganizations,
        } = get();

        try {
          // Force refresh organizations list to include the new organization
          console.log("Refreshing user organizations...");
          set({ cacheValid: false, lastFetch: null });
          await refreshUserOrganizations();

          // Get updated organizations
          const { userOrganizations: updatedOrgs } = get();
          console.log("Updated organizations:", updatedOrgs.length);

          // If this is the user's first organization, switch to it
          if (updatedOrgs.length === 1 && !get().currentOrganization) {
            console.log("Switching to first organization:", organizationId);
            await switchOrganization(organizationId);
          } else if (updatedOrgs.length > 1) {
            // If user has multiple organizations, switch to the newly accepted one
            console.log(
              "Switching to newly accepted organization:",
              organizationId
            );
            await switchOrganization(organizationId);
          }
        } catch (error) {
          console.error("Error handling invitation acceptance:", error);
        }
      },
    }),
    {
      name: "organization-store",
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        userOrganizations: state.userOrganizations,
        lastFetch: state.lastFetch,
        cacheValid: state.cacheValid,
        cachedUserId: state.cachedUserId, // Persist cached user ID
      }),
    }
  )
);

// Optimized hooks for common use cases
export const useCurrentOrganization = () => {
  const currentOrganization = useOrganizationStore(
    (state) => state.currentOrganization
  );
  const loading = useOrganizationStore((state) => state.loading);
  return { currentOrganization, loading };
};

export const useOrganizationPermissions = () => {
  const permissions = useOrganizationStore((state) => state.permissions);
  const hasPermission = useOrganizationStore((state) => state.hasPermission);

  return { permissions, hasPermission };
};

export const useOrganizationContext = () => {
  const context = useOrganizationStore((state) => state.organizationContext);
  const loading = useOrganizationStore((state) => state.loading);
  const error = useOrganizationStore((state) => state.error);

  return { context, loading, error };
};
