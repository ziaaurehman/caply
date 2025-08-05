'use client'

import { useState } from 'react'
import { X, Check, XCircle, Mail, Clock, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface Invitation {
  id: string
  organization_id: string
  email: string
  role_id: string
  status: string
  expires_at: string
  created_at: string
  message?: string
  token: string
  roles: {
    id: string
    name: string
    display_name: string
    description: string
  }
  organizations: {
    id: string
    name: string
    logo_url?: string
  }
  invited_by_user: {
    id: string
    full_name: string
    email: string
  }
}

interface InvitationModalProps {
  isOpen: boolean
  onClose: () => void
  invitation: Invitation
  onAccept: () => void
}

export default function InvitationModal({
  isOpen,
  onClose,
  invitation,
  onAccept
}: InvitationModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invitation.token
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      toast.success('Successfully joined organization!')
      onAccept()
      onClose()
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      toast.error(error.message || 'Failed to accept invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = () => {
    // For now, just close the modal
    // In the future, we could add a decline API endpoint
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadge = (role: any) => {
    const colors: any = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      guest: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role.name] || 'bg-purple-100 text-purple-800'}`}>
        <Shield className="w-3 h-3 mr-1" />
        {role.display_name || role.name}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Organization Invitation</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Organization Info */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                {invitation.organizations.logo_url ? (
                  <img
                    src={invitation.organizations.logo_url}
                    alt={invitation.organizations.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-600">
                    {invitation.organizations.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {invitation.organizations.name}
              </h3>
              <p className="text-sm text-gray-500">
                You've been invited to join this organization
              </p>
            </div>

            {/* Role Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Role:</span>
                {getRoleBadge(invitation.roles)}
              </div>
            </div>

            {/* Inviter Info */}
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Invited by:</span> {invitation.invited_by_user.full_name}
              </p>
            </div>

            {/* Message */}
            {invitation.message && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Message:</span> {invitation.message}
                </p>
              </div>
            )}

            {/* Expiry Info */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Expires {formatDate(invitation.expires_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDecline}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Accept Invitation
          </button>
        </div>
      </div>
    </div>
  )
} 