"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients & Suppliers</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your business relationships</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Clients management interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
