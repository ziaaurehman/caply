'use client'

import { useState, useEffect } from 'react'
import { Mail, X, Check, Clock, Shield } from 'lucide-react'
import { useInvitations } from '@/lib/hooks/useInvitations'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function InvitationPopup() {
  const { invitations, isLoading, acceptInvitation, removeInvitation } = useInvitations()
  const router = useRouter()
  const [showPopup, setShowPopup] = useState(false)
  const [currentInvitationIndex, setCurrentInvitationIndex] = useState(0)
  const [isAccepting, setIsAccepting] = useState(false)

  // Show popup when there are pending invitations
  useEffect(() => {
    if (invitations.length > 0 && !isLoading) {
      setShowPopup(true)
      setCurrentInvitationIndex(0)
    } else {
      setShowPopup(false)
    }
  }, [invitations.length, isLoading])

  const handleAccept = async () => {
    if (currentInvitationIndex >= invitations.length) return

    const invitation = invitations[currentInvitationIndex]
    setIsAccepting(true)

    try {
      const result = await acceptInvitation(invitation.token)
      toast.success(`Successfully joined ${invitation.organizations.name}! You can now access the organization dashboard.`)
      
      // Close popup and navigate to dashboard
      setShowPopup(false)
      
      // Navigate to dashboard to show the new organization
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = () => {
    if (currentInvitationIndex >= invitations.length) return

    const invitation = invitations[currentInvitationIndex]
    removeInvitation(invitation.id)
    
    // Move to next invitation or close popup
    if (currentInvitationIndex + 1 < invitations.length) {
      setCurrentInvitationIndex(currentInvitationIndex + 1)
    } else {
      setShowPopup(false)
    }
  }



  const handleClose = () => {
    setShowPopup(false)
  }

  if (!showPopup || invitations.length === 0) return null

  const invitation = invitations[currentInvitationIndex]
  if (!invitation) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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
    <div className="fixed top-4 right-4 z-50 w-96">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-blue-100">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Organization Invitation</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Organization Info */}
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
                {invitation.organizations.logo_url ? (
                  <img
                    src={invitation.organizations.logo_url}
                    alt={invitation.organizations.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-gray-600">
                    {invitation.organizations.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900">
                {invitation.organizations.name}
              </h4>
            </div>

            {/* Role Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role:</span>
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
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Message:</span> {invitation.message}
                </p>
              </div>
            )}

            {/* Expiry Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Expires {formatDate(invitation.expires_at)}</span>
            </div>

            {/* Progress */}
            {invitations.length > 1 && (
              <div className="text-xs text-gray-500 text-center">
                {currentInvitationIndex + 1} of {invitations.length} invitations
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDecline}
            disabled={isAccepting}
            className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isAccepting ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Accept
          </button>
        </div>
      </div>
    </div>
  )
} 