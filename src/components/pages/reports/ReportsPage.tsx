"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and view business reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Reports interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
