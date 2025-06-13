"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { ChevronDown, User } from "lucide-react"
import LogoutButton from "./LogoutButton"
import Link from "next/link"

export default function UserProfile() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user) {
    return null
  }

  const toggleDropdown = () => setIsOpen(!isOpen)
  const closeDropdown = () => setIsOpen(false)

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 overflow-hidden">
          {session.user.avatar ? (
            <img src={session.user.avatar} alt={session.user.name || ""} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700">{session.user.name}</p>
          <p className="text-xs text-gray-500">{session.user.role || "User"}</p>
        </div>
        <ChevronDown className="hidden md:block h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeDropdown} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20 border border-gray-200">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={closeDropdown}
            >
              Settings
            </Link>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <div className="px-4 py-2">
                <LogoutButton variant="text" className="w-full text-left" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 