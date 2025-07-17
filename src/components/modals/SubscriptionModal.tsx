"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useAuthStore } from "@/lib/stores/authStore"
import { useSession } from "next-auth/react"
import { formatPrice, SubscriptionPlan } from "@/lib/stripe"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

// Individual pricing card for the modal
const ModalPricingCard = ({
  plan,
  isEnterprise = false,
  onSubscribe,
  currentSubscription,
  processingPlanId,
}: {
  plan: SubscriptionPlan | any
  isEnterprise?: boolean
  onSubscribe: (planId?: string, stripePriceId?: string) => void
  currentSubscription: any
  processingPlanId: string | null
}) => {
  const { data: session } = useSession()
  const isCurrentPlan = currentSubscription && plan.id && currentSubscription.subscription_plan_id === plan.id
  const isProcessing = processingPlanId === plan.id
  
  const getButtonText = () => {
    if (isEnterprise) return "Contact Sales"
    if (isCurrentPlan) return "Current Plan"
    if (plan.amount === 0) return session ? "Go to Dashboard" : "Start Free"
    if (!session) return "Sign Up to Subscribe"
    return "Subscribe Now"
  }

  const handleClick = () => {
    if (isEnterprise) {
      window.open("mailto:sales@yourdomain.com", "_blank")
      return
    }
    if (isCurrentPlan) return
    if (plan.amount === 0) {
      window.location.href = session ? "/dashboard" : "/signup"
      return
    }
    onSubscribe(plan.id, plan.stripe_price_id)
  }

  return (
    <div className={cn(
      "bg-white p-6 rounded-xl border-2 transition-all hover:shadow-lg h-full flex flex-col relative",
      plan.is_popular ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-200"
    )}>
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-primary-500 px-3 py-1 text-sm font-medium text-white">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center flex-shrink-0">
        <h3 className="text-xl font-semibold text-gray-900 mt-2">{plan.display_name || plan.name}</h3>
        <div className="mt-3">
          <span className="text-3xl font-bold text-primary-600">
            {isEnterprise ? "Contact us" : plan.amount === 0 ? "$0" : `$${formatPrice(plan.amount, plan.currency).replace(/CA\$|\$/g, '')}`}
          </span>
          {!isEnterprise && (
            <span className="text-gray-500 ml-1">
              /{plan.amount === 0 ? "forever" : plan.interval === 'month' ? 'month' : 'year'}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-gray-600 min-h-[2.5rem] flex items-center justify-center">{plan.description}</p>
      </div>

      <ul className="mt-6 space-y-3 flex-grow">
        {plan.features?.map((feature: string, index: number) => (
          <li key={index} className="flex items-start">
            <CheckCircle className="h-4 w-4 text-primary-500 mt-0.5 mr-3 flex-shrink-0" />
            <span className="text-sm text-gray-600">{feature.replace(/\*\*/g, "")}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button
          onClick={handleClick}
          disabled={isCurrentPlan || isProcessing}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-medium transition-colors",
            isCurrentPlan
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : plan.is_popular
              ? "bg-primary-600 text-white hover:bg-primary-700"
              : "bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Processing...
            </div>
          ) : (
            getButtonText()
          )}
        </button>
      </div>
    </div>
  )
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { plans, fetchPlans, createCheckoutSession, currentSubscription, checkoutLoading } = useSubscriptionStore()
  const { organization } = useAuthStore()
  const { data: session } = useSession()
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && plans.length === 0) {
      fetchPlans()
    }
  }, [isOpen, plans.length, fetchPlans])

  const handleSubscribe = async (planId?: string, stripePriceId?: string) => {
    if (!session || !organization || !planId || !stripePriceId) {
      console.error('Missing required data for subscription')
      return
    }

    setProcessingPlanId(planId)
    
    try {
      const checkoutUrl = await createCheckoutSession(planId, organization.id)
      // Close modal before redirecting
      onClose()
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert('Failed to start subscription. Please try again.')
      setProcessingPlanId(null)
    }
  }

  // Fallback plans if API plans are not loaded
  const fallbackPlans = [
    {
      id: 'basic',
      display_name: "Basic",
      amount: 0,
      currency: 'usd',
      interval: 'month',
      description: "Perfect for freelancers and independent contributors",
      features: [
        "Access to 'My Timesheet' only",
        "Manual time entry",
        "View personal profile",
        "Add, edit, and manage unlimited expenses",
        "Create and manage up to 2 projects in Kanban view",
        "Generate professional invoices for only $1 each",
        "No team collaboration features",
      ],
      is_popular: false,
    },
    {
      id: 'pro',
      display_name: "Pro",
      amount: 1499,
      currency: 'usd',
      interval: 'month',
      description: "Ideal for team and project leads",
      features: [
        "All Team Member features",
        "Create & manage projects",
        "Resource allocation",
        "Approve timesheets & leave",
        "Monitor project budget vs. actual",
        "Submit draft invoices and estimates",
      ],
      is_popular: true,
      stripe_price_id: 'price_pro_monthly',
    },
    {
      id: 'premium',
      display_name: "Premium",
      amount: 1999,
      currency: 'usd',
      interval: 'month',
      description: "For department or company administrators",
      features: [
        "All Manager features",
        "User & role management",
        "Full PO & Invoice control",
        "Tax configuration",
        "P&L and capacity reporting",
        "Branding and integration management",
      ],
      is_popular: false,
      stripe_price_id: 'price_premium_monthly',
    },
  ]

  const enterprisePlan = {
    id: 'enterprise',
    display_name: "Enterprise",
    amount: null,
    description: "For large organizations with custom requirements",
    features: [
      "All Premium features",
      "Custom integrations",
      "Dedicated support",
      "Advanced analytics",
      "Custom branding",
      "SLA guarantees",
    ],
    is_popular: false,
  }

  const displayPlans = plans.length > 0 ? plans : fallbackPlans

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentSubscription ? "Manage Your Subscription" : "Choose Your Plan"}
              </h2>
              <p className="text-gray-600 mt-1">
                {currentSubscription 
                  ? "Upgrade, downgrade, or manage your current subscription" 
                  : "Select the perfect plan for your needs"
                }
              </p>
              {currentSubscription && (
                <div className="mt-2 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  Current Plan: {currentSubscription.plan?.display_name || "Active"}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {displayPlans.map((plan) => (
              <div key={plan.id} className="h-full">
                <ModalPricingCard
                  plan={plan}
                  onSubscribe={handleSubscribe}
                  currentSubscription={currentSubscription}
                  processingPlanId={processingPlanId}
                />
              </div>
            ))}
            <div className="h-full">
              <ModalPricingCard
                plan={enterprisePlan}
                isEnterprise={true}
                onSubscribe={handleSubscribe}
                currentSubscription={currentSubscription}
                processingPlanId={processingPlanId}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              All plans include free updates and can be cancelled anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
