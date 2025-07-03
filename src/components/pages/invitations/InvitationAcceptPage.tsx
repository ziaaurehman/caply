"use client"

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircle, XCircle, Mail, User, Calendar, Building, Loader } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSession } from 'next-auth/react';

interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  organization?: {
    id: string;
    name: string;
    description?: string;
  };
  role?: {
    id: string;
    name: string;
    display_name: string;
  };
  inviter?: {
    id: string;
    full_name: string;
    email: string;
  };
}

const InvitationAcceptPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<OrganizationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'details' | 'success' | 'error'>('loading');

  const supabase = createClient();

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('No invitation token provided');
        setStep('error');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organization_invitations')
          .select(`
            *,
            organization:organizations(id, name, description),
            role:roles(id, name, display_name),
            inviter:users(id, full_name, email)
          `)
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          setError('Invitation not found or has expired');
          setStep('error');
          setLoading(false);
          return;
        }

        // Check if invitation has expired
        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired');
          setStep('error');
          setLoading(false);
          return;
        }

        setInvitation(data);
        setStep('details');
        setLoading(false);
      } catch (err) {
        setError('Failed to load invitation details');
        setStep('error');
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, supabase]);

  const handleAccept = async () => {
    if (!invitation || !session?.user) {
      setError('You must be logged in to accept invitations');
      return;
    }
    
    setAccepting(true);
    try {
      // Check if user email matches invitation email
      if (session.user.email !== invitation.email) {
        setError('This invitation is for a different email address');
        setAccepting(false);
        return;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw updateError;
      }

      // Add user as organization member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: session.user.id,
          role_id: invitation.role_id,
          status: 'active'
        });

      if (memberError) {
        throw memberError;
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setStep('error');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitation.id);

      if (error) {
        throw error;
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    }
  };

  const getRoleDescription = (roleName?: string) => {
    switch (roleName) {
      case 'admin':
        return 'You will have full administrative access to the organization.';
      case 'manager':
        return 'You can manage projects, approve time entries, and oversee team members.';
      case 'member':
        return 'You will have access to projects and can track time and expenses.';
      default:
        return 'You will have standard member access to this organization.';
    }
  };

  const getRoleColor = (roleName?: string) => {
    switch (roleName) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'manager': return 'text-blue-600 bg-blue-100';
      case 'member': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading || step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading invitation...</h3>
            <p className="text-gray-500">Please wait while we load your invitation details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Invitation</h3>
            <p className="text-gray-500 mb-4">
              {error || 'This invitation is invalid, expired, or has already been used.'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to the Team!</h3>
            <p className="text-gray-500 mb-6">
              You are now a member of <strong>{invitation?.organization?.name}</strong>. 
              You can start collaborating with your team right away.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => router.push('/projects')} 
                variant="outline"
                className="w-full"
              >
                View Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invitation Not Found</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find this invitation. It may have expired or been cancelled.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Organization Invitation</CardTitle>
          <p className="text-gray-500">You've been invited to join an organization</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Organization</h4>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">{invitation.organization?.name}</p>
              {invitation.organization?.description && (
                <p className="text-gray-600">{invitation.organization.description}</p>
              )}
            </div>
          </div>

          {/* Role Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Your Role</h4>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role?.name)}`}>
                {invitation.role?.display_name}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {getRoleDescription(invitation.role?.name)}
            </p>
          </div>

          {/* Inviter Details */}
          {invitation.inviter && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Invited by</h4>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{invitation.inviter.full_name}</p>
                  <p className="text-sm text-gray-500">{invitation.inviter.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
              leftIcon={<CheckCircle className="h-4 w-4" />}
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              className="w-full"
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Decline
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Make sure you're logged in with the email address <strong>{invitation.email}</strong> to accept this invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationAcceptPage; 