import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import AttachmentSection from '../../components/ui/AttachmentSection';
import { FileWithPreview } from '../../components/ui/FileUpload';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
}

const mockClients: Client[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', company: 'Acme Corp' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', company: 'Tech Inc' },
];

const defaultTaskCategories = [
  'Business Development',
  'Design',
  'Marketing',
  'Programming',
  'Project Management',
];

const ProjectCreationPage: React.FC = () => {
  // General Information
  const [selectedClient, setSelectedClient] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  
  // Access & Visibility
  const [visibility, setVisibility] = useState<'admin' | 'everyone'>('admin');
  
  // Project Type & Budget
  const [projectType, setProjectType] = useState<'time-materials' | 'fixed-fee' | 'non-billable'>('time-materials');
  const [billableRate, setBillableRate] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetHours, setBudgetHours] = useState('');
  const [monthlyReset, setMonthlyReset] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState('80');
  
  // Tasks
  const [taskCategories, setTaskCategories] = useState(defaultTaskCategories);
  const [newCategory, setNewCategory] = useState('');
  
  // Team
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    role: 'Admin' | 'Manager' | 'Contributor';
    manages: boolean;
  }>>([]);
  
  // Add-ons
  const [capacityPlanning, setCapacityPlanning] = useState(true);
  const [absenceIntegration, setAbsenceIntegration] = useState(true);
  const [timesheetEnabled, setTimesheetEnabled] = useState(true);
  const [timesheetType, setTimesheetType] = useState<'task' | 'day'>('task');
  
  // Attachments
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Project</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up a new project with all necessary details
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {/* Save as draft */}}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
          >
            Create Project
          </Button>
        </div>
      </div>

      <form className="space-y-6">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Select client...</option>
                  {mockClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company} ({client.name})
                    </option>
                  ))}
                  <option value="new">+ Add New Client</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project Code (Optional)
                </label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Description / Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Access & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Access & Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="admin"
                    checked={visibility === 'admin'}
                    onChange={(e) => setVisibility(e.target.value as 'admin' | 'everyone')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">🔒 Admins and Project Managers only</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="everyone"
                    checked={visibility === 'everyone'}
                    onChange={(e) => setVisibility(e.target.value as 'admin' | 'everyone')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">🌐 Everyone on the project</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Type */}
        <Card>
          <CardHeader>
            <CardTitle>Project Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="time-materials"
                    checked={projectType === 'time-materials'}
                    onChange={(e) => setProjectType(e.target.value as typeof projectType)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">Time & Materials</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="fixed-fee"
                    checked={projectType === 'fixed-fee'}
                    onChange={(e) => setProjectType(e.target.value as typeof projectType)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">Fixed Fee</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="non-billable"
                    checked={projectType === 'non-billable'}
                    onChange={(e) => setProjectType(e.target.value as typeof projectType)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">Non-Billable</span>
                </label>
              </div>

              {projectType === 'time-materials' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Billable Rate ($/hr)
                    </label>
                    <input
                      type="number"
                      value={billableRate}
                      onChange={(e) => setBillableRate(e.target.value)}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Budget Hours
                    </label>
                    <input
                      type="number"
                      value={budgetHours}
                      onChange={(e) => setBudgetHours(e.target.value)}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}

              {projectType === 'fixed-fee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fixed Fee Amount
                  </label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
              )}

              {projectType !== 'non-billable' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Budget Alert Threshold
                    </label>
                    <select
                      value={budgetAlert}
                      onChange={(e) => setBudgetAlert(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="50">50% of budget</option>
                      <option value="75">75% of budget</option>
                      <option value="80">80% of budget</option>
                      <option value="90">90% of budget</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={monthlyReset}
                        onChange={(e) => setMonthlyReset(e.target.checked)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Reset budget monthly
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Task Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {taskCategories.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-100 rounded-full px-3 py-1"
                  >
                    <span className="text-sm text-gray-700">{category}</span>
                    <button
                      type="button"
                      onClick={() => setTaskCategories(cats => cats.filter(c => c !== category))}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add new category..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newCategory.trim()) {
                      setTaskCategories([...taskCategories, newCategory.trim()]);
                      setNewCategory('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        <Card>
          <CardHeader>
            <CardTitle>Caply Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Capacity Planning</span>
                    <p className="text-sm text-gray-500">Link project with resource availability</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={capacityPlanning}
                    onChange={(e) => setCapacityPlanning(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Absence Integration</span>
                    <p className="text-sm text-gray-500">View team availability in planning</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={absenceIntegration}
                    onChange={(e) => setAbsenceIntegration(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Timesheet Activation</span>
                    <p className="text-sm text-gray-500">Enable time tracking for this project</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={timesheetEnabled}
                    onChange={(e) => setTimesheetEnabled(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                </label>

                {timesheetEnabled && (
                  <div className="ml-6 mt-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Time Entry Type
                    </label>
                    <select
                      value={timesheetType}
                      onChange={(e) => setTimesheetType(e.target.value as 'task' | 'day')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="task">Task-based</option>
                      <option value="day">Day-based</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <AttachmentSection
          files={attachments}
          onFilesChange={setAttachments}
          title="Project Documents"
          maxFiles={10}
          maxSize={10}
          accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
        />
      </form>
    </div>
  );
};

export default ProjectCreationPage;