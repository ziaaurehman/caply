import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { Users, Clock, Calendar, ListTodo, Building2, Truck, Plus } from 'lucide-react';

type SettingsTab = 'roles' | 'hours' | 'timesheets' | 'tasks' | 'clients' | 'suppliers';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('roles');
  const { user } = useAuthStore();
  
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access settings.</p>
      </div>
    );
  }
  
  const RolesAndLicenses = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Roles & Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">License Usage</h3>
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Licenses</p>
                  <p className="text-2xl font-semibold text-gray-900">25</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Used</p>
                  <p className="text-2xl font-semibold text-primary-600">18</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-2xl font-semibold text-success-600">7</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Sample user rows */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium">JD</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">John Doe</div>
                          <div className="text-sm text-gray-500">john@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Employee</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-100 text-success-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">
                        Deactivate
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const DefaultHours = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Hours & Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Default Capacity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Weekly Hours by Role
                  </label>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 w-24">Admin:</span>
                      <input
                        type="number"
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        defaultValue={40}
                      />
                      <span className="text-sm text-gray-500">hours</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 w-24">Manager:</span>
                      <input
                        type="number"
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        defaultValue={40}
                      />
                      <span className="text-sm text-gray-500">hours</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 w-24">Employee:</span>
                      <input
                        type="number"
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        defaultValue={40}
                      />
                      <span className="text-sm text-gray-500">hours</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Working Days
                  </label>
                  <div className="mt-2 space-y-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <div key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={!['Saturday', 'Sunday'].includes(day)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">{day}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Holidays</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Holiday Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      New Year's Day
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      January 1, 2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">
                        Remove
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <Button variant="outline" className="mt-4" leftIcon={<Calendar size={16} />}>
                Add Holiday
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const TimesheetSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Submission Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Requirements</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Require manager approval for all timesheets
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Submission Deadline
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option selected>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                    <input
                      type="time"
                      defaultValue="18:00"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reminders</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Send email reminders for missing timesheets
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Send in-app notifications
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reminder Schedule
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option>Every day until submitted</option>
                    <option>Once a week</option>
                    <option>Twice a week</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const TaskTypes = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Categories & Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Task Categories</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Types
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Development
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          Frontend
                        </span>
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          Backend
                        </span>
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          API Integration
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">
                        Delete
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Testing
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          Unit Testing
                        </span>
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          Integration Testing
                        </span>
                        <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 text-xs">
                          QA
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">
                        Delete
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <Button variant="outline" className="mt-4" leftIcon={<ListTodo size={16} />}>
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ClientSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Management Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Default Client Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Auto-generate client codes
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Payment Terms
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                    <option>Due on Receipt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Currency
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option>CAD - Canadian Dollar</option>
                    <option>USD - US Dollar</option>
                    <option>EUR - Euro</option>
                    <option>GBP - British Pound</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Client Categories</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Enterprise</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Large corporate clients</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">Delete</Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">SMB</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Small and medium businesses</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">Delete</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <Button variant="outline" className="mt-4" leftIcon={<Plus size={16} />}>
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SupplierSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Management Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Default Supplier Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Auto-generate supplier codes
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Payment Terms
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                    <option>Due on Receipt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Purchase Order Approval Workflow
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option>Single Approval</option>
                    <option>Two-Step Approval</option>
                    <option>Three-Step Approval</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Categories</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Hardware</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Hardware and equipment suppliers</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">Delete</Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Services</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Service providers and contractors</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-900 mr-2">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-900">Delete</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <Button variant="outline" className="mt-4" leftIcon={<Plus size={16} />}>
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization's settings and preferences
        </p>
      </div>
      
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'roles'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center space-x-2">
            <Users size={16} />
            <span>Roles & Licenses</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('hours')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'hours'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span>Working Hours</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('timesheets')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'timesheets'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>Timesheet Rules</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'tasks'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center space-x-2">
            <ListTodo size={16} />
            <span>Task Types</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'clients'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center space-x-2">
            <Building2 size={16} />
            <span>Client Management</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === 'suppliers'
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        
        >
          <div className="flex items-center space-x-2">
            <Truck size={16} />
            <span>Supplier Management</span>
          </div>
        </button>
      </div>
      
      {activeTab === 'roles' && <RolesAndLicenses />}
      {activeTab === 'hours' && <DefaultHours />}
      {activeTab === 'timesheets' && <TimesheetSettings />}
      {activeTab === 'tasks' && <TaskTypes />}
      {activeTab === 'clients' && <ClientSettings />}
      {activeTab === 'suppliers' && <SupplierSettings />}
    </div>
  );
};

export default SettingsPage;