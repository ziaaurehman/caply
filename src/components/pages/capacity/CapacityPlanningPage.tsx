"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function CapacityPlanningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Capacity Planning</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor and manage resource allocation across projects</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Capacity planning interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
