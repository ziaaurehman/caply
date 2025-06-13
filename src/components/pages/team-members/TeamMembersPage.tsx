"use client"

import { useEffect } from "react"
import { useEmployeeStore } from "@/lib/stores/employeeStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { Plus } from "lucide-react"

export default function TeamMembersPage() {
  const { employees, fetchEmployees } = useEmployeeStore()

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your team and their capacities</p>
        </div>

        <Button variant="primary" leftIcon={<Plus size={18} />}>
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium">{employee.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-gray-500">{employee.position}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Capacity: {employee.capacityHours}h/week</p>
                  <p className="text-xs text-gray-500">Department: {employee.department}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
