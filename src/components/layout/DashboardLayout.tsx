"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import SubscriptionModal from "../modals/SubscriptionModal"
import InvitationPopup from "../ui/InvitationPopup"
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useAuthStore } from "@/lib/stores/authStore"
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const { data: session } = useSession()
  const { organization } = useAuthStore()
  const { 
    showSubscriptionModal, 
    setShowSubscriptionModal, 
    currentSubscription, 
    fetchCurrentSubscription 
  } = useSubscriptionStore()
  const { closeSubscriptionModal } = useSubscriptionModal()

  // Show subscription modal when user first accesses dashboard
  useEffect(() => {
    if (session && organization) {
      // Check if user has a subscription
      fetchCurrentSubscription(organization.id)
      
      // Check if we should show the modal (you can add localStorage logic here)
      const hasSeenModal = localStorage.getItem(`subscription-modal-seen-${organization.id}`)
      
      // Show modal if user hasn't seen it and doesn't have an active subscription
      if (!hasSeenModal && !currentSubscription) {
        setShowSubscriptionModal(true)
      }
    }
  }, [session, organization, fetchCurrentSubscription, setShowSubscriptionModal, currentSubscription])

  return (
    <div className="h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />
      
      {/* Main content area */}
      <div className={`min-h-screen transition-all duration-300 ${
        sidebarCollapsed 
          ? 'md:pl-16' 
          : 'md:pl-56'
      }`}>
        <Header 
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        
        {/* Main content with single scroll */}
        <main className="min-h-[calc(100vh-4rem)] h-full overflow-y-auto focus:outline-none scrollbar-thin">
          <div className="py-6">     {/* sm:px-6 lg:px-8 */}
            <div className="mx-auto ">   
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}
      
      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={closeSubscriptionModal} 
      />
      
      {/* Invitation Popup */}
      <InvitationPopup />
    </div>
  )
}
