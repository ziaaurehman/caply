import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

interface CheckoutSessionRequest {
  planId: string
  organizationId: string
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { planId, organizationId }: CheckoutSessionRequest = await request.json()

    if (!planId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing planId or organizationId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user is admin of the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select(`
        *,
        roles!inner(name)
      `)
      .eq('user_id', session.user.id)
      .eq('organization_id', organizationId)
      .single()

    if (membershipError || !membership || !['admin', 'owner'].includes(membership.roles.name)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      )
    }

    // Skip free plans and inactive plans (Basic and Enterprise)
    if (plan.amount === 0 || !plan.is_active) {
      return NextResponse.json(
        { error: 'This plan does not require checkout' },
        { status: 400 }
      )
    }

    // Check if organization already has a subscription
    const { data: existingSubscription } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    let customerId = existingSubscription?.stripe_customer_id

    // Create Stripe customer if none exists
    if (!customerId) {
      if (!session.user.email) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 400 }
        )
      }
      const customer = await createStripeCustomer(
        session.user.email,
        organization.name,
        organizationId
      )
      customerId = customer.id
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId: plan.stripe_price_id,
      organizationId,
      successUrl: `http://localhost:3000/dashboard/settings?success=true`,
      cancelUrl: `http://localhost:3000/dashboard/settings?canceled=true`,
      trialPeriodDays: plan.trial_period_days,
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 