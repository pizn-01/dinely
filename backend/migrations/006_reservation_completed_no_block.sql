-- ============================================================
-- Migration 006: Terminal reservations must not block tables
-- Fixes:
--   1) create_reservation_atomic — exclude 'completed' from overlap (same as cancelled/no_show)
--   2) update_reservation_atomic — use lowercase reservation_status labels; exclude completed from conflicts
--   3) update_reservation_status_atomic — lowercase enum comparisons; allow arriving -> confirmed (clear seat)
-- Run in Supabase SQL editor after prior migrations.
-- ============================================================

-- ─── 1) CREATE RESERVATION (copy from 003, adjust conflict filter only) ───
CREATE OR REPLACE FUNCTION create_reservation_atomic(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_customer_id UUID,
    p_reservation_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_party_size INT,
    p_guest_first_name VARCHAR,
    p_guest_last_name VARCHAR,
    p_guest_email VARCHAR,
    p_guest_phone VARCHAR,
    p_source reservation_source,
    p_special_requests TEXT,
    p_created_by UUID,
    p_is_premium BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_conflict_count INT;
    v_conflicting_id UUID;
    v_conflicting_source reservation_source;
    v_reservation_id UUID;
    v_result JSONB;
BEGIN
    IF p_table_id IS NOT NULL THEN
        PERFORM id FROM tables
        WHERE id = p_table_id AND restaurant_id = p_restaurant_id
        FOR UPDATE;

        SELECT id, source INTO v_conflicting_id, v_conflicting_source
        FROM reservations
        WHERE table_id = p_table_id
          AND reservation_date = p_reservation_date
          AND status NOT IN ('cancelled', 'no_show', 'completed')
          AND (
              (p_start_time < end_time AND p_end_time > start_time)
          )
        LIMIT 1;

        IF v_conflicting_id IS NOT NULL THEN
            DECLARE
                v_existing_is_premium BOOLEAN := FALSE;
                v_existing_customer_id UUID;
            BEGIN
                SELECT customer_id INTO v_existing_customer_id
                FROM reservations WHERE id = v_conflicting_id;

                IF v_existing_customer_id IS NOT NULL THEN
                    SELECT is_vip INTO v_existing_is_premium
                    FROM customers WHERE id = v_existing_customer_id;
                END IF;

                IF p_is_premium = TRUE AND v_existing_is_premium = FALSE THEN
                    UPDATE reservations
                    SET status = 'cancelled',
                        cancelled_at = NOW(),
                        cancellation_reason = 'Bumped by Premium Member Priority'
                    WHERE id = v_conflicting_id;
                ELSE
                    RAISE EXCEPTION 'Table is no longer available for this time slot';
                END IF;
            END;
        END IF;
    END IF;

    INSERT INTO reservations (
        restaurant_id, table_id, customer_id, reservation_date,
        start_time, end_time, party_size, guest_first_name,
        guest_last_name, guest_email, guest_phone, status,
        source, special_requests, payment_status, confirmed_at, created_by
    ) VALUES (
        p_restaurant_id, p_table_id, p_customer_id, p_reservation_date,
        p_start_time, p_end_time, p_party_size, p_guest_first_name,
        p_guest_last_name, p_guest_email, p_guest_phone, 'confirmed',
        p_source, p_special_requests, 'bypassed', NOW(), p_created_by
    ) RETURNING id INTO v_reservation_id;

    SELECT jsonb_build_object('id', v_reservation_id) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ─── 2) UPDATE RESERVATION ATOMIC (fix enum literals + conflict statuses) ───
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
  v_locked_table_id UUID;
  v_conflict RECORD;
  v_target_table_id UUID;
  v_target_date DATE;
  v_target_start TIME;
  v_target_end TIME;
  v_updated_res JSONB;
BEGIN
  SELECT * INTO v_current_res
  FROM reservations
  WHERE id = p_reservation_id AND restaurant_id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  v_target_table_id := COALESCE(p_table_id, v_current_res.table_id);
  v_target_date := COALESCE(p_reservation_date, v_current_res.reservation_date);
  v_target_start := COALESCE(p_start_time, v_current_res.start_time);
  v_target_end := COALESCE(p_end_time, v_current_res.end_time);

  IF (v_target_table_id IS DISTINCT FROM v_current_res.table_id) OR
     (v_target_date IS DISTINCT FROM v_current_res.reservation_date) OR
     (v_target_start IS DISTINCT FROM v_current_res.start_time) OR
     (v_target_end IS DISTINCT FROM v_current_res.end_time) THEN

    IF v_current_res.status IN ('pending', 'confirmed', 'seated', 'arriving') AND v_target_table_id IS NOT NULL THEN

      SELECT id INTO v_locked_table_id
      FROM tables
      WHERE id = v_target_table_id
      FOR UPDATE;

      SELECT id INTO v_conflict
      FROM reservations
      WHERE table_id = v_target_table_id
        AND reservation_date = v_target_date
        AND id != p_reservation_id
        AND status NOT IN ('cancelled', 'no_show', 'completed')
        AND (
          start_time < v_target_end AND end_time > v_target_start
        )
      LIMIT 1;

      IF FOUND THEN
        RAISE EXCEPTION 'overlap: Table is already booked for the selected time slot.';
      END IF;
    END IF;
  END IF;

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


-- ─── 3) UPDATE STATUS ATOMIC (lowercase enums; arriving -> confirmed) ───
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
  v_new reservation_status;
BEGIN
  SELECT * INTO v_current_res
  FROM reservations
  WHERE id = p_reservation_id AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  v_new := p_new_status::reservation_status;

  IF v_current_res.status = 'pending' AND v_new NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'transition: Cannot transition from pending to %', p_new_status;
  ELSIF v_current_res.status = 'confirmed' AND v_new NOT IN ('arriving', 'seated', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'transition: Cannot transition from confirmed to %', p_new_status;
  ELSIF v_current_res.status = 'arriving' AND v_new NOT IN ('seated', 'cancelled', 'no_show', 'confirmed') THEN
    RAISE EXCEPTION 'transition: Cannot transition from arriving to %', p_new_status;
  ELSIF v_current_res.status = 'seated' AND v_new NOT IN ('completed') THEN
    RAISE EXCEPTION 'transition: Cannot transition from seated to %', p_new_status;
  ELSIF v_current_res.status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'transition: Cannot transition from terminal state %', v_current_res.status;
  END IF;

  UPDATE reservations
  SET
    status = v_new,
    updated_at = NOW(),
    confirmed_at = CASE WHEN v_new = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
    seated_at = CASE WHEN v_new = 'seated' THEN NOW() ELSE seated_at END,
    completed_at = CASE WHEN v_new = 'completed' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN v_new = 'cancelled' THEN NOW() ELSE cancelled_at END,
    cancelled_by = CASE WHEN v_new = 'cancelled' THEN p_user_id ELSE cancelled_by END,
    cancellation_reason = CASE WHEN v_new = 'cancelled' THEN COALESCE(p_reason, cancellation_reason) ELSE cancellation_reason END
  WHERE id = p_reservation_id
  RETURNING row_to_json(reservations.*) INTO v_updated_res;

  RETURN v_updated_res;
END;
$$;
