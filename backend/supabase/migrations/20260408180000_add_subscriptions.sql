-- Migration: Add subscriptions table and plan tracking columns to organizations

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);

-- Add plan tracking columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
