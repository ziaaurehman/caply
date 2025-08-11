"use client"

import { useState, useEffect } from "react"
import { X, ChevronLeft, Search, Plus } from "lucide-react"
import { kanbanAPI } from "@/utils/api/kanban"

interface ProjectMember {
  id: string
  organization_member_id: string
  role?: string
  joined_at?: string
  organization_members: {
    id: string
    user_id: string
    users: {
      id: string
      full_name: string
      email: string
      avatar_url?: string
    }
  }
}

interface MembersModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  organizationId: string
  selectedMembers: string[]
  onMembersChange: (memberIds: string[]) => void
}

export default function MembersModal({
  isOpen,
  onClose,
  projectId,
  organizationId,
  selectedMembers,
  onMembersChange
}: MembersModalProps) {
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [localSelectedMembers, setLocalSelectedMembers] = useState<string[]>(selectedMembers)

  // Sync local state when selectedMembers prop changes
  useEffect(() => {
    setLocalSelectedMembers(selectedMembers)
  }, [selectedMembers])

  useEffect(() => {
    if (isOpen) {
      loadProjectMembers()
      setSearchTerm("") // Reset search when modal opens
    }
  }, [isOpen])

  const loadProjectMembers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/members?organizationId=${organizationId}`, {
        headers: {
          'x-organization-id': organizationId,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load project members')
      }
      
      const data = await response.json()
      setProjectMembers(data.members || [])
    } catch (error) {
      console.error("Error loading project members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMemberToggle = (memberId: string) => {
    const isSelected = localSelectedMembers.includes(memberId)
    if (isSelected) {
      setLocalSelectedMembers(localSelectedMembers.filter(id => id !== memberId))
    } else {
      setLocalSelectedMembers([...localSelectedMembers, memberId])
    }
  }

  const handleSave = () => {
    onMembersChange(localSelectedMembers)
    onClose()
  }

  const handleCancel = () => {
    setLocalSelectedMembers(selectedMembers) // Reset to original state
    onClose()
  }

  const filteredMembers = projectMembers.filter(member =>
    member.organization_members.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.organization_members.users.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const cardMembers = projectMembers.filter(member => localSelectedMembers.includes(member.id))
  const boardMembers = projectMembers.filter(member => !localSelectedMembers.includes(member.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* All Members with checkboxes */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Project Members</h3>
                <div className="space-y-2">
                  {(searchTerm ? filteredMembers : projectMembers).map((member) => {
                    const isSelected = localSelectedMembers.includes(member.id)
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleMemberToggle(member.id)}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          isSelected ? 'bg-green-500' : 'bg-blue-500'
                        }`}>
                          {member.organization_members.users.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                        </div>
                        
                        {/* Name and Email */}
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {member.organization_members.users.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.organization_members.users.email}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {(searchTerm ? filteredMembers : projectMembers).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No members found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
