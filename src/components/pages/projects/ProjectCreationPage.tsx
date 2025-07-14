"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
// import { useProjectStore } from "@/lib/stores/projectStore" // No longer needed
import { CalendarIcon, UploadCloud, Plus, ChevronDown, X } from "lucide-react"
import { projectAPI, clientAPI, teamAPI, type CreateProjectData, type CreateClientData } from "@/utils/api"
import ClientModal from "@/components/pages/clients/ClientModal"

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
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false)
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

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<ProjectFormData>({
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
    setLoadingClients(true)
    try {
      const data = await clientAPI.getClients()
      setClients(data.clients)
    } catch (e) {
      console.error('Error fetching clients:', e)
    } finally {
      setLoadingClients(false)
    }
  }

  // Fetch team members from API
  const fetchTeamMembers = async () => {
    setLoadingTeamMembers(true)
    try {
      const data = await teamAPI.getTeamMembers()
      setTeamMembers(data.members)
    } catch (e) {
      console.error('Error fetching team members:', e)
    } finally {
      setLoadingTeamMembers(false)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchTeamMembers()
  }, [])

  const handleCreateClient = async (data: CreateClientData) => {
    try {
      // Call API to create client
      const result = await clientAPI.createClient(data)
      setValue('client_id', result.client.id)
      setIsClientModalOpen(false)
      fetchClients()
    } catch (error: any) {
      console.error('Failed to create client:', error)
    }
  }

  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Prepare payload for API
      const payload = {
        organization_id: "1",
        name: data.name,
        client_id: data.client_id || null,
        code: data.code,
        description: data.description,
        project_type: data.project_type,
        billing_rate: data.billing_rate,
        budget_hours: data.budget_hours,
        budget_amount: data.budget_amount,
        start_date: data.start_date,
        end_date: data.end_date,
        // Additional fields from form and state
        team_member_ids: data.selected_team_members,
        task_categories: taskCategories,
        kanban_enabled: data.kanban_activation,
        timesheet_enabled: data.timesheet_activation,
        team_availability_enabled: data.absence_integration,
        capacity_planning_enabled: data.capacity_planning,
        state: "published", // or "draft" if you want to support drafts
        // Add more fields as needed (e.g., documents)
      }

      const result = await projectAPI.createProject(payload)
      // Optionally handle file uploads here
      router.push("/projects")
    } catch (error: any) {
      console.error("Failed to create project:", error)
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
              Save as Draft
            </button>
            <button 
              onClick={handleSubmit(onSubmit)}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Create Project
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* General Information */}
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 mb-4">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <select
                      {...register('client_id')}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md appearance-none"
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
              </div>
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Project name is required' })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
                      {...register('start_date')}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="mm/dd/yyyy"
                    />
                   
                  </div>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('end_date')}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="mm/dd/yyyy"
                    />
                    
                  </div>
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
            
            <p className="text-sm text-gray-500 mb-4">Select team members who will have access to this project</p>

            <div className="relative" id="team-dropdown">
              <button
                type="button"
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
                    {...register('billing_rate')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Hours
                  </label>
                  <input
                    type="number"
                    {...register('budget_hours')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
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
                  {...register('budget_amount')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center flex flex-col items-center justify-center h-48">
              <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-orange-600 hover:text-orange-500 cursor-pointer">Drop files here</span>{" "}
                or click to upload
              </p>
              <p className="text-xs text-gray-500 mt-1">Maximum 10 files, up to 10MB each</p>
              <p className="text-xs text-gray-500">Supported formats: PDF, Word, Excel, Images</p>
            </div>
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
