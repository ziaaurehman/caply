import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

interface PortalSessionRequest {
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

    const { organizationId }: PortalSessionRequest = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId' },
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

    // Get organization subscription to find customer ID
    const { data: subscription, error: subscriptionError } = await supabase
      .from('organization_subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single()

    if (subscriptionError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing information found for this organization' },
        { status: 404 }
      )
    }

    // Create billing portal session
    const portalSession = await createBillingPortalSession(
      subscription.stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
    )

    return NextResponse.json({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
} 