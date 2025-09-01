'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            // Base styles
            "w-full px-3 py-2 border rounded-lg text-sm transition-colors h-10",
            "placeholder:text-gray-400",
            // Remove default focus outline and add custom focus styles
            "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
            // Default border
            "border-gray-300",
            // Error state
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            // Disabled state
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200",
            className
          )}
          ref={ref}
          {...props}
        />
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

Input.displayName = "Input"

export { Input }
