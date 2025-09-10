"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Clock,
  Shield,
  AlertCircle,
  Search,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { formatCurrency } from "@/lib/utils";
import { useConfirmation } from "@/lib/hooks/useConfirmation";
import { createDeleteConfirmation } from "@/utils/confirmations";
import {
  teamAPI,
  type TeamMember,
  type PendingInvitation,
  type CreateTeamMemberData,
  type UpdateTeamMemberData,
} from "@/utils/api";
import TeamMemberModal from "./TeamMemberModal";
import TeamMembersSkeleton from "./TeamMembersSkeleton";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import Pagination from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";

const TeamMembersPage: React.FC = () => {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const { confirmation, confirm, handleConfirm, handleClose } =
    useConfirmation();
  const { currentOrganization } = useOrganizationStore();

  // Client-side filtering
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return allMembers;
    }

    const searchLower = searchTerm.toLowerCase();
    return allMembers.filter((member) => {
      const fullName = member.users?.full_name?.toLowerCase() || "";
      const email = member.users?.email?.toLowerCase() || "";
      const department = member.department?.toLowerCase() || "";
      const position = member.users?.position?.toLowerCase() || "";

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        department.includes(searchLower) ||
        position.includes(searchLower)
      );
    });
  }, [allMembers, searchTerm]);

  // Client-side pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Calculate pagination metadata
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchTeamMembers();
    }
  }, [currentOrganization?.id]);

  // Reset to first page when search term changes
  useEffect(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
    }
  }, [searchTerm]);

  const fetchTeamMembers = async () => {
    if (!currentOrganization?.id) return;

      setIsLoading(true);
    setError(null);

    try {
      // Fetch all members without search parameter
      const data = await teamAPI.getTeamMembers(currentOrganization.id, {
        page: 1,
        limit: 1000, // Fetch all members for client-side filtering
        status: "active",
      });

      setAllMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      const errorMessage = error.message || "Failed to connect to server";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const member = allMembers.find((m) => m.id === id);
    const memberName = member?.users?.full_name || "this team member";

    const confirmation = createDeleteConfirmation({
      itemName: memberName,
      itemType: "Team Member",
      additionalMessage: "will remove all associated data",
      onDelete: async () => {
        try {
          if (!currentOrganization?.id) {
            throw new Error("No organization selected");
          }
          await teamAPI.deleteTeamMember(id, currentOrganization.id);
          await fetchTeamMembers(); // Refresh the list
        } catch (error: any) {
          // Handle specific error messages
          if (error.message.includes("organization owner")) {
            throw new Error(
              "Cannot remove organization owner. Please transfer ownership first."
            );
          } else if (error.message.includes("Cannot remove yourself")) {
            throw new Error(
              "You cannot remove yourself from the organization."
            );
          }
          throw error;
        }
      },
    });

    confirm(confirmation.action, confirmation);
  };

  const handleAddNew = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        // Update existing member
        if (!currentOrganization?.id) {
          throw new Error("No organization selected");
        }

        const updateData: UpdateTeamMemberData & { organizationId: string } = {
          roleId: data.roleId,
          department: data.department,
          hourlyRate: data.hourlyRate,
          weeklyCapacity: data.weeklyCapacity,
          organizationId: currentOrganization.id,
        };
        await teamAPI.updateTeamMember(data.id, updateData);
        toast.success("Team member updated successfully");
      } else {
        // Create new invitation
        if (!currentOrganization?.id) {
          throw new Error("No organization selected");
        }

        const createData: CreateTeamMemberData & { organizationId: string } = {
          email: data.email,
          roleId: data.roleId,
          department: data.department,
          hourlyRate: data.hourlyRate,
          weeklyCapacity: data.weeklyCapacity,
          message: data.message,
          organizationId: currentOrganization.id,
        };
        await teamAPI.createTeamMember(createData);
        toast.success("Team member invitation sent successfully");
      }

      await fetchTeamMembers(); // Refresh the list
    } catch (error: any) {
      console.error("Error saving member:", error);
      toast.error(error.message || "Failed to save team member");
      throw error; // Re-throw so modal can handle it
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          Inactive
        </span>
      );
    }

    switch (status) {
      case "active":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        );
      case "pending":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getRoleBadge = (role: any) => {
    if (!role) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Shield className="w-3 h-3 mr-1" />
          Unknown Role
        </span>
      );
    }

    const colors: any = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      member: "bg-green-100 text-green-800",
      guest: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role.name] || "bg-purple-100 text-purple-800"}`}
      >
        <Shield className="w-3 h-3 mr-1" />
        {role.display_name || role.name || "Unknown Role"}
      </span>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your team members and their permissions
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <button
              onClick={() => fetchTeamMembers()}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <TeamMembersSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className=" mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Team Members</h1>
          <p className="text-sm text-gray-500">
            Manage your team members and their permissions
          </p>
        </div>

        {/* Search and Invite Button Row */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors whitespace-nowrap h-10"
            >
              <Plus className="h-4 w-4" />
              Invite Member
            </button>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="flex items-center text-lg font-medium text-gray-800 mb-4">
              <Mail className="h-5 w-5 mr-2" />
              Pending Invitations ({invitations.length})
            </h2>
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
                      <p className="text-sm font-medium text-gray-900">
                        {invitation.email}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getRoleBadge(invitation.roles)}
                        <span className="text-xs text-gray-500">
                          Invited{" "}
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs text-yellow-600">
                      Expires{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={async () => {
                        setResendingInvitationId(invitation.id);
                        try {
                          await teamAPI.resendInvitation(invitation.id);
                          toast.success("Invitation resent successfully!");
                        } catch (error: any) {
                          console.error("Error resending invitation:", error);
                          toast.error(
                            error.message || "Failed to resend invitation"
                          );
                        } finally {
                          setResendingInvitationId(null);
                        }
                      }}
                      disabled={resendingInvitationId === invitation.id}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {resendingInvitationId === invitation.id ? (
                        <>
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Resending...
                        </>
                      ) : (
                        "Resend"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        confirm(
                          async () => {
                            try {
                              await teamAPI.cancelInvitation(invitation.id);
                              toast.success(
                                "Invitation cancelled successfully!"
                              );
                              await fetchTeamMembers(); // Refresh the list
                            } catch (error: any) {
                              console.error(
                                "Error cancelling invitation:",
                                error
                              );
                              toast.error(
                                error.message || "Failed to cancel invitation"
                              );
                            }
                          },
                          {
                            title: "Cancel Invitation",
                            message: `Are you sure you want to cancel the invitation for ${invitation.email}?`,
                            type: "danger",
                          }
                        );
                      }}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {paginatedMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {searchTerm ? (
                  <Search className="h-6 w-6 text-gray-400" />
                ) : (
                  <Plus className="h-6 w-6 text-gray-400" />
                )}
              </div>
              {searchTerm ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    No team members match your search criteria for "{searchTerm}
                    ".
                  </p>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No team members yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start building your team by inviting your first member.
                  </p>
                  <button
                    onClick={handleAddNew}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Invite Your First Member
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Team Member
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Role & Department
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Capacity & Rate
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Joined
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedMembers.map((member) => {
                    const isActive = member.users?.is_active || false;
                    const statusIcon = isActive
                      ? "border-green-500"
                      : "border-gray-500";

                    return (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex items-center">
                              {member?.users?.avatar_url ? (
                                <Image
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={
                                    member.users.avatar_url ||
                                    "/placeholder.svg"
                                  }
                                  alt={member.users?.full_name || "User"}
                                  width={40}
                                  height={40}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-orange-700 font-medium text-lg">
                                    {member.users?.full_name
                                      ? member.users.full_name
                                          .charAt(0)
                                          .toUpperCase()
                                      : "?"}
                                  </span>
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.users?.full_name || "Unknown User"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.users?.email || "No email"}
                                </div>
                                {member.users?.position && (
                                  <div className="text-xs text-gray-400">
                                    {member.users.position}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getRoleBadge(member.roles)}
                            {member.department && (
                              <div className="text-sm text-gray-500">
                                {member.department}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.weekly_capacity || 0}h / week
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.hourly_rate
                              ? formatCurrency(member.hourly_rate) + "/h"
                              : "Rate not set"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(member.status, isActive)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.joined_at
                              ? new Date(member.joined_at).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-gray-600 hover:text-gray-900 mr-3"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredMembers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}

        <TeamMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          member={selectedMember}
          onSave={handleSave}
        />

        <ConfirmationModal
          isOpen={confirmation.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={confirmation.title}
          message={confirmation.message}
          confirmText={confirmation.confirmText}
          cancelText={confirmation.cancelText}
          type={confirmation.type}
          isLoading={confirmation.isLoading}
        />
      </div>
    </div>
  );
};

export default TeamMembersPage;
