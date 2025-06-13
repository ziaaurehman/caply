"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { useState } from "react"

interface LogoutButtonProps {
  variant?: "icon" | "text" | "full"
  className?: string
}

export default function LogoutButton({ variant = "full", className = "" }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOut({ callbackUrl: "/login" })
    } catch (error) {
      console.error("Failed to sign out:", error)
      setIsLoading(false)
    }
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 ${className}`}
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    )
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`text-gray-500 hover:text-gray-700 font-medium ${className}`}
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`flex items-center space-x-2 text-gray-500 hover:text-gray-700 font-medium ${className}`}
    >
      <LogOut className="h-5 w-5" />
      <span>{isLoading ? "Signing out..." : "Sign out"}</span>
    </button>
  )
} 