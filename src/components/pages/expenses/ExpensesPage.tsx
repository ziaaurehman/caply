"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">Track and manage business expenses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Expenses interface will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
