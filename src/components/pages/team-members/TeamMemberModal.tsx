"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Mail, Users, DollarSign, Clock, User, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  module: string;
  action: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role_id: string;
  hourly_rate?: number;
  weekly_capacity: number;
  department?: string;
  users: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    position?: string;
  };
  roles: {
    id: string;
    name: string;
    display_name: string;
    description: string;
  };
}

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: TeamMember | null;
  onSave: (data: any) => Promise<void>;
}

interface FormData {
  email: string;
  roleId: string;
  department: string;
  hourlyRate: number;
  weeklyCapacity: number;
  message?: string;
}

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Customer Success',
  'Quality Assurance'
];

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSave,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      email: '',
      roleId: '',
      department: '',
      hourlyRate: 50,
      weeklyCapacity: 40,
      message: '',
    },
  });

  const watchedRoleId = watch('roleId');

  // Fetch roles on component mount
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      checkEmailProvider();
    }
  }, [isOpen]);

  // Update form when member changes
  useEffect(() => {
    if (member && isOpen) {
      setValue('email', member.users.email);
      setValue('roleId', member.role_id);
      setValue('department', member.department || '');
      setValue('hourlyRate', member.hourly_rate || 50);
      setValue('weeklyCapacity', member.weekly_capacity || 40);
    } else if (isOpen) {
      reset();
    }
  }, [member, isOpen, setValue, reset]);

  // Update selected role when roleId changes
  useEffect(() => {
    const role = roles.find(r => r.id === watchedRoleId);
    setSelectedRole(role || null);
  }, [watchedRoleId, roles]);

  const checkEmailProvider = async () => {
    try {
      const response = await fetch('/api/debug?check=email-provider');
      if (response.ok) {
        const data = await response.json();
        setEmailProvider(data.provider || 'console');
      }
    } catch (error) {
      console.error('Error checking email provider:', error);
      setEmailProvider('console');
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      } else {
        console.error('Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await onSave({
        ...data,
        id: member?.id
      });
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to save team member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!member;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Team Member' : 'Invite Team Member'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing 
                ? 'Update member details and permissions' 
                : 'Invite a new member to your organization with specific role and permissions'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Email Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                disabled={isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                  isEditing ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="member@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  If this email has an account, they'll be added immediately. Otherwise, they'll receive an invitation to create an account.
                  {emailProvider && emailProvider !== 'console' && (
                    <span className="ml-1 text-blue-500">
                      Email will be sent via {emailProvider === 'sendgrid' ? 'SendGrid' : 'Resend'}.
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Role & Permissions Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Role & Permissions</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                {...register('roleId', { required: 'Role is required' })}
                disabled={loadingRoles}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">
                  {loadingRoles ? 'Loading roles...' : 'Select a role'}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name}
                  </option>
                ))}
              </select>
              {errors.roleId && (
                <p className="mt-1 text-sm text-error-600">{errors.roleId.message}</p>
              )}
            </div>

            {/* Role Details & Permissions */}
            {selectedRole && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{selectedRole.display_name}</h4>
                <p className="text-sm text-blue-700 mb-3">{selectedRole.description}</p>
                
                {selectedRole.permissions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-2">Permissions included:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRole.permissions.slice(0, 6).map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span className="text-xs text-blue-700">{permission.display_name}</span>
                        </div>
                      ))}
                      {selectedRole.permissions.length > 6 && (
                        <div className="text-xs text-blue-600 col-span-2">
                          +{selectedRole.permissions.length - 6} more permissions
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Work Details Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Work Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  {...register('department')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Weekly Capacity (hours)
                </label>
                <input
                  type="number"
                  {...register('weeklyCapacity', {
                    required: 'Weekly capacity is required',
                    min: { value: 1, message: 'Capacity must be at least 1 hour' },
                    max: { value: 168, message: 'Capacity cannot exceed 168 hours' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {errors.weeklyCapacity && (
                  <p className="mt-1 text-sm text-error-600">{errors.weeklyCapacity.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Hourly Rate (CAD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('hourlyRate', {
                    min: { value: 0, message: 'Rate must be positive' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="50.00"
                />
                {errors.hourlyRate && (
                  <p className="mt-1 text-sm text-error-600">{errors.hourlyRate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invitation Message (only for new invites) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Invitation Message</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Personal Message (Optional)
                </label>
                <textarea
                  {...register('message')}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Add a personal message to your invitation..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be included in the invitation email.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
            >
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Sending Invitation...') 
                : (isEditing ? 'Update Member' : 'Send Invitation')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberModal;
