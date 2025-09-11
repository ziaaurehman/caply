"use client"

import { ArrowRight, Menu, X } from "lucide-react"
import Link from "next/link"
import { PieChart, UserCircle, LogOut, LayoutDashboard } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

interface NavbarProps {
  activeSection?: string
  isScrolled?: boolean
  onSectionClick?: (sectionId: string) => void
}

export default function LandingHeader({ 
  activeSection = "Home", 
  isScrolled = false, 
  onSectionClick = () => {} 
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isAuthenticated = status === 'authenticated' && session
  const [scrolled, setScrolled] = useState(isScrolled)

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false) // Close dropdown before logout
    await signOut({ redirect: false })
    router.push("/login")
  }

  const handleDashboardClick = () => {
    setDropdownOpen(false)
    router.push("/dashboard")
  }

  const navItems = [
    { id: "Home", label: "Home" },
    { id: "features", label: "Features" },
    { id: "pricing", label: "Pricing" },
    { id: "contact", label: "Contact" },
  ]

  const handleSectionClick = (sectionId: string) => {
    onSectionClick(sectionId)
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${
        scrolled
          ? "bg-white/95 backdrop-blur-md py-3 shadow-lg border-b border-gray-200/50"
          : "bg-white/90 backdrop-blur-md py-4 border-b border-gray-200/30"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center relative">
          {/* Logo */}
          <div className="flex items-center">
            <PieChart className="h-10 w-10 text-primary-600" />
            <span className="ml-2 text-2xl font-bold text-primary-600">Caply</span>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2">
            <div
              className={`rounded-full px-2 py-2 flex space-x-1 transition-all duration-300 ${
                scrolled ? "bg-gray-100/90 backdrop-blur-sm" : "bg-gray-100/70 backdrop-blur-sm"
              }`}
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className={`relative px-6 py-2 rounded-full text-sm font-medium transition-all duration-500 ease-in-out ${
                    activeSection === item.id
                      ? "bg-primary-600 text-white shadow-lg transform scale-105"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-200/50"
                  }`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop CTA Buttons */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                className="flex items-center text-gray-700 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full p-1 transition-colors"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {session.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt={session.user.name || "User"} 
                    className="h-10 w-10 rounded-full border-2 border-primary-200 hover:border-primary-300"
                  />
                ) : (
                  <UserCircle className="h-10 w-10 text-primary-600" />
                )}
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-primary-200 py-1">
                  <div className="px-4 py-2 border-b border-primary-100">
                    <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                  </div>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                    onClick={handleDashboardClick}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2 text-primary-500" />
                    <span>Dashboard</span>
                  </button>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2 text-primary-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-4">
              <button 
                onClick={() => router.push("/login")} 
                className="text-gray-700 hover:text-primary-600 font-medium text-sm transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => router.push("/signup")} 
                className="text-gray-700 hover:text-primary-600 font-medium text-sm transition-colors"
              >
                Sign Up
              </button>
              <button 
                onClick={() => router.push("/login")} 
                className="bg-primary-600 hover:bg-primary-700 transition-colors text-white px-4 py-2 rounded-full font-medium text-xs transition-all duration-300 hover:shadow-md flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-1 w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-gray-200/30 shadow-lg">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-primary-600 text-white"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-gray-300">
              <button 
                onClick={() => router.push("/login")} 
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 hover:text-primary-600"
              >
                Login
              </button>
              <button 
                onClick={() => router.push("/signup")} 
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 hover:text-primary-600"
              >
                Sign Up
              </button>
              <button 
                onClick={() => router.push("/login")} 
                className="w-full bg-primary-600 hover:bg-primary-700 transition-colors text-white px-4 py-2 rounded-full font-medium text-sm transition-colors flex items-center justify-center mt-2"
              >
                Start Free Trial
                <ArrowRight className="ml-1 w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
