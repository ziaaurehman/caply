"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function LeavePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <p className="mt-1 text-sm text-gray-500">Request and manage time off</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Leave management interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
