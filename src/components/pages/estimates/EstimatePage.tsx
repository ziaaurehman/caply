"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function EstimatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Estimate</h1>
        <p className="mt-1 text-sm text-gray-500">Create and manage estimates for clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimate Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Estimates interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
