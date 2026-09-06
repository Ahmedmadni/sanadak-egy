-- Gate 2A: authoritative atomic order creation RPC.
-- Adds the safe transaction boundary first, without yet revoking the legacy direct INSERT path.

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
AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_customer_id uuid := auth.uid();
  v_item_count int;
  v_matched_count int;
  v_currency_count int;
  v_currency text;
  v_subtotal numeric(10,2);
  v_serial bigint;
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

  v_item_count := jsonb_array_length(_items);
  IF v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION 'order must contain between 1 and 50 items';
  END IF;

  -- Validate item payload shape before any UUID/int casts are attempted.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_items) AS x(item)
    WHERE jsonb_typeof(x.item) <> 'object'
       OR coalesce(x.item->>'item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR coalesce(x.item->>'qty', '') !~ '^[0-9]+$'
       OR (x.item->>'qty')::int NOT BETWEEN 1 AND 99
       OR (
         x.item ? 'variants'
         AND x.item->'variants' IS NOT NULL
         AND jsonb_typeof(x.item->'variants') <> 'object'
       )
  ) THEN
    RAISE EXCEPTION 'invalid order item payload';
  END IF;

  -- Lock authoritative catalog rows for the duration of this transaction so
  -- price/name/currency cannot change between validation, totals and snapshot insertion.
  PERFORM 1
  FROM public.catalog_items c
  JOIN (
    SELECT (x.item->>'item_id')::uuid AS item_id
    FROM jsonb_array_elements(_items) AS x(item)
  ) p ON p.item_id = c.id
  WHERE c.tenant_id = _tenant
    AND c.is_active = true
  FOR SHARE OF c;

  SELECT
    count(*),
    count(DISTINCT c.currency),
    min(c.currency),
    coalesce(sum(c.price * (x.item->>'qty')::int), 0)::numeric(10,2)
  INTO
    v_matched_count,
    v_currency_count,
    v_currency,
    v_subtotal
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
    notes
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
    nullif(trim(coalesce(_notes, '')), '')
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
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
IS 'Atomically creates an order and authoritative order-item snapshots from catalog data. Client-supplied prices/totals are ignored.';
