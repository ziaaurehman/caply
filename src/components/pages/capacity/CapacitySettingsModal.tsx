"use client"

import React, { useState, useEffect } from 'react';
import { X, Settings, Clock, Users, AlertTriangle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { capacityAPI, CapacitySettings } from '@/utils/api/capacity';

interface CapacitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export default function CapacitySettingsModal({
  isOpen,
  onClose,
  projectId
}: CapacitySettingsModalProps) {
  const [formData, setFormData] = useState({
    default_weekly_capacity: 40,
    default_work_days_per_week: 5,
    allow_overallocation: false,
    overallocation_threshold: 100,
    notification_settings: {
      email_on_overallocation: true,
      email_on_capacity_changes: false,
      weekly_capacity_reports: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<CapacitySettings[]>([]);

  // Fetch settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSettings = async () => {
    try {
      const response = await capacityAPI.getSettings(projectId);
      setSettings(response.settings);
      
      // Update form data with existing settings if available
      if (response.settings.length > 0) {
        const setting = response.settings[0];
        setFormData({
          default_weekly_capacity: setting.default_weekly_capacity,
          default_work_days_per_week: setting.default_work_days_per_week,
          allow_overallocation: setting.allow_overallocation,
          overallocation_threshold: setting.overallocation_threshold,
          notification_settings: setting.notification_settings
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      await capacityAPI.updateSettings({
        project_id: projectId,
        ...formData
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Capacity Planning Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-3">
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                <p className="text-success-700 text-sm">Settings updated successfully!</p>
              </div>
            )}

            {/* Basic Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Clock size={18} />
                Default Work Schedule
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Default Hours Per Week
                  </label>
                  <input
                    type="number"
                    name="default_weekly_capacity"
                    value={formData.default_weekly_capacity}
                    onChange={handleInputChange}
                    min="1"
                    max="168"
                    step="0.5"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Standard working hours per week for new team members
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Default Work Days Per Week
                  </label>
                  <input
                    type="number"
                    name="default_work_days_per_week"
                    value={formData.default_work_days_per_week}
                    onChange={handleInputChange}
                    min="1"
                    max="7"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Standard working days per week for new team members
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity Planning Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Users size={18} />
                Capacity Management
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="allow_overallocation"
                    checked={formData.allow_overallocation}
                    onChange={handleInputChange}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Allow Overallocation
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Permit team members to be allocated more hours than their capacity
                    </p>
                  </div>
                </label>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Overallocation Threshold (%)
                  </label>
                  <input
                    type="number"
                    name="overallocation_threshold"
                    value={formData.overallocation_threshold}
                    onChange={handleInputChange}
                    min="50"
                    max="500"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Percentage threshold at which team members are considered overallocated
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} />
                Notification Settings
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="email_on_overallocation"
                    checked={formData.notification_settings.email_on_overallocation}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: {
                          ...prev.notification_settings,
                          email_on_overallocation: e.target.checked
                        }
                      }));
                    }}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Email on Overallocation
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Send email notifications when team members become overallocated
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="email_on_capacity_changes"
                    checked={formData.notification_settings.email_on_capacity_changes}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: {
                          ...prev.notification_settings,
                          email_on_capacity_changes: e.target.checked
                        }
                      }));
                    }}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Email on Capacity Changes
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Send email notifications when team member capacities are modified
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="weekly_capacity_reports"
                    checked={formData.notification_settings.weekly_capacity_reports}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: {
                          ...prev.notification_settings,
                          weekly_capacity_reports: e.target.checked
                        }
                      }));
                    }}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Weekly Capacity Reports
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Send weekly capacity utilization reports via email
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Information Panel */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-primary-900 mb-2">
                    Capacity Planning Information
                  </h4>
                  <ul className="text-xs text-primary-800 space-y-1">
                    <li>• These settings apply to this specific project</li>
                    <li>• Individual team member capacities can be customized separately</li>
                    <li>• Changes to default values only affect new team members</li>
                    <li>• Overallocation warnings will appear when thresholds are exceeded</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
