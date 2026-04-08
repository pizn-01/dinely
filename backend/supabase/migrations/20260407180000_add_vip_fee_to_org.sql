-- Migration to add vip_membership_fee to organizations

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS vip_membership_fee NUMERIC(10,2) DEFAULT 15.00;
