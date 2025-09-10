"use client";

import type React from "react";
import { Dispatch, SetStateAction, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  BarChart4,
  PieChart,
  Settings,
  Briefcase,
  Palmtree,
  GanttChart,
  Receipt,
  DollarSign,
  Calculator,
  FolderOpen,
  Shield,
  UserPlus,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import {
  isManagerOrAbove,
  canManageRoles,
  canViewLeave,
} from "@/utils/clientOrganizationUtils";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  children?: React.ReactNode;
  badge?: string;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  href,
  icon,
  label,
  active,
  children,
  badge,
  isCollapsed,
}) => {
  const [isExpanded, setIsExpanded] = useState(active);

  if (children && !isCollapsed) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
            active
              ? "bg-primary-100 text-primary-700 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <div className="flex items-center min-w-0">
            <span className="mr-3 flex-shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
            {badge && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <span className="ml-2 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </span>
        </button>
        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-4">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-lg mb-1 transition-all duration-200 group relative",
        isCollapsed ? "px-3 py-3 justify-center" : "px-3 py-2.5",
        active
          ? "bg-primary-100 text-primary-700 shadow-sm"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
      title={isCollapsed ? label : undefined}
    >
      <span className={cn("flex-shrink-0", isCollapsed ? "" : "mr-3")}>
        {icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="truncate text-sm font-medium">{label}</span>
          {badge && (
            <span className="ml-auto px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded-full">
              {badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
          {label}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </Link>
  );
};

const SubNavItem: React.FC<{
  href: string;
  label: string;
  active: boolean;
}> = ({ href, label, active }) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-3 py-2 text-sm rounded-md transition-colors relative",
        active
          ? "bg-primary-50 text-primary-700 font-medium"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <div className="w-2 h-2 rounded-full bg-gray-300 mr-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
};

const NavSection: React.FC<{
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
}> = ({ title, children, isCollapsed }) => {
  if (isCollapsed) {
    return (
      <div className="mb-4">
        <div className="h-px bg-gray-200 mx-2 mb-4" />
        <div className="space-y-2">{children}</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    currentOrganization,
    organizationContext,
    fetchOrganizationContext,
    loading,
  } = useOrganizationStore();

  const fetchContext = useCallback(async () => {
    if (
      session?.user?.id &&
      currentOrganization?.id &&
      !organizationContext &&
      !loading
    ) {
      console.log(
        "Sidebar: Fetching organization context for",
        currentOrganization.id
      );
      try {
        await fetchOrganizationContext(currentOrganization.id);
      } catch (error) {
        console.error("Error fetching organization context:", error);
      }
    }
  }, [
    session?.user?.id,
    currentOrganization?.id,
    organizationContext,
    loading,
    fetchOrganizationContext,
  ]);

  // Ensure organization context is loaded
  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  // Check permissions using the client-side organizationUtils approach
  const userIsManagerOrAbove = isManagerOrAbove(organizationContext);
  const userCanManageRoles = canManageRoles(organizationContext);
  const userCanViewLeave = canViewLeave(organizationContext);

  const shouldShowLoading = loading && currentOrganization?.id;

  if (shouldShowLoading) {
    return (
      <>
        {/* Desktop Sidebar Loading */}
        <div
          className={cn(
            "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300",
            sidebarCollapsed ? "md:w-16" : "md:w-56"
          )}
        >
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isContextLoading = loading && currentOrganization?.id;

  const coreMenuItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard size={18} />,
      label: "Dashboard",
    },
    {
      href: "/projects",
      icon: <Briefcase size={18} />,
      label: "Projects",
    },
    {
      href: "/kanban",
      icon: <GanttChart size={18} />,
      label: "Kanban",
    },
  ];

  const teamMenuItems = [
    {
      href: "/teams",
      icon: <Users size={18} />,
      label: "Team",
    },
    {
      href: "/capacity",
      icon: <Calendar size={18} />,
      label: "Capacity",
    },
    {
      href: "/timesheets",
      icon: <Clock size={18} />,
      label: "Timesheets",
    },
    ...(userCanViewLeave
      ? [
          {
            href: "/leave",
            icon: <Palmtree size={18} />,
            label: "Leave",
          },
        ]
      : []),
  ];

  // Render helper for a skeleton nav item
  const SkeletonNavItem: React.FC<{ isCollapsed?: boolean }> = ({
    isCollapsed,
  }) => (
    <div
      className={cn(
        "flex items-center rounded-lg mb-1",
        isCollapsed ? "px-3 py-3 justify-center" : "px-3 py-2.5"
      )}
    >
      <span
        className={cn("flex-shrink-0", isCollapsed ? "" : "mr-3")}
        aria-hidden
      >
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
      </span>
      {!isCollapsed && (
        <span
          className="h-4 w-20 bg-gray-200 rounded animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );

  const financeMenuItems = [
    {
      href: "/expenses",
      icon: <DollarSign size={18} />,
      label: "Expenses",
    },
    {
      href: "/estimates",
      icon: <Calculator size={18} />,
      label: "Estimates",
    },
    {
      href: "/invoices",
      icon: <Receipt size={18} />,
      label: "Invoices",
    },
  ];

  const resourceMenuItems = [
    {
      href: "/storage",
      icon: <FolderOpen size={18} />,
      label: "Storage",
    },
    {
      href: "/reports",
      icon: <BarChart4 size={18} />,
      label: "Reports",
    },
  ];

  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300",
          sidebarCollapsed ? "md:w-16" : "md:w-56"
        )}
      >
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto scrollbar-thin">
          {/* Logo */}
          <div
            className={cn(
              "flex items-center flex-shrink-0 mb-6",
              sidebarCollapsed ? "justify-center px-2" : "px-4"
            )}
          >
            <Link href="/dashboard" className="flex items-center">
              <PieChart className="h-8 w-8 text-primary-600" />
              {!sidebarCollapsed && (
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Caply
                </span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className={cn(
              "flex-1 space-y-1",
              sidebarCollapsed ? "px-2" : "px-3"
            )}
          >
            {/* Core Section */}
            <NavSection title="Core" isCollapsed={sidebarCollapsed}>
              {coreMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  isCollapsed={sidebarCollapsed}
                />
              ))}
            </NavSection>

            {/* Team Management */}
            <NavSection title="Team" isCollapsed={sidebarCollapsed}>
              {teamMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  isCollapsed={sidebarCollapsed}
                />
              ))}
            </NavSection>

            {/* Administration */}
            {isContextLoading ? (
              <NavSection title="Administration" isCollapsed={sidebarCollapsed}>
                <SkeletonNavItem isCollapsed={sidebarCollapsed} />
              </NavSection>
            ) : (
              userCanManageRoles && (
                <NavSection
                  title="Administration"
                  isCollapsed={sidebarCollapsed}
                >
                  <NavItem
                    href="/roles"
                    icon={<Shield size={18} />}
                    label="Roles & Permissions"
                    active={pathname === "/roles"}
                    isCollapsed={sidebarCollapsed}
                  />
                </NavSection>
              )
            )}

            {/* Finance */}
            {/* <NavSection title="Finance" isCollapsed={sidebarCollapsed}>
              {financeMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  isCollapsed={sidebarCollapsed}
                />
              ))}
            </NavSection> */}

            {/* Resources */}
            {/* <NavSection title="Resources" isCollapsed={sidebarCollapsed}>
              {resourceMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  isCollapsed={sidebarCollapsed}
                />
              ))}
            </NavSection> */}

            {/* Management section removed - Roles & Permissions moved to Administration section with proper admin checks */}

            {/* Settings */}
            {/* <NavSection title="Settings" isCollapsed={sidebarCollapsed}>
              <NavItem
                href="/settings"
                icon={<Settings size={18} />}
                label="Settings"
                active={isSettingsActive}
                isCollapsed={sidebarCollapsed}
              >
                {!sidebarCollapsed && (
                  <>
                    <SubNavItem
                      href="/settings"
                      label="General"
                      active={pathname === '/settings'}
                    />
                    {isManagerOrAbove && (
                      <SubNavItem
                        href="/settings/invitations"
                        label="Invitations"
                        active={pathname === '/settings/invitations'}
                      />
                    )}
                    {isAdmin && (
                      <SubNavItem
                        href="/settings/roles"
                        label="Roles"
                        active={pathname === '/settings/roles'}
                      />
                    )}
                  </>
                )}
              </NavItem>
            </NavSection> */}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform sidebar-transition",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center">
              <PieChart className="h-6 w-6 text-primary-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">
                Caply
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            {/* Simplified mobile menu */}
            <div className="space-y-1">
              {[
                ...coreMenuItems,
                ...teamMenuItems,
                ...financeMenuItems,
                ...resourceMenuItems,
              ].map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}

              {/* Roles & Permissions for mobile */}
              {userCanManageRoles && (
                <NavItem
                  href="/roles"
                  icon={<Shield size={18} />}
                  label="Roles & Permissions"
                  active={pathname === "/roles"}
                />
              )}

              <NavItem
                href="/settings"
                icon={<Settings size={18} />}
                label="Settings"
                active={isSettingsActive}
              >
                <SubNavItem
                  href="/settings"
                  label="General"
                  active={pathname === "/settings"}
                />
                {userIsManagerOrAbove && (
                  <SubNavItem
                    href="/settings/invitations"
                    label="Invitations"
                    active={pathname === "/settings/invitations"}
                  />
                )}
                {userCanManageRoles && (
                  <SubNavItem
                    href="/settings/roles"
                    label="Roles"
                    active={pathname === "/settings/roles"}
                  />
                )}
              </NavItem>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
