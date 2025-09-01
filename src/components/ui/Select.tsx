'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  helperText?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, helperText, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              // Base styles
              "w-full px-3 py-2 border rounded-lg text-sm transition-colors appearance-none bg-white",
              "placeholder:text-gray-400",
              // Remove default focus outline and add custom focus styles
              "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
              // Default border
              "border-gray-300",
              // Error state
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              // Disabled state
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200",
              // Add padding for icon
              "pr-10",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        {helperText && (
          <p className={cn(
            "mt-1 text-xs",
            error ? "text-red-600" : "text-gray-500"
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"

export { Select }
