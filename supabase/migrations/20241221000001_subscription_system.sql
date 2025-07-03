-- Subscription System Migration
-- This migration creates the complete subscription and billing system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SUBSCRIPTION PLANS SYSTEM
-- =====================================================

-- Subscription plans table - matches Stripe products
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  
  -- Pricing
  amount INTEGER NOT NULL, -- amount in cents
  currency VARCHAR(10) DEFAULT 'CAD',
  interval VARCHAR(20) DEFAULT 'month', -- month, year
  interval_count INTEGER DEFAULT 1,
  
  -- Plan features and limits
  max_users INTEGER,
  max_projects INTEGER,
  max_storage_gb INTEGER,
  features JSONB DEFAULT '[]',
  
  -- Plan metadata
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  trial_period_days INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORGANIZATION SUBSCRIPTIONS
-- =====================================================

-- Organization subscriptions table
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Stripe subscription details
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  
  -- Subscription status and timing
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, unpaid, trialing
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Usage tracking
  current_users INTEGER DEFAULT 0,
  current_projects INTEGER DEFAULT 0,
  current_storage_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- =====================================================
-- BILLING AND PAYMENTS
-- =====================================================

-- Billing addresses table
CREATE TABLE IF NOT EXISTS billing_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Address details
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(10) DEFAULT 'CA',
  
  -- Tax information
  tax_id VARCHAR(100), -- GST/HST number, etc.
  
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods are handled by Stripe (removed table - use Stripe Billing Portal)

-- Invoice records table
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe invoice details
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  invoice_number VARCHAR(100),
  
  -- Invoice amounts (in cents)
  subtotal INTEGER NOT NULL,
  tax_amount INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER DEFAULT 0,
  
  -- Currency and status
  currency VARCHAR(10) DEFAULT 'CAD',
  status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
  
  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- URLs and metadata
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  
  -- Stripe payment intent/charge details
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Transaction details
  amount INTEGER NOT NULL, -- amount in cents
  currency VARCHAR(10) DEFAULT 'CAD',
  status VARCHAR(50) NOT NULL, -- succeeded, failed, pending, canceled
  
  -- Payment method used
  payment_method_type VARCHAR(50),
  payment_method_last4 VARCHAR(10),
  
  -- Failure information
  failure_code VARCHAR(100),
  failure_message TEXT,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTION USAGE TRACKING
-- =====================================================

-- Usage records table for tracking plan limits
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
  
  -- Usage metrics
  metric_name VARCHAR(100) NOT NULL, -- users, projects, storage_gb, api_calls
  current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_value DECIMAL(12,2), -- plan limit
  
  -- Tracking period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, metric_name, period_start)
);

-- =====================================================
-- WEBHOOKS AND EVENTS
-- =====================================================

-- Stripe webhook events table for audit and debugging
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  api_version VARCHAR(50),
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Event data
  event_data JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product ON subscription_plans(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price ON subscription_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_stripe ON organization_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_billing_addresses_org ON billing_addresses(organization_id);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org ON billing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe ON billing_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_org ON subscription_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(event_type);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at 
  BEFORE UPDATE ON organization_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_addresses_updated_at 
  BEFORE UPDATE ON billing_addresses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payment methods trigger removed (table not needed)

CREATE TRIGGER update_billing_invoices_updated_at 
  BEFORE UPDATE ON billing_invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at 
  BEFORE UPDATE ON subscription_usage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA - SUBSCRIPTION PLANS
-- =====================================================

-- Insert predefined subscription plans based on your Stripe catalog
INSERT INTO subscription_plans (
  stripe_product_id, 
  stripe_price_id, 
  name, 
  display_name, 
  description, 
  amount, 
  currency, 
  max_users, 
  max_projects, 
  max_storage_gb, 
  features, 
  is_active, 
  sort_order,
  is_popular
) VALUES 
  (
    'basic_plan', 
    'basic_plan', 
    'basic', 
    'Basic', 
    'Perfect for freelancers and independent contributors', 
    0, 
    'CAD', 
    1, 
    2, 
    1, 
    '["Access to My Timesheet only", "Manual time entry", "View personal profile", "Add, edit, and manage unlimited expenses", "Create and manage up to 2 projects in Kanban view", "Generate professional invoices for only $1 each", "No team collaboration features"]'::jsonb, 
    true, 
    1,
    false
  ),
  (
    'prod_SbdM4KrQK5bkI6', 
    'price_1RgQ5qQ65qsMazDkt3E8IcyC', 
    'pro', 
    'Pro', 
    'Ideal for team and project leads', 
    1499, -- $14.99 in cents (from your CSV - Pro plan)
    'CAD', 
    null, 
    null, 
    25, 
    '["All Team Member features", "Create & manage projects", "Resource allocation", "Approve timesheets & leave", "Monitor project budget vs. actual", "Submit draft invoices and estimates"]'::jsonb, 
    true, 
    2,
    true
  ),
  (
    'prod_Sbj3ROq132rwU3', 
    'price_1RgVbCQ65qsMazDk3TxGQJkw', 
    'premium', 
    'Premium', 
    'For department or company administrators', 
    1999, -- $19.99 in cents (from your CSV - Premium plan)
    'CAD', 
    null, 
    null, 
    100, 
    '["All Manager features", "User & role management", "Full PO & Invoice control", "Tax configuration", "P&L and capacity reporting", "Branding and integration management"]'::jsonb, 
    true, 
    3,
    false
  ),
  (
    'enterprise_plan', 
    'enterprise_plan', 
    'enterprise', 
    'Enterprise', 
    'For large organizations with custom requirements', 
    0, -- Contact for pricing
    'CAD', 
    null, 
    null, 
    null, 
    '["All Premium features", "Custom integrations", "Dedicated support", "Advanced analytics", "Custom branding", "SLA guarantees"]'::jsonb, 
    false, -- Not active since functionality is skipped
    4,
    false
  );

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all subscription tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Subscription plans are readable by everyone (for pricing page)
CREATE POLICY subscription_plans_read_all 
  ON subscription_plans FOR SELECT 
  USING (is_active = true);

-- Organization subscriptions - only members can view their org's subscription
CREATE POLICY organization_subscriptions_read_own_org 
  ON organization_subscriptions FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Only admin users can update subscription
CREATE POLICY organization_subscriptions_update_admin 
  ON organization_subscriptions FOR UPDATE 
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN roles r ON om.role_id = r.id 
      WHERE om.user_id = auth.uid() 
      AND r.name IN ('admin', 'owner')
    )
  );

-- Billing addresses - only org members can access
CREATE POLICY billing_addresses_read_own_org 
  ON billing_addresses FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Only admin users can manage billing addresses
CREATE POLICY billing_addresses_manage_admin 
  ON billing_addresses FOR ALL 
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN roles r ON om.role_id = r.id 
      WHERE om.user_id = auth.uid() 
      AND r.name IN ('admin', 'owner')
    )
  );

-- Payment methods policies removed (handled by Stripe)

CREATE POLICY billing_invoices_read_own_org 
  ON billing_invoices FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY payment_transactions_read_own_org 
  ON payment_transactions FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Webhook events - only system access (no user policies)
-- These will be managed by service role only