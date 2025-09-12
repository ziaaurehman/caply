import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createCheckoutSession, createStripeCustomer } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

interface CheckoutSessionRequest {
  planId: string;
  organizationId: string;
}

export async function POST(request: NextRequest) {
  console.log("=== CHECKOUT SESSION API CALLED ===");

  try {
    console.log("Getting server session...");
    // Get authenticated user session
    const session = await getServerSession(authConfig);
    console.log("Session:", session ? "Found" : "Not found");

    if (!session?.user?.id) {
      console.log("No session found, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Parsing request body...");
    const body = await request.json();
    console.log("Request body:", body);

    const { planId, organizationId }: CheckoutSessionRequest = body;

    if (!planId || !organizationId) {
      console.log("Missing planId or organizationId");
      return NextResponse.json(
        { error: "Missing planId or organizationId" },
        { status: 400 }
      );
    }

    console.log("Creating Supabase client...");
    const supabase = await createClient();

    console.log("Verifying user membership...");
    // Verify user is admin of the organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select(
        `
        *,
        roles!inner(name)
      `
      )
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();

    console.log("Membership query result:", { membership, membershipError });

    if (
      membershipError ||
      !membership ||
      !["admin", "owner"].includes(membership.roles.name)
    ) {
      console.log("User not authorized as admin");
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    console.log("Getting organization details...");
    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      console.log("Organization not found:", orgError);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    console.log("Getting subscription plan details...");
    // Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    console.log("Plan query result:", { plan, planError });

    if (planError || !plan) {
      console.log("Subscription plan not found:", planError);
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    // Skip free plans and inactive plans (Basic and Enterprise)
    if (plan.amount === 0 || !plan.is_active) {
      console.log("Plan is free or inactive, skipping checkout");
      return NextResponse.json(
        { error: "This plan does not require checkout" },
        { status: 400 }
      );
    }

    console.log("Checking existing subscription...");
    // Check if organization already has a subscription
    const { data: existingSubscription } = await supabase
      .from("organization_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!customerId) {
      console.log("Creating new Stripe customer...");
      if (!session.user.email) {
        return NextResponse.json(
          { error: "User email not found in session" },
          { status: 400 }
        );
      }
      const customer = await createStripeCustomer(
        session.user.email,
        organization.name,
        organizationId
      );
      customerId = customer.id;
      console.log("Created customer:", customerId);
    } else {
      console.log("Using existing customer:", customerId);
    }

    console.log("Creating checkout session...");
    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId: plan.stripe_price_id,
      organizationId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?canceled=true`,
      trialPeriodDays: plan.trial_period_days,
    });

    console.log("Checkout session created:", checkoutSession.id);
    console.log("Checkout URL:", checkoutSession.url);

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("=== ERROR IN CHECKOUT SESSION ===");
    console.error("Error creating checkout session:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
