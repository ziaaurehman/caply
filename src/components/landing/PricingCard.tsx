import { Card } from "../ui/Card"
import { CheckCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useAuthStore } from "@/lib/stores/authStore"
import { useState } from "react"

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlight?: boolean
  badge?: string
  buttonText?: string
  planId?: string
  stripePriceId?: string
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlight = false,
  badge,
  buttonText = "Start Free Trial",
  planId,
  stripePriceId,
}: PricingCardProps) {
  const { data: session } = useSession()
  const { createCheckoutSession, currentSubscription, checkoutLoading } = useSubscriptionStore()
  const { organization } = useAuthStore()
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

  // Check if this specific card is in loading state
  const isThisCardLoading = checkoutLoading && processingPlanId === planId

  const getButtonText = () => {
    // Contact Sales button
    if (buttonText === "Contact Sales") {
      return buttonText
    }
    
    // Check if user already has this plan
    if (session && currentSubscription && planId && currentSubscription.subscription_plan_id === planId) {
      return 'Current Plan'
    }
    
    // Basic/Free plan
    if (name.toLowerCase() === 'basic' || price === '0') {
      return session ? 'Go to Dashboard' : 'Start Free'
    }
    
    // Paid plans
    if (!session) {
      return 'Sign Up to Subscribe'
    }
    
    // User has subscription but different plan
    if (session && currentSubscription && planId && currentSubscription.subscription_plan_id !== planId) {
      return 'Upgrade/Downgrade'
    }
    
    return buttonText
  }

  const handleSubscribe = async () => {
    // If user already has this plan, redirect to billing page
    if (session && currentSubscription && planId && currentSubscription.subscription_plan_id === planId) {
      window.location.href = '/dashboard/settings'
      return
    }

    // Free plan or Basic - redirect to signup if not authenticated
    if (name.toLowerCase() === 'basic' || price === '0') {
      if (!session) {
        window.location.href = '/signup'
        return
      }
      // If authenticated and it's Basic plan, redirect to dashboard
      window.location.href = '/dashboard'
      return
    }

    // For paid plans - handle subscription flow
    if (!session) {
      // Not authenticated - redirect to signup
      window.location.href = '/signup'
      return
    }
    if (!organization) {
      // Authenticated but org not loaded yet, do nothing (button will be disabled)
      return
    }

    if (!planId || !stripePriceId) {
      console.error('Missing planId or stripePriceId for paid plan')
      alert('This plan is not available for subscription yet.')
      return
    }

    // Track which plan is being processed
    setProcessingPlanId(planId)
    
    try {
      const checkoutUrl = await createCheckoutSession(planId, organization.id)
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert('Failed to start subscription. Please try again.')
      // Clear processing state on error
      setProcessingPlanId(null)
    }
  }

  return (
    <Card
      className={cn(
        "bg-white p-8 transition-shadow relative border h-full flex flex-col rounded-2xl group border-gray-200 hover:border-primary-600 hover:ring-2 hover:ring-primary-200 hover:scale-105",
      )}
    >
      {badge && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
            {badge}
          </div>
        </div>
      )}
      <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-extrabold text-primary-600">${price}</span>
        <span className="text-base font-medium text-gray-500">/{period}</span>
      </p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <ul className="mt-8 space-y-4 flex-1">
        {features.map((feature, featureIndex) => (
          <li key={featureIndex} className="flex items-center text-left">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mr-3 text-primary-600" />
            <span className="text-gray-500">{feature.replace(/\*\*/g, "")}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex-shrink-0">
        {buttonText === "Contact Sales" ? (
          <Link
            href="mailto:sales@yourdomain.com"
            className={cn(
              "w-full inline-flex items-center justify-center rounded-2xl px-4 py-2 text-base font-medium transition-colors border border-primary-600 bg-white text-primary-600 group-hover:bg-primary-600 group-hover:text-white group-hover:scale-105 group-hover:shadow group-hover:border-primary-600",
            )}
          >
            {buttonText}
          </Link>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={Boolean(
              isThisCardLoading ||
              (session && currentSubscription && planId && currentSubscription.subscription_plan_id === planId) ||
              (session && !organization)
            )}
            className={cn(
              "w-full inline-flex items-center justify-center rounded-2xl px-4 py-2 text-base font-medium transition-colors border border-primary-600 bg-white text-primary-600 group-hover:bg-primary-600 group-hover:text-white group-hover:scale-105 group-hover:shadow group-hover:border-primary-600 disabled:opacity-50 disabled:cursor-not-allowed",
              // Current plan styling
              session && currentSubscription && planId && currentSubscription.subscription_plan_id === planId && "bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed"
            )}
          >
            {isThisCardLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                <span>Processing...</span>
              </div>
            ) : session && !organization ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                <span>Loading...</span>
              </div>
            ) : (
              getButtonText()
            )}
          </button>
        )}
      </div>
    </Card>
  )
}
