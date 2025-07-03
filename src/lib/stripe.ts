import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
console.log(process.env.STRIPE_SECRET_KEY)
// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!||'sk_test_51RgQ3vQ65qsMazDkhJyUV9U70WLC1dDod4Ern3jU3M60q28366wdT2ocQE3MatUVWzk2wNIBNfLAin4Se43sgGwc00HOU8NQQF', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'cad',
  country: 'CA',
  billing_address_collection: 'required' as const,
  payment_method_types: ['card'] as const,
}

// Subscription plan types based on your pricing structure
export interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  amount: number // in cents
  currency: string
  interval: 'month' | 'year'
  stripe_product_id: string
  stripe_price_id: string
  features: string[]
  max_users?: number
  max_projects?: number
  max_storage_gb?: number
  is_popular?: boolean
  trial_period_days?: number
}

// Helper function to format currency
export const formatPrice = (amount: number, currency: string = 'CAD'): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount / 100)
}

// Helper function to create customer
export const createStripeCustomer = async (
  email: string,
  name: string,
  organizationId: string
): Promise<Stripe.Customer> => {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      organization_id: organizationId,
    },
  })
}

// Helper function to create checkout session
export const createCheckoutSession = async ({
  customerId,
  priceId,
  organizationId,
  successUrl,
  cancelUrl,
  trialPeriodDays,
}: {
  customerId: string
  priceId: string
  organizationId: string
  successUrl: string
  cancelUrl: string
  trialPeriodDays?: number
}): Promise<Stripe.Checkout.Session> => {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: STRIPE_CONFIG.payment_method_types,
    billing_address_collection: STRIPE_CONFIG.billing_address_collection,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
    },
  }

  // Add trial period if specified
  if (trialPeriodDays && trialPeriodDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: trialPeriodDays,
      metadata: {
        organization_id: organizationId,
      },
    }
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

// Helper function to create billing portal session
export const createBillingPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Helper function to retrieve subscription with details
export const getSubscriptionWithDetails = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'customer', 'items.data.price.product'],
  })
}

// Helper function to cancel subscription
export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> => {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return await stripe.subscriptions.cancel(subscriptionId)
  }
}

// Helper function to update subscription
export const updateSubscription = async (
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
} 