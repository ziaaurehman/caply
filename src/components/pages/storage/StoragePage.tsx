"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
        <p className="mt-1 text-sm text-gray-500">Manage files and documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Storage interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
