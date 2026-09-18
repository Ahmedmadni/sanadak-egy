-- Gate 6: public, conflict-aware booking availability.
--
-- The storefront needs free slots without exposing customer bookings. This RPC
-- reuses the same resource rule as create_booking(): a selected staff member is
-- the resource, otherwise the catalog item has capacity one.

CREATE OR REPLACE FUNCTION public.get_booking_availability(
  _tenant uuid,
  _item uuid,
  _date date,
  _branch uuid DEFAULT NULL,
  _staff uuid DEFAULT NULL
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_duration integer;
  v_has_bookings boolean;
  v_timezone text := 'Africa/Cairo';
  v_day_key text;
  v_day_number text;
  v_open time := time '09:00';
  v_close time := time '21:00';
  v_candidate_open time;
  v_candidate_close time;
  v_schedule jsonb;
  v_window jsonb;
  v_open_text text;
  v_close_text text;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  IF _tenant IS NULL OR _item IS NULL OR _date IS NULL THEN
    RAISE EXCEPTION 'tenant, item and date are required';
  END IF;

  IF NOT public.tenant_is_visible(_tenant) THEN
    RAISE EXCEPTION 'business is not available for booking';
  END IF;

  SELECT c.duration_minutes, at.has_bookings
    INTO v_duration, v_has_bookings
  FROM public.catalog_items c
  JOIN public.tenants t ON t.id = c.tenant_id
  LEFT JOIN public.activity_types at ON at.code = t.category
  WHERE c.id = _item
    AND c.tenant_id = _tenant
    AND c.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking item is unavailable';
  END IF;

  IF COALESCE(v_has_bookings, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'this business type does not support bookings';
  END IF;

  IF v_duration IS NULL OR v_duration < 5 OR v_duration > 1440 THEN
    RAISE EXCEPTION 'booking item has an invalid duration';
  END IF;

  IF _date < (clock_timestamp() AT TIME ZONE v_timezone)::date
     OR _date > (clock_timestamp() AT TIME ZONE v_timezone)::date + 60 THEN
    RAISE EXCEPTION 'booking date is outside the allowed range';
  END IF;

  v_day_key := lower(to_char(_date::timestamp, 'dy'));
  v_day_number := extract(dow FROM _date)::integer::text;

  IF _branch IS NOT NULL THEN
    SELECT b.hours
      INTO v_schedule
    FROM public.branches b
    WHERE b.id = _branch
      AND b.tenant_id = _tenant
      AND b.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'branch is unavailable';
    END IF;

    v_window := COALESCE(v_schedule -> v_day_key, v_schedule -> v_day_number);
    IF v_window IS NOT NULL AND jsonb_typeof(v_window) = 'object' THEN
      IF COALESCE((v_window ->> 'closed')::boolean, false)
         OR COALESCE((v_window ->> 'enabled')::boolean, true) IS FALSE THEN
        RETURN;
      END IF;

      v_open_text := v_window ->> 'open';
      v_close_text := v_window ->> 'close';
      IF v_open_text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        v_open := v_open_text::time;
      END IF;
      IF v_close_text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        v_close := v_close_text::time;
      END IF;
    END IF;
  END IF;

  IF _staff IS NOT NULL THEN
    SELECT s.schedule
      INTO v_schedule
    FROM public.staff s
    WHERE s.id = _staff
      AND s.tenant_id = _tenant
      AND s.is_active = true
      AND (_branch IS NULL OR s.branch_id IS NULL OR s.branch_id = _branch);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'staff member is unavailable';
    END IF;

    v_window := COALESCE(v_schedule -> v_day_key, v_schedule -> v_day_number);
    IF v_window IS NOT NULL AND jsonb_typeof(v_window) = 'object' THEN
      IF COALESCE((v_window ->> 'closed')::boolean, false)
         OR COALESCE((v_window ->> 'enabled')::boolean, true) IS FALSE THEN
        RETURN;
      END IF;

      v_open_text := v_window ->> 'open';
      v_close_text := v_window ->> 'close';
      v_candidate_open := NULL;
      v_candidate_close := NULL;

      IF v_open_text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        v_candidate_open := v_open_text::time;
      END IF;
      IF v_close_text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        v_candidate_close := v_close_text::time;
      END IF;

      IF v_candidate_open IS NOT NULL THEN
        v_open := greatest(v_open, v_candidate_open);
      END IF;
      IF v_candidate_close IS NOT NULL THEN
        v_close := least(v_close, v_candidate_close);
      END IF;
    END IF;
  END IF;

  IF v_close <= v_open THEN
    RETURN;
  END IF;

  v_day_start := (_date + v_open) AT TIME ZONE v_timezone;
  v_day_end := (_date + v_close) AT TIME ZONE v_timezone;

  RETURN QUERY
  SELECT candidate AS slot_start,
         candidate + make_interval(mins => v_duration) AS slot_end
  FROM generate_series(
    v_day_start,
    v_day_end - make_interval(mins => v_duration),
    interval '30 minutes'
  ) AS candidate
  WHERE candidate >= clock_timestamp() + interval '5 minutes'
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.tenant_id = _tenant
        AND lower(COALESCE(b.status, 'pending')) NOT IN ('cancelled', 'canceled', 'rejected')
        AND b.slot_start < candidate + make_interval(mins => v_duration)
        AND COALESCE(b.slot_end, b.slot_start + interval '1 minute') > candidate
        AND (
          (_staff IS NOT NULL AND b.staff_id = _staff)
          OR
          (_staff IS NULL AND b.item_id = _item)
        )
    )
  ORDER BY candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid) IS
'Returns conflict-free booking slots in the business timezone without exposing booking records.';
