"use client"
import Link from "next/link"
import { useEffect } from "react"
import { PieChart } from "lucide-react"
import LoginForm from "./LoginForm"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  const { status } = useSession()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'
      window.location.href = callbackUrl
    }
  }, [status, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white z-0" />

      {/* Absolute positioned Back to Home link */}
      <div className="absolute top-8 left-8 z-20">
        <Link
          href="/"
          className="flex items-center text-gray-600 hover:text-orange-600 transition-colors font-medium text-sm group"
        >
          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center mr-2 group-hover:border-orange-200 group-hover:bg-orange-50 transition-all shadow-sm">
            ←
          </span>
          Back to Home
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 mb-4">
            <PieChart className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign in to Caply</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your complete resource and capacity planning solution
          </p>
        </div>

        <div className="bg-white py-10 px-8 shadow-xl rounded-3xl border border-gray-100">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Caply. All rights reserved.
        </p>
      </div>
    </div>
  )
}
