-- Migration: Add Stripe session tracking to reservations for premium table payments

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS table_fee DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN reservations.stripe_session_id IS
  'Stripe Checkout Session ID for premium table fee payment. NULL if no payment required.';

COMMENT ON COLUMN reservations.table_fee IS
  'Premium table fee charged at booking time in the restaurant currency. NULL if standard table.';

CREATE INDEX IF NOT EXISTS idx_reservations_stripe_session
  ON reservations (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
