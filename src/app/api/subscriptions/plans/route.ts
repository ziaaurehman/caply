import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Define plan type for type safety
interface PlanRow {
  id: string
  name: string
  display_name: string
  description: string
  amount: number
  currency: string
  interval: string
  stripe_product_id: string
  stripe_price_id: string
  features: string[]
  max_users: number | null
  max_projects: number | null
  max_storage_gb: number | null
  is_popular: boolean
  trial_period_days: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Fetch all active subscription plans
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching subscription plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription plans' },
        { status: 500 }
      )
    }

    // Transform database results to match SubscriptionPlan interface
    const transformedPlans = plans.map((plan: PlanRow) => ({
      id: plan.id,
      name: plan.name,
      display_name: plan.display_name,
      description: plan.description,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      stripe_product_id: plan.stripe_product_id,
      stripe_price_id: plan.stripe_price_id,
      features: plan.features || [],
      max_users: plan.max_users,
      max_projects: plan.max_projects,
      max_storage_gb: plan.max_storage_gb,
      is_popular: plan.is_popular,
      trial_period_days: plan.trial_period_days,
    }))

    return NextResponse.json(transformedPlans)
  } catch (error) {
    console.error('Error in /api/subscriptions/plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 