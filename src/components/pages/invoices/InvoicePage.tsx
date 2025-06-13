"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function InvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">Create and manage invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Invoices interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
