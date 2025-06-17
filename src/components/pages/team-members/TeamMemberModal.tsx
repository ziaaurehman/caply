"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useEmployeeStore } from '@/lib/stores/employeeStore';
import { Employee } from '@/lib/types';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

interface FormData {
  name: string;
  email: string;
  position: string;
  department: string;
  availability: 'full-time' | 'part-time' | 'contractor';
  capacityHours: number;
  startDate: string;
  skills: string[];
}

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const { addEmployee, updateEmployee } = useEmployeeStore();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: employee || {
      name: '',
      email: '',
      position: '',
      department: '',
      availability: 'full-time',
      capacityHours: 40,
      startDate: new Date().toISOString().split('T')[0],
      skills: [],
    },
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      if (employee) {
        await updateEmployee(employee.id, data);
      } else {
        await addEmployee(data);
      }
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to save team member:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {employee ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Position
            </label>
            <input
              type="text"
              {...register('position', { required: 'Position is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.position && (
              <p className="mt-1 text-sm text-error-600">{errors.position.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              {...register('department', { required: 'Department is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Select department</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-error-600">{errors.department.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Availability
            </label>
            <select
              {...register('availability')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weekly Capacity (hours)
            </label>
            <input
              type="number"
              {...register('capacityHours', {
                required: 'Capacity is required',
                min: { value: 0, message: 'Capacity must be positive' },
                max: { value: 168, message: 'Capacity cannot exceed 168 hours' },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.capacityHours && (
              <p className="mt-1 text-sm text-error-600">{errors.capacityHours.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-error-600">{errors.startDate.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Skills (comma separated)
            </label>
            <input
              type="text"
              {...register('skills')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="React, TypeScript, UI Design"
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
            >
              {employee ? 'Update' : 'Add'} Team Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberModal;
