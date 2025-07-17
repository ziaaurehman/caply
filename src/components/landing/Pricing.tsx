import PricingCard from "./PricingCard"
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useEffect } from "react"
import { formatPrice, SubscriptionPlan } from "@/lib/stripe"
import { Card } from "../ui/Card"
import { cn } from "@/lib/utils"

// Skeleton card component for loading state
const SkeletonCard = () => (
  <Card className="bg-white p-8 relative border h-full flex flex-col rounded-2xl border-gray-200">
    {/* Badge skeleton */}
    <div className="absolute top-0 right-6 transform -translate-y-1/2">
      <div className="inline-flex items-center rounded-full bg-gray-100 px-4 py-1 h-6 w-20 animate-pulse"></div>
    </div>
    
    {/* Title skeleton */}
    <div className="h-8 w-24 bg-gray-100 rounded-md animate-pulse"></div>
    
    {/* Price skeleton */}
    <div className="mt-4 flex items-baseline">
      <div className="h-10 w-20 bg-gray-100 rounded-md animate-pulse"></div>
      <div className="ml-2 h-5 w-16 bg-gray-100 rounded-md animate-pulse"></div>
    </div>
    
    {/* Description skeleton */}
    <div className="mt-2 h-4 w-full bg-gray-100 rounded-md animate-pulse"></div>
    
    {/* Features skeleton */}
    <ul className="mt-8 space-y-4 flex-1">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center">
          <div className="h-5 w-5 rounded-full bg-gray-100 mr-3 animate-pulse"></div>
          <div className="h-4 w-full bg-gray-100 rounded-md animate-pulse"></div>
        </li>
      ))}
    </ul>
    
    {/* Button skeleton */}
    <div className="mt-8 h-10 w-full bg-gray-100 rounded-2xl animate-pulse"></div>
  </Card>
)

export default function Pricing() {
  const { plans, fetchPlans, loading } = useSubscriptionStore()

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // Transform subscription plans to pricing card format
  const transformPlanToTier = (plan: SubscriptionPlan) => ({
    name: plan.display_name,
    price: plan.amount === 0 ? "0" : formatPrice(plan.amount, plan.currency).replace(/CA\$|\$/g, ''),
    period: plan.amount === 0 ? "forever" : plan.interval === 'month' ? 'per user/month' : 'per user/year',
    description: plan.description,
    features: plan.features,
    highlight: plan.is_popular || false,
    badge: plan.is_popular ? 'Popular' : plan.amount === 0 ? 'Free' : plan.display_name === 'Enterprise' ? 'Enterprise' : 'Standard',
    buttonText: plan.amount === 0 ? 'Start' : plan.display_name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial',
    planId: plan.id,
    stripePriceId: plan.stripe_price_id,
  })

  // Fallback data if plans are loading or empty
  const fallbackTiers = [
    {
      name: "Basic",
      price: "0",
      period: "forever",
      description: "Perfect for freelancers and independent contributors",
      features: [
        "Access to 'My Timesheet' only",
        "Manual time entry",
        "View personal profile",
        "Add, edit, and manage unlimited expenses",
        "Create and manage up to 2 projects in Kanban view",
        "**Generate professional invoices for only $1 each**",
        "No team collaboration features",
      ],
      highlight: false,
      badge: "Free",
      buttonText: "Start",
    },
    {
      name: "Pro",
      price: "14.99",
      period: "per user/month",
      description: "Ideal for team and project leads",
      features: [
        "All Team Member features",
        "Create & manage projects",
        "Resource allocation",
        "Approve timesheets & leave",
        "Monitor project budget vs. actual",
        "Submit draft invoices and estimates",
      ],
      highlight: true,
      badge: "Best Value",
    },
    {
      name: "Premium",
      price: "19.99",
      period: "per user/month",
      description: "For department or company administrators",
      features: [
        "All Manager features",
        "User & role management",
        "Full PO & Invoice control",
        "Tax configuration",
        "P&L and capacity reporting",
        "Branding and integration management",
      ],
      highlight: false,
      badge: "Popular",
    },
    {
      name: "Enterprise",
      price: "Contact us",
      period: "custom pricing",
      description: "For large organizations with custom requirements",
      features: [
        "All Premium features",
        "Custom integrations",
        "Dedicated support",
        "Advanced analytics",
        "Custom branding",
        "SLA guarantees",
      ],
      highlight: false,
      badge: "Enterprise",
      buttonText: "Contact Sales",
    },
  ]

  // Enterprise card definition
  const enterpriseTier = {
    name: "Enterprise",
    price: "Contact us",
    period: "custom pricing",
    description: "For large organizations with custom requirements",
    features: [
      "All Premium features",
      "Custom integrations",
      "Dedicated support",
      "Advanced analytics",
      "Custom branding",
      "SLA guarantees",
    ],
    highlight: false,
    badge: "Enterprise",
    buttonText: "Contact Sales",
  }

  // Prepare tiers to render
  const tiers = plans.length > 0
    ? [...plans.map(transformPlanToTier), enterpriseTier]
    : fallbackTiers

  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-4 leading-tight">
          Simple, Transparent Pricing
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
          No hidden fees. Free updates. Cancel anytime.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-4 items-stretch">
          {loading ? (
            // Show skeleton cards instead of a single loading spinner
            <>
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-full">
                  <SkeletonCard />
                </div>
              ))}
            </>
          ) : (
            tiers.map((tier, index) => (
              <div key={(tier as any).planId || tier.name || index} className="h-full">
                <PricingCard {...tier} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
