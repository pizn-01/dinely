-- Migration File: 004_update_atomic_locks.sql
-- Description: Adds atomic Postgres RPC functions to handle reservation updates and state transitions safely.

-- ==============================================================================
-- 1. UPDATE RESERVATION ATOMIC
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_reservation_atomic(
  p_reservation_id UUID,
  p_restaurant_id UUID,
  p_table_id UUID DEFAULT NULL,
  p_reservation_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_party_size INTEGER DEFAULT NULL,
  p_guest_first_name TEXT DEFAULT NULL,
  p_guest_last_name TEXT DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL,
  p_guest_phone TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_res RECORD;
  v_locked_table RECORD;
  v_conflict RECORD;
  v_target_table_id UUID;
  v_target_date DATE;
  v_target_start TIME;
  v_target_end TIME;
  v_updated_res JSONB;
BEGIN
  -- 1. Fetch current reservation
  SELECT * INTO v_current_res 
  FROM reservations 
  WHERE id = p_reservation_id AND restaurant_id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Determine target availability fields (use new value if provided, else current)
  v_target_table_id := COALESCE(p_table_id, v_current_res.table_id);
  v_target_date := COALESCE(p_reservation_date, v_current_res.reservation_date);
  v_target_start := COALESCE(p_start_time, v_current_res.start_time);
  v_target_end := COALESCE(p_end_time, v_current_res.end_time);

  -- 2. Check if the time/date/table is changing
  IF (v_target_table_id IS DISTINCT FROM v_current_res.table_id) OR
     (v_target_date IS DISTINCT FROM v_current_res.reservation_date) OR
     (v_target_start IS DISTINCT FROM v_current_res.start_time) OR
     (v_target_end IS DISTINCT FROM v_current_res.end_time) THEN

    -- Only check for conflicts if reservation is in an active state
    IF v_current_res.status IN ('PENDING', 'CONFIRMED', 'SEATED') AND v_target_table_id IS NOT NULL THEN
      
      -- =======================================================================
      -- CRITICAL CONCURRENCY LOCK:
      -- We lock the physical `tables` row using SELECT ... FOR UPDATE.
      -- This ensures that ANY concurrent transactions trying to alter or book
      -- reservations for THIS specific table are forced to queue up and wait.
      -- By serializing access at the table level, we make double-booking impossible
      -- even if the time slots themselves naturally evaluate to 0 conflicting rows.
      -- =======================================================================
      SELECT id INTO v_locked_table
      FROM tables
      WHERE id = v_target_table_id
      FOR UPDATE;

      -- Check for overlapping active reservations on the locked table
      SELECT id INTO v_conflict
      FROM reservations
      WHERE table_id = v_target_table_id
        AND reservation_date = v_target_date
        AND id != p_reservation_id
        AND status NOT IN ('CANCELLED', 'NO_SHOW', 'COMPLETED')
        AND (
          start_time < v_target_end AND end_time > v_target_start
        )
      LIMIT 1;

      IF FOUND THEN
        RAISE EXCEPTION 'overlap: Table is already booked for the selected time slot.';
      END IF;
    END IF;
  END IF;

  -- 3. Perform the update
  UPDATE reservations
  SET
    table_id = v_target_table_id,
    reservation_date = v_target_date,
    start_time = v_target_start,
    end_time = v_target_end,
    party_size = COALESCE(p_party_size, party_size),
    guest_first_name = COALESCE(p_guest_first_name, guest_first_name),
    guest_last_name = COALESCE(p_guest_last_name, guest_last_name),
    guest_email = COALESCE(p_guest_email, guest_email),
    guest_phone = COALESCE(p_guest_phone, guest_phone),
    special_requests = COALESCE(p_special_requests, special_requests),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    updated_at = NOW()
  WHERE id = p_reservation_id
  RETURNING row_to_json(reservations.*) INTO v_updated_res;

  RETURN v_updated_res;
END;
$$;


-- ==============================================================================
-- 2. UPDATE RESERVATION STATUS ATOMIC
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_reservation_status_atomic(
  p_reservation_id UUID,
  p_restaurant_id UUID,
  p_new_status TEXT,
  p_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_res RECORD;
  v_updated_res JSONB;
BEGIN
  -- =======================================================================
  -- CRITICAL CONCURRENCY LOCK:
  -- Lock the specific reservation row using SELECT ... FOR UPDATE.
  -- This forces concurrent status updates (e.g. two admins clicking "Cancel")
  -- to process sequentially, preventing illegal terminal state jumps.
  -- =======================================================================
  SELECT * INTO v_current_res 
  FROM reservations 
  WHERE id = p_reservation_id AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Validate state machine transitions
  IF v_current_res.status = 'PENDING' AND p_new_status NOT IN ('CONFIRMED', 'CANCELLED') THEN
    RAISE EXCEPTION 'transition: Cannot transition from PENDING to %', p_new_status;
  ELSIF v_current_res.status = 'CONFIRMED' AND p_new_status NOT IN ('ARRIVING', 'SEATED', 'CANCELLED', 'NO_SHOW') THEN
    RAISE EXCEPTION 'transition: Cannot transition from CONFIRMED to %', p_new_status;
  ELSIF v_current_res.status = 'ARRIVING' AND p_new_status NOT IN ('SEATED', 'CANCELLED', 'NO_SHOW') THEN
    RAISE EXCEPTION 'transition: Cannot transition from ARRIVING to %', p_new_status;
  ELSIF v_current_res.status = 'SEATED' AND p_new_status NOT IN ('COMPLETED') THEN
    RAISE EXCEPTION 'transition: Cannot transition from SEATED to %', p_new_status;
  ELSIF v_current_res.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW') THEN
    RAISE EXCEPTION 'transition: Cannot transition from terminal state %', v_current_res.status;
  END IF;

  -- Apply the update with corresponding timestamps
  UPDATE reservations
  SET 
    status = p_new_status,
    updated_at = NOW(),
    confirmed_at = CASE WHEN p_new_status = 'CONFIRMED' THEN NOW() ELSE confirmed_at END,
    seated_at = CASE WHEN p_new_status = 'SEATED' THEN NOW() ELSE seated_at END,
    completed_at = CASE WHEN p_new_status = 'COMPLETED' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
    cancelled_by = CASE WHEN p_new_status = 'CANCELLED' THEN p_user_id ELSE cancelled_by END,
    cancellation_reason = CASE WHEN p_new_status = 'CANCELLED' THEN p_reason ELSE cancellation_reason END
  WHERE id = p_reservation_id
  RETURNING row_to_json(reservations.*) INTO v_updated_res;

  RETURN v_updated_res;
END;
$$;
