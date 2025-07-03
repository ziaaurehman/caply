import { create } from 'zustand'
import { SubscriptionPlan } from '../stripe'

// Types for subscription store
export interface OrganizationSubscription {
  id: string
  organization_id: string
  subscription_plan_id: string
  stripe_subscription_id?: string
  stripe_customer_id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  current_period_start?: Date
  current_period_end?: Date
  cancel_at_period_end: boolean
  canceled_at?: Date
  trial_start?: Date
  trial_end?: Date
  current_users: number
  current_projects: number
  current_storage_gb: number
  created_at: Date
  updated_at: Date
  plan?: SubscriptionPlan
}

export interface BillingAddress {
  id: string
  organization_id: string
  company_name?: string
  contact_name?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postal_code: string
  country: string
  tax_id?: string
  is_default: boolean
  created_at: Date
  updated_at: Date
}

// Payment methods interface removed - handled by Stripe Billing Portal

export interface BillingInvoice {
  id: string
  organization_id: string
  subscription_id?: string
  stripe_invoice_id: string
  invoice_number?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  invoice_date: Date
  due_date?: Date
  paid_at?: Date
  hosted_invoice_url?: string
  invoice_pdf_url?: string
  description?: string
  created_at: Date
  updated_at: Date
}

interface SubscriptionState {
  // State
  plans: SubscriptionPlan[]
  currentSubscription: OrganizationSubscription | null
  billingAddress: BillingAddress | null
  invoices: BillingInvoice[]
  loading: boolean
  checkoutLoading: boolean
  error: string | null

  // Actions
  setPlans: (plans: SubscriptionPlan[]) => void
  setCurrentSubscription: (subscription: OrganizationSubscription | null) => void
  setBillingAddress: (address: BillingAddress | null) => void
  setInvoices: (invoices: BillingInvoice[]) => void
  setLoading: (loading: boolean) => void
  setCheckoutLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API Actions
  fetchPlans: () => Promise<void>
  fetchCurrentSubscription: (organizationId: string) => Promise<void>
  fetchBillingAddress: (organizationId: string) => Promise<void>
  fetchInvoices: (organizationId: string) => Promise<void>
  createCheckoutSession: (planId: string, organizationId: string) => Promise<string>
  createBillingPortalSession: (organizationId: string) => Promise<string>
  cancelSubscription: (organizationId: string, cancelAtPeriodEnd: boolean) => Promise<void>
  updateSubscription: (organizationId: string, newPlanId: string) => Promise<void>
  
  // Utility functions
  getCurrentPlan: () => SubscriptionPlan | null
  hasFeature: (feature: string) => boolean
  isWithinLimit: (metric: 'users' | 'projects' | 'storage') => boolean
  getUsagePercentage: (metric: 'users' | 'projects' | 'storage') => number
  reset: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Initial state
  plans: [],
  currentSubscription: null,
  billingAddress: null,
  invoices: [],
  loading: false,
  checkoutLoading: false,
  error: null,

  // Basic setters
  setPlans: (plans) => set({ plans }),
  setCurrentSubscription: (subscription) => set({ currentSubscription: subscription }),
  setBillingAddress: (address) => set({ billingAddress: address }),
  setInvoices: (invoices) => set({ invoices }),
  setLoading: (loading) => set({ loading }),
  setCheckoutLoading: (loading) => set({ checkoutLoading: loading }),
  setError: (error) => set({ error }),

  // API Actions
  fetchPlans: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/subscriptions/plans')
      if (!response.ok) throw new Error('Failed to fetch plans')
      const plans = await response.json()
      set({ plans })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch plans' })
    } finally {
      set({ loading: false })
    }
  },

  fetchCurrentSubscription: async (organizationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/subscriptions/${organizationId}`)
      if (!response.ok) {
        if (response.status === 404) {
          set({ currentSubscription: null })
          return
        }
        throw new Error('Failed to fetch subscription')
      }
      const subscription = await response.json()
      set({ currentSubscription: subscription })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subscription' })
    } finally {
      set({ loading: false })
    }
  },

  fetchBillingAddress: async (organizationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/billing/addresses?organizationId=${organizationId}`)
      if (!response.ok) {
        if (response.status === 404) {
          set({ billingAddress: null })
          return
        }
        throw new Error('Failed to fetch billing address')
      }
      const address = await response.json()
      set({ billingAddress: address })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch billing address' })
    } finally {
      set({ loading: false })
    }
  },

  // Payment methods removed - handled by Stripe Billing Portal

  fetchInvoices: async (organizationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/billing/invoices?organizationId=${organizationId}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')
      const invoices = await response.json()
      set({ invoices })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch invoices' })
    } finally {
      set({ loading: false })
    }
  },

  createCheckoutSession: async (planId: string, organizationId: string): Promise<string> => {
    set({ checkoutLoading: true, error: null })
    try {
      const response = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, organizationId }),
      })
      if (!response.ok) throw new Error('Failed to create checkout session')
      const { url } = await response.json()
      return url
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session'
      set({ error: errorMessage })
      throw new Error(errorMessage)
    } finally {
      set({ checkoutLoading: false })
    }
  },

  createBillingPortalSession: async (organizationId: string): Promise<string> => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })
      if (!response.ok) throw new Error('Failed to create billing portal session')
      const { url } = await response.json()
      return url
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing portal session'
      set({ error: errorMessage })
      throw new Error(errorMessage)
    } finally {
      set({ loading: false })
    }
  },

  cancelSubscription: async (organizationId: string, cancelAtPeriodEnd: boolean = true) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, cancelAtPeriodEnd }),
      })
      if (!response.ok) throw new Error('Failed to cancel subscription')
      
      // Refresh current subscription
      await get().fetchCurrentSubscription(organizationId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel subscription' })
    } finally {
      set({ loading: false })
    }
  },

  updateSubscription: async (organizationId: string, newPlanId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/subscriptions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, planId: newPlanId }),
      })
      if (!response.ok) throw new Error('Failed to update subscription')
      
      // Refresh current subscription
      await get().fetchCurrentSubscription(organizationId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update subscription' })
    } finally {
      set({ loading: false })
    }
  },

  // Utility functions
  getCurrentPlan: () => {
    const { currentSubscription, plans } = get()
    if (!currentSubscription) return null
    return plans.find(plan => plan.id === currentSubscription.subscription_plan_id) || null
  },

  hasFeature: (feature: string): boolean => {
    const plan = get().getCurrentPlan()
    if (!plan) return false
    return plan.features.includes(feature)
  },

  isWithinLimit: (metric: 'users' | 'projects' | 'storage'): boolean => {
    const { currentSubscription } = get()
    const plan = get().getCurrentPlan()
    if (!currentSubscription || !plan) return true

    const currentValue = metric === 'users' ? currentSubscription.current_users :
                        metric === 'projects' ? currentSubscription.current_projects :
                        currentSubscription.current_storage_gb

    const maxValue = metric === 'users' ? plan.max_users :
                    metric === 'projects' ? plan.max_projects :
                    plan.max_storage_gb

    if (maxValue === null || maxValue === undefined) return true // unlimited
    return currentValue <= maxValue
  },

  getUsagePercentage: (metric: 'users' | 'projects' | 'storage'): number => {
    const { currentSubscription } = get()
    const plan = get().getCurrentPlan()
    if (!currentSubscription || !plan) return 0

    const currentValue = metric === 'users' ? currentSubscription.current_users :
                        metric === 'projects' ? currentSubscription.current_projects :
                        currentSubscription.current_storage_gb

    const maxValue = metric === 'users' ? plan.max_users :
                    metric === 'projects' ? plan.max_projects :
                    plan.max_storage_gb

    if (maxValue === null || maxValue === undefined) return 0 // unlimited
    return Math.min((currentValue / maxValue) * 100, 100)
  },

  reset: () => set({
    plans: [],
    currentSubscription: null,
    billingAddress: null,
    invoices: [],
    loading: false,
    checkoutLoading: false,
    error: null,
  }),
}))