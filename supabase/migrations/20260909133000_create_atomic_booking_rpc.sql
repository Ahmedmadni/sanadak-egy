-- Gate 3A: authoritative, conflict-safe booking creation RPC.
--
-- This is a staged rollout. Legacy direct INSERT on public.bookings remains
-- temporarily available until the frontend RPC path is deployed and verified.

CREATE OR REPLACE FUNCTION public.create_booking(
  _tenant uuid,
  _item uuid,
  _slot_start timestamptz,
  _customer_name text,
  _customer_phone text,
  _branch uuid DEFAULT NULL,
  _staff uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  serial_no bigint,
  slot_start timestamptz,
  slot_end timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_duration integer;
  v_slot_end timestamptz;
  v_booking_id uuid;
  v_serial_no bigint;
  v_status text;
  v_has_bookings boolean;
BEGIN
  IF _tenant IS NULL OR _item IS NULL OR _slot_start IS NULL THEN
    RAISE EXCEPTION 'tenant, item and slot_start are required';
  END IF;

  IF NOT public.tenant_is_visible(_tenant) THEN
    RAISE EXCEPTION 'business is not available for booking';
  END IF;

  SELECT at.has_bookings
    INTO v_has_bookings
  FROM public.tenants t
  LEFT JOIN public.activity_types at ON at.code = t.category
  WHERE t.id = _tenant;

  IF COALESCE(v_has_bookings, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'this business type does not support bookings';
  END IF;

  IF length(trim(COALESCE(_customer_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'customer name must be between 1 and 200 characters';
  END IF;

  IF length(trim(COALESCE(_customer_phone, ''))) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'customer phone must be between 1 and 40 characters';
  END IF;

  IF length(COALESCE(_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'notes are too long';
  END IF;

  IF _slot_start < clock_timestamp() - interval '1 minute' THEN
    RAISE EXCEPTION 'booking time must be in the future';
  END IF;

  IF _slot_start > clock_timestamp() + interval '365 days' THEN
    RAISE EXCEPTION 'booking time is too far in the future';
  END IF;

  SELECT c.duration_minutes
    INTO v_duration
  FROM public.catalog_items c
  WHERE c.id = _item
    AND c.tenant_id = _tenant
    AND c.is_active = true
  FOR SHARE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking item is unavailable';
  END IF;

  IF v_duration IS NULL OR v_duration < 5 OR v_duration > 1440 THEN
    RAISE EXCEPTION 'booking item has an invalid duration';
  END IF;

  v_slot_end := _slot_start + make_interval(mins => v_duration);

  IF _branch IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = _branch
      AND b.tenant_id = _tenant
      AND b.is_active = true
  ) THEN
    RAISE EXCEPTION 'branch is unavailable';
  END IF;

  IF _staff IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = _staff
      AND s.tenant_id = _tenant
      AND s.is_active = true
      AND (_branch IS NULL OR s.branch_id IS NULL OR s.branch_id = _branch)
  ) THEN
    RAISE EXCEPTION 'staff member is unavailable';
  END IF;

  -- Serialize competing bookings for the same resource inside the transaction.
  -- With a staff member, the staff member is the resource across all services.
  -- Without staff selection, the catalog item itself is treated as capacity=1.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _tenant::text || ':' || COALESCE(_staff::text, _item::text),
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.tenant_id = _tenant
      AND lower(COALESCE(b.status, 'pending')) NOT IN ('cancelled', 'canceled', 'rejected')
      AND b.slot_start < v_slot_end
      AND COALESCE(b.slot_end, b.slot_start + interval '1 minute') > _slot_start
      AND (
        (_staff IS NOT NULL AND b.staff_id = _staff)
        OR
        (_staff IS NULL AND b.item_id = _item)
      )
  ) THEN
    RAISE EXCEPTION 'selected time is no longer available';
  END IF;

  INSERT INTO public.bookings (
    tenant_id,
    customer_id,
    customer_name,
    customer_phone,
    branch_id,
    staff_id,
    item_id,
    slot_start,
    slot_end,
    notes,
    status
  )
  VALUES (
    _tenant,
    v_customer_id,
    trim(_customer_name),
    trim(_customer_phone),
    _branch,
    _staff,
    _item,
    _slot_start,
    v_slot_end,
    NULLIF(trim(COALESCE(_notes, '')), ''),
    'pending'
  )
  RETURNING bookings.id, bookings.serial_no, bookings.status
    INTO v_booking_id, v_serial_no, v_status;

  RETURN QUERY
  SELECT v_booking_id, v_serial_no, _slot_start, v_slot_end, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text) IS
'Creates a booking atomically using authoritative item duration and rejects overlapping bookings for the selected staff/resource.';
