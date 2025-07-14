"use client"

import React, { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Mail, Clock, Shield, AlertCircle } from "lucide-react"
import Button from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { formatCurrency } from "@/lib/utils"
import { teamAPI, type TeamMember, type PendingInvitation, type CreateTeamMemberData, type UpdateTeamMemberData } from "@/utils/api"
import TeamMemberModal from "./TeamMemberModal"

const TeamMembersPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await teamAPI.getTeamMembers()
      setMembers(data.members)
      setInvitations(data.invitations)
    } catch (error: any) {
      console.error('Error fetching team members:', error)
      setError(error.message || 'Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      await teamAPI.deleteTeamMember(id)
      await fetchTeamMembers() // Refresh the list
    } catch (error: any) {
      console.error('Error deleting member:', error)
      alert(error.message || 'Failed to remove member')
    }
  }

  const handleAddNew = () => {
    setSelectedMember(null)
    setIsModalOpen(true)
  }

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        // Update existing member
        const updateData: UpdateTeamMemberData = {
          roleId: data.roleId,
          department: data.department,
          hourlyRate: data.hourlyRate,
          weeklyCapacity: data.weeklyCapacity
        }
        await teamAPI.updateTeamMember(data.id, updateData)
      } else {
        // Create new invitation
        const createData: CreateTeamMemberData = {
          email: data.email,
          roleId: data.roleId,
          department: data.department,
          hourlyRate: data.hourlyRate,
          weeklyCapacity: data.weeklyCapacity,
          message: data.message
        }
        await teamAPI.createTeamMember(createData)
      }

      await fetchTeamMembers() // Refresh the list
    } catch (error: any) {
      console.error('Error saving member:', error)
      throw error // Re-throw so modal can handle it
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
    }
    
    switch (status) {
      case 'active':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
      case 'pending':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getRoleBadge = (role: any) => {
    if (!role) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Shield className="w-3 h-3 mr-1" />
        Unknown Role
      </span>;
    }
    
    const colors: any = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      guest: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role.name] || 'bg-purple-100 text-purple-800'}`}>
        <Shield className="w-3 h-3 mr-1" />
        {role.display_name || role.name || 'Unknown Role'}
      </span>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your team members and their permissions</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <button
              onClick={fetchTeamMembers}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your team members and their permissions</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="flex items-center text-lg font-medium text-gray-800">
                <Mail className="h-5 w-5 mr-2" />
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-yellow-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                        <div className="flex items-center space-x-2">
                          {getRoleBadge(invitation.roles)}
                          <span className="text-xs text-gray-500">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs text-yellow-600">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Team Overview ({members.length} members)</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading team members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                <p className="text-gray-500 mb-4">Start building your team by inviting your first member.</p>
                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Invite Your First Member
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role & Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weekly Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hourly Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {member?.users?.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={member.users.avatar_url || "/placeholder.svg"}
                                alt={member.users?.full_name || "User"}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-orange-700 font-medium text-lg">
                                  {member.users?.full_name ? member.users.full_name.charAt(0).toUpperCase() : "?"}
                                </span>
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.users?.full_name || "Unknown User"}
                              </div>
                              <div className="text-sm text-gray-500">{member.users?.email || "No email"}</div>
                              {member.users?.position && (
                                <div className="text-xs text-gray-400">{member.users.position}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getRoleBadge(member.roles)}
                            {member.department && <div className="text-sm text-gray-500">{member.department}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(member.status, member.users?.is_active || false)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.weekly_capacity || 0}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.hourly_rate ? formatCurrency(member.hourly_rate) + "/h" : "Not set"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-gray-600 hover:text-gray-900 mr-4"
                            title="Edit member"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <TeamMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          member={selectedMember}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}

export default TeamMembersPage
