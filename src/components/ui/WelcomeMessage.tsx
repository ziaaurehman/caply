"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Crown, Shield, Users, X, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function WelcomeMessage() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [isVisible, setIsVisible] = useState(false)
  const welcomeType = searchParams.get('welcome')

  useEffect(() => {
    if (welcomeType) {
      setIsVisible(true)
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setIsVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [welcomeType])

  if (!isVisible || !welcomeType || !session?.user) return null

  const getWelcomeContent = () => {
    switch (welcomeType) {
      case 'admin':
        return {
          icon: <Crown className="h-8 w-8 text-yellow-500" />,
          title: 'Welcome, Administrator!',
          subtitle: 'You are the first user and have been granted full admin access.',
          message: 'As an administrator, you can manage roles, invite team members, and configure the entire system.',
          actions: [
            { label: 'Manage Roles', href: '/settings/roles', variant: 'default' as const },
            { label: 'Invite Users', href: '/settings/invitations', variant: 'outline' as const }
          ],
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }

      case 'invited':
        return {
          icon: <Shield className="h-8 w-8 text-blue-500" />,
          title: 'Welcome to the team!',
          subtitle: 'You\'ve successfully joined the organization.',
          message: 'Your account has been set up with the appropriate permissions. Start exploring your dashboard.',
          actions: [
            { label: 'View Projects', href: '/projects', variant: 'default' as const },
            { label: 'Team Members', href: '/employees', variant: 'outline' as const }
          ],
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }

      case 'new':
        return {
          icon: <Users className="h-8 w-8 text-green-500" />,
          title: 'Welcome to Caply!',
          subtitle: 'Your account has been created successfully.',
          message: 'Get started by exploring your dashboard and familiarizing yourself with the available features.',
          actions: [
            { label: 'View Dashboard', href: '/dashboard', variant: 'default' as const },
            { label: 'Settings', href: '/settings', variant: 'outline' as const }
          ],
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }

      default:
        return null
    }
  }

  const content = getWelcomeContent()
  if (!content) return null

  return (
    <Card className={`${content.bgColor} ${content.borderColor} border-2 mb-6`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {content.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {content.title}
                </h3>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {content.subtitle}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {content.message}
              </p>
              <div className="flex flex-wrap gap-3">
                {content.actions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Button variant={action.variant} size="sm">
                      {action.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User information */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Welcome:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {session.user.name || 'User'}
               </span>
            </div>
            <div className="text-gray-500">
              Account: {session.user.email}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 