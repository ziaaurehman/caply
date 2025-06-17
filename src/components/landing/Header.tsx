"use client"
import Link from "next/link"
import { PieChart, UserCircle, LogOut } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

export default function LandingHeader() {
  // Always call all hooks at the top level, regardless of auth state
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isAuthenticated = status === 'authenticated' && session

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

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <PieChart className="h-10 w-10 text-primary-600" />
            <span className="ml-2 text-2xl font-bold text-primary-600">Caply</span>
          </div>
          
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
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2 text-primary-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-2.5 text-base font-medium text-primary-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
