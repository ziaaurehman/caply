"use client"
import Link from "next/link"
import { PieChart } from "lucide-react"

export default function LandingHeader() {
  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <PieChart className="h-10 w-10 text-primary-600" />
            <span className="ml-2 text-2xl font-bold text-primary-600">Caply</span>
          </div>
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
        </div>
      </nav>
    </header>
  )
}
