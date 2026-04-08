ALTER TABLE organizations
ADD COLUMN stripe_account_id VARCHAR(255),
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
