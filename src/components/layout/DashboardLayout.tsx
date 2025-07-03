"use client"

import type React from "react"
import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
        <main className="min-h-[calc(100vh-4rem)] overflow-y-auto focus:outline-none scrollbar-thin">
          <div className="py-6">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
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
    </div>
  )
}
