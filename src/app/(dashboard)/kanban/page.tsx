"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import KanbanBoard from "@/components/pages/kanban/kanbanPage"
import { projectAPI } from "@/utils/api/project"

interface Project {
  id: string
  name: string
  kanban_enabled?: boolean
}

export default function Kanban() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await projectAPI.getProjects()
      const kanbanProjects = response.projects.filter(p => p.kanban_enabled)
      setProjects(kanbanProjects)
      
      // Auto-select first project if available
      if (kanbanProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(kanbanProjects[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Projects</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadProjects}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No Kanban Projects</h3>
            <p className="text-blue-600 mb-4">
              No projects with Kanban enabled were found. Create a project with Kanban enabled to get started.
            </p>
            <a 
              href="/dashboard/projects"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
            >
              Go to Projects
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Kanban Board</h1>
            <div className="relative">
              <select 
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 h-4 w-4 text-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {selectedProjectId && (
        <KanbanBoard projectId={selectedProjectId} />
      )}
    </div>
  )
}