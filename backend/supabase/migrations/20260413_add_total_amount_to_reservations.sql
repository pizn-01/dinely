-- Migration: Add ePOS sale tracking and reporting support to reservations
-- This stores the final sale amount pushed from the ePOS system when a table is closed.
-- Existing timestamp columns (created_at, seated_at, completed_at, cancelled_at) already
-- track the full reservation lifecycle — no changes needed for those.

-- ═══════════════════════════════════════════════════════════════
-- 1. Add total_amount column
-- ═══════════════════════════════════════════════════════════════
-- NULL = no amount recorded yet (e.g., reservation not yet completed)
-- 0+  = final sale amount as reported by ePOS or manually entered by staff
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT NULL;

-- Add a comment describing the column for DB documentation
COMMENT ON COLUMN reservations.total_amount IS
  'Final sale amount pushed from ePOS when table is closed, or manually entered by staff. NULL means not yet recorded.';

-- ═══════════════════════════════════════════════════════════════
-- 2. Performance indexes for reporting
-- ═══════════════════════════════════════════════════════════════

-- Composite index for the table revenue report (date range + group-by-table queries)
CREATE INDEX IF NOT EXISTS idx_reservations_report
  ON reservations (restaurant_id, reservation_date, table_id)
  WHERE status NOT IN ('cancelled', 'no_show');

-- Index for looking up reservations by table (used when ePOS queries by table)
CREATE INDEX IF NOT EXISTS idx_reservations_table_lookup
  ON reservations (restaurant_id, table_id, reservation_date);

-- Index to speed up revenue aggregation queries
CREATE INDEX IF NOT EXISTS idx_reservations_total_amount
  ON reservations (restaurant_id, reservation_date)
  WHERE total_amount IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. Row Level Security (RLS) — ensure total_amount follows
--    the same policies as the rest of the reservations table.
--    (existing RLS policies already cover SELECT/INSERT/UPDATE
--     on the reservations table, so total_amount is automatically
--     protected. This section documents that explicitly.)
-- ═══════════════════════════════════════════════════════════════

-- Ensure RLS is enabled (idempotent — no-op if already enabled)
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- The existing policies on reservations already cover:
--   • service_role (full access) — used by our backend service account
--   • authenticated users scoped to their restaurant_id
-- No new policies are needed since total_amount is just a column
-- on the existing table, but we verify RLS is active.

-- ═══════════════════════════════════════════════════════════════
-- 4. Grant access to the service role (backend API)
-- ═══════════════════════════════════════════════════════════════
-- The supabaseAdmin client uses the service_role key, which bypasses
-- RLS. This ensures the integration API (API key auth -> service_role)
-- and the dashboard API (JWT auth -> service_role) both have full
-- read/write access to total_amount.

-- No additional GRANTs needed — service_role already has full access.
-- This comment exists for documentation purposes.

-- ═══════════════════════════════════════════════════════════════
-- 5. Verify existing timestamp columns exist
--    (these are expected to already be present from the initial schema)
-- ═══════════════════════════════════════════════════════════════
-- These track the reservation lifecycle that the client needs:
--   • created_at    — when the reservation was booked
--   • confirmed_at  — when it was confirmed
--   • seated_at     — when the guest was seated (served)
--   • completed_at  — when the table was closed (bill paid)
--   • cancelled_at  — when the reservation was cancelled

-- Safety: add them if they don't exist (they should)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;
