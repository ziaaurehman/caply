"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Mail, Clock, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import { useRBACStore } from '@/lib/stores/rbacStore';
import { Invitation, Role } from '@/lib/types';
import { AdminOnly, ManagerOrAbove } from '@/components/ui/rbac/ProtectedComponent';

export default function UserInvitationPage() {
  const {
    invitations,
    roles,
    isLoading,
    error,
    fetchInvitations,
    fetchRoles,
    createInvitation,
    cancelInvitation,
    resendInvitation,
  } = useRBACStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInvitations();
    fetchRoles();
  }, [fetchInvitations, fetchRoles]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      try {
        await cancelInvitation(id);
      } catch (error) {
        console.error('Failed to cancel invitation:', error);
      }
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      await resendInvitation(id);
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Invitations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite new team members to join your organization
          </p>
        </div>
        
        <ManagerOrAbove>
          <Button
            variant="default"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={18} />}
          >
            Send Invitation
          </Button>
        </ManagerOrAbove>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No invitations found. Send your first invitation to get started.
                    </td>
                  </tr>
                ) : (
                  invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {invitation.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {invitation.role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invitation.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                            {invitation.status}
                            {invitation.status === 'pending' && isExpired(invitation.expiresAt) && ' (Expired)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {invitation.invitedByUser.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {invitation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(invitation.id)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Resend invitation"
                              >
                                <RefreshCw size={16} />
                              </button>
                              <AdminOnly>
                                <button
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Cancel invitation"
                                >
                                  <X size={16} />
                                </button>
                              </AdminOnly>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Modal */}
      {isModalOpen && (
        <InvitationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          roles={roles}
          onSend={async (invitationData) => {
            try {
              await createInvitation({
                ...invitationData,
                organizationId: '1', // Default for demo
                invitedBy: '1', // Current user ID - would come from session
              });
              setIsModalOpen(false);
            } catch (error) {
              console.error('Failed to send invitation:', error);
            }
          }}
        />
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
}

// Invitation Modal Component
interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSend: (invitationData: { email: string; roleId: string }) => Promise<void>;
}

function InvitationModal({ isOpen, onClose, roles, onSend }: InvitationModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSend({ email, roleId });
      setEmail('');
      setRoleId('');
    } catch (error) {
      console.error('Failed to send invitation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Send Invitation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            >
              <option value="">Select a role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <div className="text-sm text-blue-700">
              <strong>Note:</strong> The invitation will be valid for 7 days. 
              The invitee will receive an email with instructions to join your organization.
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? undefined : <Mail size={18} />}
            >
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 