"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure your application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Settings interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
