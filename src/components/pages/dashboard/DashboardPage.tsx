"use client"

import { useEffect } from "react"
import { Users, Clock, Briefcase, Calendar } from "lucide-react"
import StatCard from "./StatCard"
import { useEmployeeStore } from "@/lib/stores/employeeStore"
import { useProjectStore } from "@/lib/stores/projectStore"

export default function DashboardPage() {
  const { employees, fetchEmployees } = useEmployeeStore()
  const { projects, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchEmployees()
    fetchProjects()
  }, [fetchEmployees, fetchProjects])

  const activeProjects = projects.filter((p) => p.status === "in-progress")
  const totalHours = 1250 // Mock data
  const utilizationRate = 85 // Mock data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your resources, projects, and capacity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Team Members"
          value={employees.length}
          icon={<Users size={24} className="text-primary-600" />}
        />

        <StatCard
          title="Active Projects"
          value={activeProjects.length}
          icon={<Briefcase size={24} className="text-primary-600" />}
        />

        <StatCard
          title="Resource Utilization"
          value={`${utilizationRate}%`}
          icon={<Calendar size={24} className="text-primary-600" />}
        />

        <StatCard
          title="Hours Logged"
          value={totalHours.toFixed(1)}
          icon={<Clock size={24} className="text-primary-600" />}
        />
      </div>
    </div>
  )
}
