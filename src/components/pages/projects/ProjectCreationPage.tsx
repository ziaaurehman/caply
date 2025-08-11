"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
// import { useProjectStore } from "@/lib/stores/projectStore" // No longer needed
import { CalendarIcon, UploadCloud, Plus, ChevronDown, X, FileText, Download, Trash, Image } from "lucide-react"
import { projectAPI as projectAPIFromIndex, clientAPI, teamAPI, type CreateProjectData, type CreateClientData, type ProjectDocument } from "@/utils/api"
import { projectAPI as projectAPIDirect } from "@/utils/api/project"
import ClientModal from "@/components/pages/clients/ClientModal"
import { useOrganizationStore } from "@/lib/stores/organizationStore"
import { toast } from "sonner"

interface ProjectFormData {
  name: string
  client_id?: string
  code?: string
  description?: string
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable'
  billing_rate?: number
  budget_hours?: number
  budget_amount?: number
  start_date?: string
  end_date?: string
  selected_team_members: string[]
  budget_alert_threshold: number
  reset_budget_monthly: boolean
  task_categories: string[]
  capacity_planning: boolean
  absence_integration: boolean
  timesheet_activation: boolean
  time_entry_type: 'task_based' | 'project_based'
  kanban_activation: boolean
}

// Real client data from API
interface Client {
  id: string;
  name: string;
}

// Real team members data from API
interface TeamMember {
  id: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    full_name: string;
    position?: string;
  };
  roles: {
    id: string;
    name: string;
    display_name: string;
  };
}

const predefinedCategories = [
  "Business Development",
  "Design", 
  "Marketing",
  "Programming",
  "Project Management"
]

export default function ProjectCreationPage() {
  const router = useRouter()
  // const { addProject } = useProjectStore() // No longer needed
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<ProjectDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false)
  
  const { currentOrganization } = useOrganizationStore()
  const [taskCategories, setTaskCategories] = useState<string[]>([
    "Business Development",
    "Design",
    "Marketing",
    "Programming",
    "Project Management",
  ])
  const [newCategory, setNewCategory] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset, trigger } = useForm<ProjectFormData>({
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      name: '',
      project_type: 'time_materials',
      budget_alert_threshold: 80,
      reset_budget_monthly: false,
      task_categories: [],
      capacity_planning: true,
      absence_integration: true, 
      timesheet_activation: true,
      time_entry_type: 'task_based',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selected_team_members: [],
      kanban_activation: true,
    }
  })

  const watchedProjectType = watch('project_type')

  // Add this function to handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('team-dropdown')
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Add this function to get selected team members count
  const getSelectedTeamMembersCount = (selectedIds: string[]) => {
    return selectedIds.length > 0 ? `${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''} selected` : 'Select team members'
  }

  // Fetch clients from API
  const fetchClients = async () => {
    if (!currentOrganization?.id) return
    
    setLoadingClients(true)
    try {
      const data = await clientAPI.getClients(currentOrganization.id)
      setClients(data.clients)
    } catch (e) {
      console.error('Error fetching clients:', e)
    } finally {
      setLoadingClients(false)
    }
  }

  // Fetch team members from API
  const fetchTeamMembers = async () => {
    if (!currentOrganization?.id) return
    
    setLoadingTeamMembers(true)
    try {
      const data = await teamAPI.getTeamMembers(currentOrganization.id)
      setTeamMembers(data.members)
    } catch (e) {
      console.error('Error fetching team members:', e)
    } finally {
      setLoadingTeamMembers(false)
    }
  }

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchClients()
      fetchTeamMembers()
    }
  }, [currentOrganization?.id])

  const handleCreateClient = async (data: CreateClientData) => {
    if (!currentOrganization?.id) {
      console.error('No current organization selected');
      return;
    }

    try {
      // Call API to create client
      const result = await clientAPI.createClient({
        ...data,
        organizationId: currentOrganization.id
      })
      setValue('client_id', result.client.id)
      setIsClientModalOpen(false)
      fetchClients()
    } catch (error: any) {
      console.error('Failed to create client:', error)
    }
  }

  const onSubmit = async (data: ProjectFormData) => {
    if (!currentOrganization?.id) {
      const errorMessage = 'No organization selected. Please refresh the page and try again.';
      setSubmitError(errorMessage);
      toast.error('Organization Error', {
        description: errorMessage,
        duration: 5000,
      });
      return;
    }

    // Validate client selection
    if (!data.client_id) {
      const errorMessage = 'Please select a client for this project.';
      setSubmitError(errorMessage);
      toast.error('Validation Error', {
        description: errorMessage,
        duration: 5000,
      });
      return;
    }

    // Validate team members selection
    if (!data.selected_team_members || data.selected_team_members.length === 0) {
      const errorMessage = 'Please select at least one team member for this project.';
      setSubmitError(errorMessage);
      toast.error('Validation Error', {
        description: errorMessage,
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare payload for API with proper null handling for numeric fields
      const payload = {
        organization_id: currentOrganization.id,
        name: data.name,
        client_id: data.client_id || undefined,
        code: data.code || undefined,
        description: data.description || undefined,
        project_type: data.project_type,
        // Handle numeric fields based on project type
        billing_rate: data.project_type === 'time_materials' && data.billing_rate ? Number(data.billing_rate) : undefined,
        budget_hours: data.project_type === 'time_materials' && data.budget_hours ? Number(data.budget_hours) : undefined,
        budget_amount: data.project_type === 'fixed_fee' && data.budget_amount ? Number(data.budget_amount) : undefined,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        // Additional fields from form and state
        team_member_ids: data.selected_team_members,
        task_categories: taskCategories,
        kanban_enabled: data.kanban_activation,
        timesheet_enabled: data.timesheet_activation,
        team_availability_enabled: data.absence_integration,
        capacity_planning_enabled: data.capacity_planning,
        state: "published",
        // Add more fields as needed (e.g., documents)
      }

      const result = await projectAPIDirect.createProject(payload)
      
      // Upload files if any were selected
      if (uploadedFiles.length > 0) {
        toast.info('Uploading project documents...', {
          description: `Uploading ${uploadedFiles.length} file(s)...`,
        });
        
        for (const file of uploadedFiles) {
          try {
            await (projectAPIDirect || projectAPIFromIndex).uploadProjectDocument({
              projectId: result.project.id,
              file,
              organizationId: currentOrganization.id
            });
          } catch (error) {
            console.error('Error uploading file:', file.name, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        
        toast.success('Project documents uploaded successfully!');
      }
      
      // Show success toast
      toast.success(`Project "${data.name}" created successfully!`, {
        description: "You can now start managing your project and assign tasks.",
        duration: 5000,
      })
      router.push("/projects")
    } catch (error: any) {
      console.error("Failed to create project:", error)
      const errorMessage = error.message || 'Failed to create project. Please check all required fields and try again.';
      setSubmitError(errorMessage);
      toast.error('Failed to create project', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !taskCategories.includes(newCategory.trim())) {
      setTaskCategories([...taskCategories, newCategory.trim()])
      setNewCategory("")
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    setTaskCategories(taskCategories.filter((category) => category !== categoryToRemove))
  }

  // File upload handlers
  const handleFileUpload = async (files: File[]) => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }

    setIsUploading(true);
    try {
      // For now, just store files locally - they'll be uploaded after project creation
      setUploadedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) selected for upload`);
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to process files');
    } finally {
      setIsUploading(false);
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  const handleDownloadDocument = async (doc: ProjectDocument) => {
    try {
      const response = await (projectAPIDirect || projectAPIFromIndex).getProjectDocumentDownload(
        doc.project_id,
        doc.id,
        currentOrganization!.id
      );
      
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = doc.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download file');
    }
  }

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    try {
      await (projectAPIDirect || projectAPIFromIndex).deleteProjectDocument(
        doc.project_id,
        doc.id,
        currentOrganization!.id
      );
      
      setUploadedDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  }

  return (
    <div className="bg-gray-50 p-2">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Create New Project</h1>
            <p className="text-sm text-gray-500">Set up a new project with all necessary details</p>
          </div>
          <div className="space-x-3">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                const isValid = await trigger();
                if (isValid) {
                  handleSubmit(onSubmit)();
                } else {
                  // Show validation errors in toast
                  const errorMessages = Object.values(errors).map(error => error?.message).filter(Boolean);
                  if (errorMessages.length > 0) {
                    toast.error('Please fix the following errors:', {
                      description: errorMessages.join(', '),
                      duration: 5000,
                    });
                  }
                }
              }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>

        {/* Error Message Display */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error creating project</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{submitError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* General Information */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <select
                      {...register('client_id', {
                        required: 'Please select a client for this project'
                      })}
                      className={`block w-full pl-3 pr-10 py-2 text-base border focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none ${
                        errors.client_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={loadingClients}
                    >
                      <option value="">{loadingClients ? 'Loading clients...' : 'Select client...'}</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(true)}
                    className="px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>}
              </div>
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  {...register('name', { 
                    required: 'Project name is required',
                    minLength: {
                      value: 2,
                      message: 'Project name must be at least 2 characters long'
                    },
                    maxLength: {
                      value: 255,
                      message: 'Project name must be less than 255 characters'
                    }
                  })}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="projectCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Code (Optional)
                </label>
                <input
                  type="text"
                  {...register('code')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('start_date', {
                        required: 'Start date is required'
                      })}
                      className={`block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                        errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>}
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('end_date', {
                        validate: {
                          afterStartDate: (value) => {
                            const startDate = watch('start_date');
                            if (!value || !startDate) return true;
                            return new Date(value) >= new Date(startDate) || 'End date must be after start date';
                          }
                        }
                      })}
                      className={`block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                        errors.end_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Project Description / Notes
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Team Members Section */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 mr-2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <h2 className="text-lg font-medium text-gray-800">Team Members</h2>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Select team members who will have access to this project <span className="text-red-500">*</span></p>

            <div className="relative" id="team-dropdown">
              <button
                type="button"
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className={`relative w-full bg-white border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                  errors.selected_team_members ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <span className="block truncate">
                  {getSelectedTeamMembersCount(watch('selected_team_members') || [])}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </span>
              </button>

              {isTeamDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <div className="p-2 space-y-1">
                    {loadingTeamMembers ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">Loading team members...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">No team members found</div>
                    ) : (
                    teamMembers.map((member) => (
                      <label key={member.id} className="flex items-center px-2 py-1.5 hover:bg-orange-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          value={member.id}
                          {...register('selected_team_members')}
                          className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="ml-2 text-sm text-gray-700">{member.users.full_name}</span>
                        <span className="ml-1 text-xs text-gray-500">({member.roles.display_name})</span>
                      </label>
                    )))}
                  </div>
                </div>
              )}
            </div>
            {errors.selected_team_members && (
              <p className="mt-1 text-sm text-red-600">{errors.selected_team_members.message}</p>
            )}
          </div>

          {/* Project Type */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Project Type</h2>
            <div className="flex items-center space-x-6 mb-4">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="radio"
                  {...register('project_type')}
                  value="time_materials"
                  className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <span className="ml-2">Time & Materials</span>
              </label>
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="radio"
                  {...register('project_type')}
                  value="fixed_fee"
                  className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <span className="ml-2">Fixed Fee</span>
              </label>
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="radio"
                  {...register('project_type')}
                  value="non_billable"
                  className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <span className="ml-2">Non-Billable</span>
              </label>
            </div>

            {watchedProjectType === "time_materials" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label htmlFor="billableRate" className="block text-sm font-medium text-gray-700 mb-1">
                    Billable Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('billing_rate', {
                      required: watchedProjectType === 'time_materials' ? 'Billing rate is required for Time & Materials projects' : false,
                      validate: {
                        validNumber: (value) => {
                          if (watchedProjectType !== 'time_materials') return true;
                          if (!value) return true; // Let required handle empty values
                          const num = Number(value);
                          if (isNaN(num)) return 'Please enter a valid number';
                          if (num < 0) return 'Billing rate must be greater than or equal to 0';
                          if (num > 10000) return 'Billing rate must be less than $10,000/hour';
                          return true;
                        }
                      }
                    })}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      errors.billing_rate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.billing_rate && <p className="mt-1 text-sm text-red-600">{errors.billing_rate.message}</p>}
                </div>
                <div>
                  <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    {...register('budget_hours', {
                      validate: {
                        validNumber: (value) => {
                          if (watchedProjectType !== 'time_materials') return true;
                          if (!value) return true; // Optional field
                          const num = Number(value);
                          if (isNaN(num)) return 'Please enter a valid number';
                          if (num < 0) return 'Budget hours must be greater than or equal to 0';
                          if (num > 100000) return 'Budget hours must be less than 100,000';
                          return true;
                        }
                      }
                    })}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      errors.budget_hours ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.budget_hours && <p className="mt-1 text-sm text-red-600">{errors.budget_hours.message}</p>}
                </div>
              </div>
            )}
            {watchedProjectType === "fixed_fee" && (
              <div className="mb-4">
                <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Fixed Fee Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('budget_amount', {
                    required: watchedProjectType === 'fixed_fee' ? 'Fixed fee amount is required for Fixed Fee projects' : false,
                    validate: {
                      validNumber: (value) => {
                        if (watchedProjectType !== 'fixed_fee') return true;
                        if (!value) return true; // Let required handle empty values
                        const num = Number(value);
                        if (isNaN(num)) return 'Please enter a valid number';
                        if (num < 0) return 'Budget amount must be greater than or equal to 0';
                        if (num > 10000000) return 'Budget amount must be less than $10,000,000';
                        return true;
                      }
                    }
                  })}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    errors.budget_amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.budget_amount && <p className="mt-1 text-sm text-red-600">{errors.budget_amount.message}</p>}
              </div>
            )}

            {(watchedProjectType === "time_materials" || watchedProjectType === "fixed_fee") && (
              <>
                <div className="mb-4">
                  <label htmlFor="budgetAlertThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Alert Threshold
                  </label>
                  <div className="relative">
                    <select
                      {...register('budget_alert_threshold')}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
                    >
                      <option value={80}>80% of budget</option>
                      <option value={90}>90% of budget</option>
                      <option value={95}>95% of budget</option>
                      <option value={100}>100% of budget</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <label className="flex items-center text-sm text-gray-700">
                  <input 
                    type="checkbox" 
                    {...register('reset_budget_monthly')}
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" 
                  />
                  <span className="ml-2">Reset budget monthly</span>
                </label>
              </>
            )}
          </div>

          {/* Task Categories */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Task Categories</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {taskCategories.map((category, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-2 -mr-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <span className="sr-only">Remove category</span>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                placeholder="Add new category..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="ml-3 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Caply Add-ons */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Caply Add-ons</h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <label htmlFor="capacityPlanning" className="block text-sm font-medium text-gray-700">
                    Capacity Planning
                  </label>
                  <p className="text-xs text-gray-500">Link project with resource availability</p>
                </div>
                <input
                  type="checkbox"
                  {...register('capacity_planning')}
                  className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <label htmlFor="absenceIntegration" className="block text-sm font-medium text-gray-700">
                    Absence Integration
                  </label>
                  <p className="text-xs text-gray-500">View team availability in planning</p>
                </div>
                <input
                  type="checkbox"
                  {...register('absence_integration')}
                  className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <label htmlFor="kanbanActivation" className="block text-sm font-medium text-gray-700">
                    Kanban Activation
                  </label>
                  <p className="text-xs text-gray-500">Enable Kanban board for this project</p>
                </div>
                <input
                  type="checkbox"
                  {...register('kanban_activation')}
                  className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </div>
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <label htmlFor="timesheetActivation" className="block text-sm font-medium text-gray-700">
                      Timesheet Activation
                    </label>
                    <p className="text-xs text-gray-500">Allow time tracking for this project</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('timesheet_activation')}
                    className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </div>
                <div className="ml-6">
                  <label htmlFor="timeEntryType" className="block text-sm font-medium text-gray-700 mb-1">
                    Time Entry Type
                  </label>
                  <div className="relative">
                    <select
                      {...register('time_entry_type')}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
                    >
                      <option value="task_based">Task-based</option>
                      <option value="project_based">Project-based</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Documents */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Project Documents</h2>
            
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center flex flex-col items-center justify-center h-48 mb-4">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleFileUpload(files);
                  }
                }}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <UploadCloud className={`h-10 w-10 mb-3 ${isUploading ? 'text-gray-300' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600">
                  <span className={`font-medium ${isUploading ? 'text-gray-400' : 'text-orange-600 hover:text-orange-500'}`}>
                    {isUploading ? 'Uploading...' : 'Drop files here'}
                  </span>{" "}
                  or click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">Maximum 10 files, up to 10MB each</p>
                <p className="text-xs text-gray-500">Supported formats: PDF, Word, Excel, Images, Text</p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Selected Files ({uploadedFiles.length})</h3>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <Image className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      disabled={isUploading}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Documents (for editing) */}
            {uploadedDocuments.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-medium text-gray-700">Existing Documents ({uploadedDocuments.length})</h3>
                {uploadedDocuments.map((document) => (
                  <div key={document.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      {document.mime_type?.startsWith('image/') ? (
                        <Image className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.original_filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {((document.file_size || 0) / 1024).toFixed(1)} KB • {new Date(document.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className="p-1 text-gray-400 hover:text-blue-500"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleCreateClient}
      />
    </div>
  )
}
