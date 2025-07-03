import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`Received Stripe webhook: ${event.type}`)

  try {
    const supabase = await createClient()

    // Log the webhook event for debugging
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        api_version: event.api_version,
        event_data: event.data,
        processed: false,
      })

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark webhook event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    // Log error in webhook events table
    try {
      const supabase = await createClient()
      await supabase
        .from('stripe_webhook_events')
        .update({
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: 1
        })
        .eq('stripe_event_id', event.id)
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle completed checkout sessions
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = await createClient()
  const organizationId = session.metadata?.organization_id

  if (!organizationId) {
    console.error('Missing organization_id in checkout session metadata')
    return
  }

  console.log(`Processing checkout session for organization: ${organizationId}`)

  // If this is a subscription checkout, the subscription will be handled by subscription.created event
  if (session.mode === 'subscription' && session.subscription) {
    console.log('Subscription checkout completed, will be handled by subscription events')
    return
  }
}

// Handle subscription creation and updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = await createClient()
  const organizationId = subscription.metadata?.organization_id

  if (!organizationId) {
    console.error('Missing organization_id in subscription metadata')
    return
  }

  console.log(`Processing subscription update for organization: ${organizationId}`)

  // Get the price ID to find the matching plan
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  // Find the subscription plan
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('stripe_price_id', priceId)
    .single()

  if (planError || !plan) {
    console.error('Subscription plan not found for price ID:', priceId)
    return
  }

  // Upsert the organization subscription
  const subscriptionData = {
    organization_id: organizationId,
    subscription_plan_id: plan.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase
    .from('organization_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'organization_id',
    })

  if (upsertError) {
    console.error('Error upserting subscription:', upsertError)
    throw new Error('Failed to update subscription in database')
  }

  console.log('Successfully updated subscription in database')
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = await createClient()
  const organizationId = subscription.metadata?.organization_id

  if (!organizationId) {
    console.error('Missing organization_id in subscription metadata')
    return
  }

  console.log(`Processing subscription deletion for organization: ${organizationId}`)

  // Update subscription status to canceled
  const { error } = await supabase
    .from('organization_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating canceled subscription:', error)
    throw new Error('Failed to update canceled subscription')
  }

  console.log('Successfully marked subscription as canceled')
}

// Handle successful invoice payments
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = await createClient()

  console.log(`Processing successful payment for invoice: ${invoice.id}`)

  // Store invoice record
  const invoiceData = {
    organization_id: invoice.metadata?.organization_id,
    stripe_invoice_id: invoice.id,
    invoice_number: invoice.number,
    subtotal: invoice.subtotal,
    tax_amount: (invoice as any).tax || 0,
    discount_amount: (invoice as any).total_discount_amounts?.reduce((sum: number, discount: any) => sum + discount.amount, 0) || 0,
    total_amount: invoice.total,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    currency: invoice.currency.toUpperCase(),
    status: invoice.status || 'paid',
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: new Date().toISOString(),
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf,
    description: invoice.description,
  }

  const { error } = await supabase
    .from('billing_invoices')
    .upsert(invoiceData, {
      onConflict: 'stripe_invoice_id',
    })

  if (error) {
    console.error('Error storing invoice:', error)
    throw new Error('Failed to store invoice')
  }

  console.log('Successfully stored invoice record')
}

// Handle failed invoice payments
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = await createClient()

  console.log(`Processing failed payment for invoice: ${invoice.id}`)

  // Update invoice status
  const { error } = await supabase
    .from('billing_invoices')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_invoice_id', invoice.id)

  if (error) {
    console.error('Error updating failed invoice:', error)
    throw new Error('Failed to update failed invoice')
  }

  // Update subscription status if applicable
  if ((invoice as any).subscription) {
    const { error: subError } = await supabase
      .from('organization_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', (invoice as any).subscription as string)

    if (subError) {
      console.error('Error updating subscription status for failed payment:', subError)
    }
  }

  console.log('Successfully processed failed payment')
}

// Handle trial ending soon
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log(`Trial ending soon for subscription: ${subscription.id}`)
  // You can send notification emails here
  // For now, just log the event
} 