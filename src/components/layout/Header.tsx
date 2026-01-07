"use client";

import {
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
  useCallback,
} from "react";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal";
import {
  useOrganizationStore,
  useCurrentOrganization,
} from "@/lib/stores/organizationStore";
import { performLogout } from "@/utils/logout";
import GlobalSearch from "./GlobalSearch";

interface HeaderProps {
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function Header({
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const { openSubscriptionModal } = useSubscriptionModal();

  // Use optimized store hooks
  const { currentOrganization, loading } = useCurrentOrganization();
  const {
    userOrganizations,
    fetchUserOrganizations,
    switchOrganization,
    clearOrganizationData,
    fetchOrganizationContext,
    warmCaches,
    refreshUserOrganizations,
    handleInvitationAccepted,
    cachedUserId,
  } = useOrganizationStore();

  // Effect 1: Sync session state and fetch initial data
  useEffect(() => {
    if (!session?.user?.id) {
      // Clear organization data if user is not logged in
      clearOrganizationData();
      return;
    }

    const initializeData = async () => {
      // Check if cached data belongs to a different user and clear it
      const { cachedUserId } = useOrganizationStore.getState();
      if (cachedUserId && cachedUserId !== session.user.id) {
        console.log("User changed, clearing organization cache");
        clearOrganizationData();
      }

      // First, fetch organizations (lightweight) - pass userId to ensure cache belongs to this user
      await fetchUserOrganizations(session.user.id);

      // Warm caches for likely organizations in background
      warmCaches();

      // Fetch context for selected organization if it exists in localStorage
      const selectedOrgId =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedOrganizationId")
          : null;

      if (selectedOrgId) {
        await fetchOrganizationContext(selectedOrgId);
      }
    };

    initializeData();
  }, [
    session?.user?.id,
    fetchUserOrganizations,
    fetchOrganizationContext,
    warmCaches,
    clearOrganizationData,
  ]);

  // Effect 2: Auto-select organization if none selected
  useEffect(() => {
    if (!session?.user?.id) return;

    if (userOrganizations.length > 0 && !currentOrganization && !loading) {
      // Auto-select first organization and fetch its context
      switchOrganization(userOrganizations[0].id);
    }
  }, [
    session?.user?.id,
    userOrganizations,
    currentOrganization,
    loading,
    switchOrganization,
  ]);

  // Listen for invitation acceptance events and refresh organization data
  useEffect(() => {
    if (!session?.user?.id) return;

    const handleInvitationAccepted = (event: CustomEvent) => {
      const { organizationId } = event.detail;
      if (organizationId) {
        // Refresh organization data when invitation is accepted
        refreshUserOrganizations();
      }
    };

    // Listen for custom events from invitation acceptance
    window.addEventListener(
      "invitation-accepted",
      handleInvitationAccepted as EventListener
    );

    return () => {
      window.removeEventListener(
        "invitation-accepted",
        handleInvitationAccepted as EventListener
      );
    };
  }, [session?.user?.id, refreshUserOrganizations]);

  useEffect(() => {
    const handleInvitationAcceptedEvent = (event: CustomEvent) => {
      const { organizationId } = event.detail;
      console.log(
        "Header: Invitation accepted event received:",
        organizationId
      );
      if (organizationId) {
        handleInvitationAccepted(organizationId);
      }
    };

    // Add event listener
    window.addEventListener(
      "invitation-accepted",
      handleInvitationAcceptedEvent as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "invitation-accepted",
        handleInvitationAcceptedEvent as EventListener
      );
    };
  }, [handleInvitationAccepted]);

  const handleLogout = useCallback(async () => {
    setShowProfileMenu(false);
    await performLogout();
  }, []);

  const handleOrganizationSwitch = useCallback(
    async (organizationId: string) => {
      await switchOrganization(organizationId);
      setShowOrgDropdown(false);
    },
    [switchOrganization]
  );

  const user = session?.user;
  const showOrgSelector = userOrganizations.length > 1;
  const showOrgDisplay = currentOrganization && userOrganizations.length >= 1;

  return (
    <header className="bg-white border-b border-gray-200 z-30 sticky top-0 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Mobile menu button */}
          <button
            className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 md:hidden flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>

          {/* Desktop sidebar collapse button */}
          <button
            className="hidden md:flex text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>

          {/* Search bar */}
          <div className="w-full max-w-md lg:max-w-lg">
            <GlobalSearch />
          </div>
        </div>

        <div className="flex items-center space-x-6 flex-shrink-0 mx-1">
          {/* Organization Display/Selector with loading state */}
          {showOrgDisplay && (
            <div className="relative">
              {showOrgSelector ? (
                <button
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors bg-gray-50 border border-gray-200"
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                >
                  {currentOrganization.logo_url ? (
                    <img
                      src={currentOrganization.logo_url}
                      alt={currentOrganization.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center text-xs font-semibold">
                      {getInitials(currentOrganization.name)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {currentOrganization.name}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
                  {currentOrganization.logo_url ? (
                    <img
                      src={currentOrganization.logo_url}
                      alt={currentOrganization.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center text-xs font-semibold">
                      {getInitials(currentOrganization.name)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {currentOrganization.name}
                  </span>
                </div>
              )}

              {/* Organization Dropdown */}
              {showOrgDropdown && showOrgSelector && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOrgDropdown(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">
                        Switch Organization
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Select the organization you want to work with
                      </p>
                    </div>

                    <div className="py-1 max-h-64 overflow-y-auto">
                      {userOrganizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleOrganizationSwitch(org.id)}
                          className={`flex items-center w-full px-4 py-3 text-sm hover:bg-orange-50 transition-colors group ${currentOrganization?.id === org.id
                            ? "bg-orange-50 border-r-2 border-orange-500"
                            : ""
                            }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              {org.logo_url ? (
                                <img
                                  src={org.logo_url}
                                  alt={org.name}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center text-sm font-semibold">
                                  {getInitials(org.name)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="font-medium text-gray-900 truncate">
                                {org.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {org.role}
                                {org.is_owner && " • Owner"}
                              </p>
                            </div>
                          </div>
                          {currentOrganization?.id === org.id && (
                            <div className="flex items-center ml-2">
                              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading indicator for organizations */}
          {loading && !currentOrganization && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
              <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          )}

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
            <Bell size={20} />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm flex-shrink-0">
                  {getInitials(user?.name || "User")}
                </div>
              )}
              <div className="hidden lg:block text-left min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || "user@example.com"}
                </p>
              </div>
              <ChevronDown
                size={16}
                className="text-gray-400 hidden lg:block flex-shrink-0"
              />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setShowProfileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={16} className="mr-3 text-gray-400" />
                      Your Profile
                    </button>
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setShowProfileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} className="mr-3 text-gray-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        openSubscriptionModal();
                        setShowProfileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CreditCard size={16} className="mr-3 text-gray-400" />
                      Subscription
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
