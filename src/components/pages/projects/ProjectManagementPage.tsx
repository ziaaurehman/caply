"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function ProjectManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage tasks with Kanban board</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kanban Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">To Do</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Design homepage</p>
                  <p className="text-xs text-gray-500 mt-1">Due: Tomorrow</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Setup database</p>
                  <p className="text-xs text-gray-500 mt-1">Due: Next week</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">In Progress</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Implement authentication</p>
                  <p className="text-xs text-gray-500 mt-1">Assigned to: John</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Done</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Project setup</p>
                  <p className="text-xs text-gray-500 mt-1">Completed yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
