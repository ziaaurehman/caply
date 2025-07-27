"use client"

import { useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Mail, CheckCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string
  }>
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const params = use(searchParams)
  const email = params?.email || ''

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address not found. Please try registering again.')
      return
    }

    setResending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setError(error.message)
      } else {
        setResent(true)
        setTimeout(() => setResent(false), 5000) // Reset after 5 seconds
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification link to{' '}
            {email && <strong>{email}</strong>}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What to do next:
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your email inbox for a verification link</li>
                    <li>Click the link to verify your email address</li>
                    <li>Once verified, you can sign in to your account</li>
                    <li>If you don't see the email, check your spam folder</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {resent && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-600">
                Verification email sent successfully! Check your inbox.
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            {email && (
              <button
                onClick={handleResendEmail}
                disabled={resending}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </button>
            )}
            
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Back to Login
            </Link>

            <Link
              href="/signup"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Try different email
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  )
} 