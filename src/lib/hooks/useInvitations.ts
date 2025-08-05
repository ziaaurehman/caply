import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useOrganizationStore } from '@/lib/stores/organizationStore'

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

export function useInvitations() {
  const { data: session } = useSession()
  const { fetchUserOrganizations, switchOrganization } = useOrganizationStore()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = async () => {
    if (!session?.user?.email) return

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/invitations/pending')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitations')
      }

      setInvitations(data.invitations || [])
    } catch (err: any) {
      console.error('Error fetching invitations:', err)
      setError(err.message || 'Failed to fetch invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const acceptInvitation = async (token: string) => {
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.token !== token))
      
      // Refresh user's organizations to include the newly joined one
      await fetchUserOrganizations()
      
      // Switch to the newly joined organization
      if (data.organization?.id) {
        await switchOrganization(data.organization.id)
      }
      
      return data
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      throw error
    }
  }

  const removeInvitation = (invitationId: string) => {
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
  }

  // Fetch invitations when session changes
  useEffect(() => {
    if (session?.user?.email) {
      fetchInvitations()
    }
  }, [session?.user?.email])

  return {
    invitations,
    isLoading,
    error,
    fetchInvitations,
    acceptInvitation,
    removeInvitation,
    hasPendingInvitations: invitations.length > 0
  }
} 