-- Gate 19B: protect inventory and booking availability from anonymous abuse.
--
-- Contract:
-- 1) Anonymous guest orders may be created, but they do NOT reserve stock while pending.
--    Stock is reserved atomically when tenant staff confirms the order.
-- 2) Authenticated customer orders keep the existing immediate-reservation behavior.
-- 3) Anonymous pending booking requests do NOT consume availability.
--    A slot is claimed atomically when tenant staff confirms the booking.
-- 4) Authenticated pending bookings continue to reserve their slot.
-- 5) Order variant selections are validated against the authoritative catalog.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order(
  _tenant uuid,
  _items jsonb,
  _customer_name text,
  _customer_phone text,
  _customer_address text DEFAULT NULL,
  _delivery_type text DEFAULT 'pickup',
  _notes text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  serial_no bigint,
  subtotal numeric,
  total numeric,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_customer_id uuid := auth.uid();
  v_item_count int;
  v_matched_count int;
  v_currency_count int;
  v_currency text;
  v_subtotal numeric(10,2);
  v_serial bigint;
  v_tracks_inventory boolean := false;
  v_reserved_at timestamptz;
  v_reserve_now boolean := v_customer_id IS NOT NULL;
BEGIN
  IF NOT public.tenant_is_visible(_tenant) THEN
    RAISE EXCEPTION 'tenant unavailable';
  END IF;

  IF char_length(trim(coalesce(_customer_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid customer name';
  END IF;

  IF char_length(trim(coalesce(_customer_phone, ''))) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'invalid customer phone';
  END IF;

  IF _customer_address IS NOT NULL AND char_length(_customer_address) > 500 THEN
    RAISE EXCEPTION 'customer address too long';
  END IF;

  IF _notes IS NOT NULL AND char_length(_notes) > 2000 THEN
    RAISE EXCEPTION 'notes too long';
  END IF;

  IF _delivery_type NOT IN ('pickup', 'delivery', 'dine_in') THEN
    RAISE EXCEPTION 'invalid delivery type';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a JSON array';
  END IF;

  IF octet_length(_items::text) > 100000 THEN
    RAISE EXCEPTION 'items payload too large';
  END IF;

  v_item_count := jsonb_array_length(_items);
  IF v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION 'order must contain between 1 and 50 items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_items) AS x(item)
    WHERE jsonb_typeof(x.item) <> 'object'
       OR coalesce(x.item->>'item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR CASE
            WHEN coalesce(x.item->>'qty', '') ~ '^[0-9]{1,2}$'
              THEN (x.item->>'qty')::int NOT BETWEEN 1 AND 99
            ELSE true
          END
       OR (
         x.item ? 'variants'
         AND x.item->'variants' IS NOT NULL
         AND jsonb_typeof(x.item->'variants') <> 'object'
       )
  ) THEN
    RAISE EXCEPTION 'invalid order item payload';
  END IF;

  -- Authenticated checkout preserves immediate inventory reservation. Anonymous
  -- checkout only needs a consistent catalog snapshot here; its stock claim is
  -- deferred to the staff confirmation transition.
  IF v_reserve_now THEN
    PERFORM 1
    FROM public.catalog_items c
    JOIN (
      SELECT
        (x.item->>'item_id')::uuid AS item_id,
        sum((x.item->>'qty')::int)::int AS requested_qty
      FROM jsonb_array_elements(_items) AS x(item)
      GROUP BY (x.item->>'item_id')::uuid
    ) requested ON requested.item_id = c.id
    WHERE c.tenant_id = _tenant
      AND c.is_active = true
    ORDER BY c.id
    FOR UPDATE OF c;
  END IF;

  SELECT
    count(*),
    count(DISTINCT c.currency),
    min(c.currency),
    coalesce(sum(c.price * (x.item->>'qty')::int), 0)::numeric(10,2),
    coalesce(bool_or(c.stock IS NOT NULL), false)
  INTO
    v_matched_count,
    v_currency_count,
    v_currency,
    v_subtotal,
    v_tracks_inventory
  FROM jsonb_array_elements(_items) AS x(item)
  JOIN public.catalog_items c
    ON c.id = (x.item->>'item_id')::uuid
   AND c.tenant_id = _tenant
   AND c.is_active = true;

  IF v_matched_count <> v_item_count THEN
    RAISE EXCEPTION 'one or more items are invalid, inactive, or belong to another tenant';
  END IF;

  IF v_currency_count <> 1 OR v_currency IS NULL THEN
    RAISE EXCEPTION 'all order items must use one currency';
  END IF;

  -- A variant snapshot must match the current catalog labels exactly. Products
  -- without variants must not accept an arbitrary client-supplied selection.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_items) AS x(item)
    JOIN public.catalog_items c
      ON c.id = (x.item->>'item_id')::uuid
     AND c.tenant_id = _tenant
     AND c.is_active = true
    WHERE
      jsonb_typeof(c.variants) <> 'array'
      OR (
        jsonb_array_length(c.variants) = 0
        AND NULLIF(btrim(COALESCE(x.item->'variants'->>'selection', '')), '') IS NOT NULL
      )
      OR (
        jsonb_array_length(c.variants) > 0
        AND (
          NULLIF(btrim(COALESCE(x.item->'variants'->>'selection', '')), '') IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.variants) AS v(variant)
            WHERE v.variant->>'label' = x.item->'variants'->>'selection'
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'invalid product variant selection';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.catalog_items c
    JOIN (
      SELECT
        (x.item->>'item_id')::uuid AS item_id,
        sum((x.item->>'qty')::int)::int AS requested_qty
      FROM jsonb_array_elements(_items) AS x(item)
      GROUP BY (x.item->>'item_id')::uuid
    ) requested ON requested.item_id = c.id
    WHERE c.tenant_id = _tenant
      AND c.stock IS NOT NULL
      AND c.stock < requested.requested_qty
  ) THEN
    RAISE EXCEPTION 'insufficient stock for one or more items';
  END IF;

  IF v_reserve_now AND v_tracks_inventory THEN
    v_reserved_at := clock_timestamp();

    UPDATE public.catalog_items c
    SET stock = c.stock - requested.requested_qty
    FROM (
      SELECT
        (x.item->>'item_id')::uuid AS item_id,
        sum((x.item->>'qty')::int)::int AS requested_qty
      FROM jsonb_array_elements(_items) AS x(item)
      GROUP BY (x.item->>'item_id')::uuid
    ) requested
    WHERE c.id = requested.item_id
      AND c.tenant_id = _tenant
      AND c.stock IS NOT NULL;
  END IF;

  INSERT INTO public.orders (
    id,
    tenant_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_address,
    delivery_type,
    subtotal,
    delivery_fee,
    total,
    currency,
    status,
    payment_status,
    notes,
    inventory_reserved_at
  ) VALUES (
    v_order_id,
    _tenant,
    v_customer_id,
    trim(_customer_name),
    trim(_customer_phone),
    nullif(trim(coalesce(_customer_address, '')), ''),
    _delivery_type,
    v_subtotal,
    0,
    v_subtotal,
    v_currency,
    'pending',
    'unpaid',
    nullif(trim(coalesce(_notes, '')), ''),
    v_reserved_at
  )
  RETURNING public.orders.serial_no INTO v_serial;

  INSERT INTO public.order_items (
    order_id,
    item_id,
    name,
    qty,
    unit_price,
    total,
    variants
  )
  SELECT
    v_order_id,
    c.id,
    c.name,
    (x.item->>'qty')::int,
    c.price,
    (c.price * (x.item->>'qty')::int)::numeric(10,2),
    coalesce(x.item->'variants', '{}'::jsonb)
  FROM jsonb_array_elements(_items) AS x(item)
  JOIN public.catalog_items c
    ON c.id = (x.item->>'item_id')::uuid
   AND c.tenant_id = _tenant
   AND c.is_active = true;

  RETURN QUERY
  SELECT
    v_order_id,
    v_serial,
    v_subtotal::numeric,
    v_subtotal::numeric,
    v_currency;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_order_inventory_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tracks_inventory boolean := false;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'order identity is managed by the database';
  END IF;

  IF NEW.inventory_reserved_at IS DISTINCT FROM OLD.inventory_reserved_at
     OR NEW.inventory_released_at IS DISTINCT FROM OLD.inventory_released_at THEN
    RAISE EXCEPTION 'order inventory timestamps are managed by the database';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid order status';
  END IF;

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('preparing', 'ready', 'cancelled'))
    OR (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled'))
    OR (OLD.status = 'ready' AND NEW.status IN ('out_for_delivery', 'delivered', 'cancelled'))
    OR (OLD.status = 'out_for_delivery' AND NEW.status IN ('delivered', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'invalid order status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Anonymous pending orders intentionally have no reservation. Staff
  -- confirmation is the atomic inventory-claim boundary.
  IF OLD.status = 'pending'
     AND NEW.status = 'confirmed'
     AND OLD.inventory_reserved_at IS NULL THEN

    PERFORM 1
    FROM public.catalog_items c
    JOIN (
      SELECT oi.item_id, sum(oi.qty)::int AS requested_qty
      FROM public.order_items oi
      WHERE oi.order_id = OLD.id
        AND oi.item_id IS NOT NULL
      GROUP BY oi.item_id
    ) requested ON requested.item_id = c.id
    WHERE c.tenant_id = OLD.tenant_id
      AND c.stock IS NOT NULL
    ORDER BY c.id
    FOR UPDATE OF c;

    IF EXISTS (
      SELECT 1
      FROM public.catalog_items c
      JOIN (
        SELECT oi.item_id, sum(oi.qty)::int AS requested_qty
        FROM public.order_items oi
        WHERE oi.order_id = OLD.id
          AND oi.item_id IS NOT NULL
        GROUP BY oi.item_id
      ) requested ON requested.item_id = c.id
      WHERE c.tenant_id = OLD.tenant_id
        AND c.stock IS NOT NULL
        AND c.stock < requested.requested_qty
    ) THEN
      RAISE EXCEPTION 'insufficient stock for one or more items';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.catalog_items c
      JOIN public.order_items oi ON oi.item_id = c.id
      WHERE oi.order_id = OLD.id
        AND c.tenant_id = OLD.tenant_id
        AND c.stock IS NOT NULL
    )
    INTO v_tracks_inventory;

    IF v_tracks_inventory THEN
      UPDATE public.catalog_items c
      SET stock = c.stock - requested.requested_qty
      FROM (
        SELECT oi.item_id, sum(oi.qty)::int AS requested_qty
        FROM public.order_items oi
        WHERE oi.order_id = OLD.id
          AND oi.item_id IS NOT NULL
        GROUP BY oi.item_id
      ) requested
      WHERE c.id = requested.item_id
        AND c.tenant_id = OLD.tenant_id
        AND c.stock IS NOT NULL;

      NEW.inventory_reserved_at := clock_timestamp();
    END IF;
  END IF;

  IF NEW.status = 'cancelled'
     AND OLD.inventory_reserved_at IS NOT NULL
     AND OLD.inventory_released_at IS NULL THEN
    UPDATE public.catalog_items c
    SET stock = c.stock + released.qty
    FROM (
      SELECT oi.item_id, sum(oi.qty)::int AS qty
      FROM public.order_items oi
      WHERE oi.order_id = OLD.id
        AND oi.item_id IS NOT NULL
      GROUP BY oi.item_id
    ) released
    WHERE c.id = released.item_id
      AND c.tenant_id = OLD.tenant_id
      AND c.stock IS NOT NULL;

    NEW.inventory_released_at := clock_timestamp();
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_order_inventory_status()
  FROM PUBLIC, anon, authenticated, service_role;

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
AS $function$
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

  IF _slot_start > clock_timestamp() + interval '60 days' THEN
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
      AND (
        lower(COALESCE(b.status, 'pending')) = 'confirmed'
        OR (
          lower(COALESCE(b.status, 'pending')) = 'pending'
          AND b.customer_id IS NOT NULL
        )
      )
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
$function$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text)
  TO anon, authenticated;

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
AS $function$
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
        AND (
          lower(COALESCE(b.status, 'pending')) = 'confirmed'
          OR (
            lower(COALESCE(b.status, 'pending')) = 'pending'
            AND b.customer_id IS NOT NULL
          )
        )
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
$function$;

REVOKE ALL ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_booking_status(
  _booking uuid,
  _status text,
  _cancellation_reason text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  status text,
  cancelled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_status text := lower(btrim(COALESCE(_status, '')));
  v_reason text := NULLIF(btrim(COALESCE(_cancellation_reason, '')), '');
  v_is_staff boolean := false;
  v_cancelled_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _booking IS NULL OR v_status NOT IN ('confirmed', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'invalid booking status';
  END IF;

  IF char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'cancellation reason is too long';
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = _booking
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  v_is_staff := private.is_tenant_member(v_actor, v_booking.tenant_id, 'employee')
    OR private.has_role(v_actor, 'admin'::public.app_role);

  IF v_is_staff THEN
    IF (v_booking.status = 'pending' AND v_status NOT IN ('confirmed', 'cancelled'))
      OR (v_booking.status = 'confirmed' AND v_status NOT IN ('completed', 'cancelled', 'no_show'))
      OR v_booking.status IN ('completed', 'cancelled', 'no_show') THEN
      RAISE EXCEPTION 'invalid booking status transition';
    END IF;
  ELSIF v_booking.customer_id = v_actor
    AND v_status = 'cancelled'
    AND v_booking.status IN ('pending', 'confirmed')
    AND v_booking.slot_start > clock_timestamp() THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'booking status access denied';
  END IF;

  -- Confirmation is the authoritative claim boundary for anonymous pending
  -- requests. Serialize the same resource key used by create_booking().
  IF v_is_staff
     AND v_booking.status = 'pending'
     AND v_status = 'confirmed' THEN

    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_booking.tenant_id::text || ':' || COALESCE(v_booking.staff_id::text, v_booking.item_id::text),
        0
      )
    );

    IF EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id <> v_booking.id
        AND b.tenant_id = v_booking.tenant_id
        AND (
          lower(COALESCE(b.status, 'pending')) = 'confirmed'
          OR (
            lower(COALESCE(b.status, 'pending')) = 'pending'
            AND b.customer_id IS NOT NULL
          )
        )
        AND b.slot_start < COALESCE(v_booking.slot_end, v_booking.slot_start + interval '1 minute')
        AND COALESCE(b.slot_end, b.slot_start + interval '1 minute') > v_booking.slot_start
        AND (
          (v_booking.staff_id IS NOT NULL AND b.staff_id = v_booking.staff_id)
          OR
          (v_booking.staff_id IS NULL AND b.item_id = v_booking.item_id)
        )
    ) THEN
      RAISE EXCEPTION 'selected time is no longer available';
    END IF;
  END IF;

  IF v_status = 'cancelled' THEN
    v_cancelled_at := clock_timestamp();
    UPDATE public.bookings b
    SET status = 'cancelled',
        cancelled_at = v_cancelled_at,
        cancelled_by = v_actor,
        cancellation_reason = v_reason
    WHERE b.id = _booking;
  ELSE
    UPDATE public.bookings b
    SET status = v_status
    WHERE b.id = _booking;
  END IF;

  RETURN QUERY SELECT _booking, v_status, v_cancelled_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_booking_status(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
IS 'Creates authoritative orders. Authenticated orders reserve stock immediately; anonymous pending orders reserve stock only when staff confirms them.';

COMMENT ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text, uuid, uuid, text)
IS 'Creates booking requests. Anonymous pending requests do not consume availability until staff confirmation; authenticated pending bookings remain reservation-bearing.';

COMMENT ON FUNCTION public.get_booking_availability(uuid, uuid, date, uuid, uuid)
IS 'Returns availability while ignoring anonymous pending booking requests that have not been confirmed by staff.';

COMMIT;
