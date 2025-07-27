"use client"

import { useState, Dispatch, SetStateAction, useEffect } from "react"
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut, PanelLeftClose, PanelLeftOpen, CreditCard, Building2, Check } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"
import { useOrganizationStore } from "@/lib/stores/organizationStore"

interface HeaderProps {
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  sidebarCollapsed: boolean
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>
}

export default function Header({ setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const { openSubscriptionModal } = useSubscriptionModal()
  
  const {
    currentOrganization,
    userOrganizations,
    loading,
    fetchUserOrganizations,
    switchOrganization,
    clearOrganizationData
  } = useOrganizationStore()

  // Fetch organizations when session is available
  useEffect(() => {
    if (session?.user?.id && userOrganizations.length === 0) {
      fetchUserOrganizations()
    }
  }, [session?.user?.id, fetchUserOrganizations, userOrganizations.length])

  const handleLogout = async () => {
    setShowProfileMenu(false)
    clearOrganizationData()
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    })
  }

  const handleOrganizationSwitch = async (organizationId: string) => {
    await switchOrganization(organizationId)
    setShowOrgDropdown(false)
  }

  const user = session?.user
  const showOrgSelector = userOrganizations.length > 1
  const showOrgDisplay = currentOrganization && userOrganizations.length >= 1

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
            {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {/* Search bar */}
          <div className="relative w-full max-w-md lg:max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
              placeholder="Search projects, tasks..."
              type="search"
            />
          </div>
        </div>

        <div className="flex items-center space-x-6 flex-shrink-0 mx-1">
          {/* Organization Display/Selector */}
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
                          className={`flex items-center w-full px-4 py-3 text-sm hover:bg-orange-50 transition-colors group ${
                            currentOrganization?.id === org.id ? 'bg-orange-50 border-r-2 border-orange-500' : ''
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
                                {org.membership.role.display_name}
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
                <p className="text-sm font-medium text-gray-700 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || "user@example.com"}</p>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden lg:block flex-shrink-0" />
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
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email || "user@example.com"}</p>
                  </div>
                  
                  {/* Menu items */}
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        router.push('/profile')
                        setShowProfileMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={16} className="mr-3 text-gray-400" />
                      Your Profile
                    </button>
                    <button 
                      onClick={() => {
                        router.push('/settings')
                        setShowProfileMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} className="mr-3 text-gray-400" />
                      Settings
                    </button>
                    <button 
                      onClick={() => {
                        openSubscriptionModal()
                        setShowProfileMenu(false)
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
  )
}
