-- ============================================================
-- Migration 008: Plan Limits & POS Trusted IP Auto-Login Cleanup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── Add Monthly Reservation Tracking ───────────────────────
-- Cache the monthly reservation count for fast plan limit checks.
-- The reset_at column tracks when the counter was last zeroed,
-- so we can detect a month rollover on-read (no cron needed).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS monthly_reservation_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_reservation_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW());

-- ─── Disable POS Trusted IP Auto-Login ──────────────────────
-- This feature has been removed from the product.
-- We disable it for all existing orgs but keep the columns
-- to avoid a destructive migration; they are no longer read.

ALTER TABLE organizations
  ALTER COLUMN staff_ip_login_enabled SET DEFAULT FALSE;

UPDATE organizations
  SET staff_ip_login_enabled = FALSE
  WHERE staff_ip_login_enabled = TRUE;

-- ─── Index for Monthly Reservation Count Queries ────────────
-- Supports the on-read reset: count active reservations this month
-- quickly by filtering on restaurant_id + reservation_date.
-- (idx_reservations_restaurant_date already covers this — no new index needed)

-- ─── RPC: Atomically Increment Monthly Reservation Count ────
-- Called after a successful reservation creation.
-- Uses a direct UPDATE with increment to avoid race conditions.
CREATE OR REPLACE FUNCTION increment_monthly_reservation_count(p_restaurant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE organizations
  SET monthly_reservation_count = COALESCE(monthly_reservation_count, 0) + 1
  WHERE id = p_restaurant_id;
END;
$$;

-- ─── RPC: Get Monthly Reservation Usage ──────────────────────
-- Called by the frontend usage endpoint to display current usage.
CREATE OR REPLACE FUNCTION get_monthly_reservation_usage(p_restaurant_id UUID)
RETURNS TABLE(
  current_count INT,
  reset_at TIMESTAMPTZ,
  subscription_plan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(o.monthly_reservation_count, 0)::INT AS current_count,
    o.monthly_reservation_reset_at AS reset_at,
    o.subscription_plan::TEXT AS subscription_plan
  FROM organizations o
  WHERE o.id = p_restaurant_id;
END;
$$;

