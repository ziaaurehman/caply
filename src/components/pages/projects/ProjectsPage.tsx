"use client"

import { useEffect } from "react"
import { useProjectStore } from "@/lib/stores/projectStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function ProjectsPage() {
  const { projects, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your projects and track their progress</p>
        </div>

        <Link href="/projects/new">
          <Button variant="primary" leftIcon={<Plus size={18} />}>
            New Project
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.description}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          project.status === "in-progress"
                            ? "bg-primary-100 text-primary-800"
                            : project.status === "completed"
                              ? "bg-success-100 text-success-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {project.status.replace("-", " ").toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(project.startDate).toLocaleDateString()} -{" "}
                        {new Date(project.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Budget: ${project.budget.cost.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Actual: ${project.actual.cost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
