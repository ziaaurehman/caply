"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/Card"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: {
    value: string
    positive: boolean
  }
  alert?: {
    type: "warning" | "error" | "success"
    message: string
  }
  onClick?: () => void
}

export default function StatCard({ title, value, icon, change, alert, onClick }: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? "hover:bg-gray-50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className={`mt-1 text-sm ${change.positive ? "text-success-600" : "text-error-600"}`}>
                {change.positive ? "+" : "-"}
                {change.value}
              </p>
            )}
            {alert && (
              <p
                className={`mt-1 text-xs ${
                  alert.type === "warning"
                    ? "text-warning-600"
                    : alert.type === "error"
                      ? "text-error-600"
                      : "text-success-600"
                }`}
              >
                {alert.message}
              </p>
            )}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
