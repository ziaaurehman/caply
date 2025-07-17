"use client"

import { useState } from "react"
import { X, CreditCard, AlertTriangle } from "lucide-react"
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"
import { cn } from "@/lib/utils"

interface SubscriptionBannerProps {
  type?: "trial" | "upgrade" | "expired" | "payment_failed"
  message?: string
  dismissible?: boolean
  className?: string
}

export default function SubscriptionBanner({ 
  type = "upgrade",
  message,
  dismissible = true,
  className 
}: SubscriptionBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const { currentSubscription } = useSubscriptionStore()
  const { openSubscriptionModal } = useSubscriptionModal()

  // Don't show if dismissed or if user has active subscription (unless specific types)
  if (dismissed || (currentSubscription?.status === 'active' && type === 'upgrade')) {
    return null
  }

  const getConfig = () => {
    switch (type) {
      case "trial":
        return {
          bgColor: "bg-blue-50 border-blue-200",
          textColor: "text-blue-800",
          iconColor: "text-blue-600",
          icon: CreditCard,
          defaultMessage: "You're currently on a free trial. Upgrade to unlock all features.",
          buttonText: "Upgrade Now",
          buttonStyle: "bg-blue-600 hover:bg-blue-700 text-white"
        }
      case "expired":
        return {
          bgColor: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          iconColor: "text-red-600",
          icon: AlertTriangle,
          defaultMessage: "Your subscription has expired. Please renew to continue using premium features.",
          buttonText: "Renew Subscription",
          buttonStyle: "bg-red-600 hover:bg-red-700 text-white"
        }
      case "payment_failed":
        return {
          bgColor: "bg-orange-50 border-orange-200",
          textColor: "text-orange-800",
          iconColor: "text-orange-600",
          icon: AlertTriangle,
          defaultMessage: "Payment failed. Please update your payment method to continue.",
          buttonText: "Update Payment",
          buttonStyle: "bg-orange-600 hover:bg-orange-700 text-white"
        }
      default: // upgrade
        return {
          bgColor: "bg-primary-50 border-primary-200",
          textColor: "text-primary-800",
          iconColor: "text-primary-600",
          icon: CreditCard,
          defaultMessage: "Upgrade to access premium features and get the most out of your workspace.",
          buttonText: "View Plans",
          buttonStyle: "bg-primary-600 hover:bg-primary-700 text-white"
        }
    }
  }

  const config = getConfig()
  const Icon = config.icon

  return (
    <div className={cn(
      "border rounded-lg p-4 mb-4",
      config.bgColor,
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className={cn("h-5 w-5", config.iconColor)} />
          <div>
            <p className={cn("text-sm font-medium", config.textColor)}>
              {message || config.defaultMessage}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={openSubscriptionModal}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-colors",
              config.buttonStyle
            )}
          >
            {config.buttonText}
          </button>
          
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className={cn(
                "p-1 rounded-md transition-colors hover:bg-black hover:bg-opacity-10",
                config.textColor
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
