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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center mb-4 text-primary-600 hover:text-primary-700">
          ← Back to Home
        </Link>
        <div className="flex justify-center">
          <PieChart className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to Caply</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Your complete resource and capacity planning solution</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow rounded-2xl sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
