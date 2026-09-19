-- Gate 8A: reserve tracked inventory atomically with order creation.
--
-- Rollout notes:
-- - NULL catalog_items.stock continues to mean "inventory is not tracked".
-- - Existing orders are intentionally left with inventory_reserved_at = NULL so
--   cancelling a pre-Gate-8 order cannot add stock that was never deducted.
-- - Authenticated table UPDATE remains available during the frontend rollout,
--   but the trigger below enforces status transitions and exactly-once release.
-- - Order-item snapshots become immutable and orders cannot be deleted by tenant
--   members, because either action could corrupt a later stock release.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.catalog_items
    WHERE stock < 0
  ) THEN
    RAISE EXCEPTION 'negative catalog stock must be corrected before Gate 8A';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_items'::regclass
      AND conname = 'catalog_items_stock_nonnegative'
  ) THEN
    ALTER TABLE public.catalog_items
      ADD CONSTRAINT catalog_items_stock_nonnegative
      CHECK (stock IS NULL OR stock >= 0)
      NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.catalog_items
  VALIDATE CONSTRAINT catalog_items_stock_nonnegative;

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
  v_tracks_inventory boolean := false;
  v_reserved_at timestamptz;
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

  -- Lock each catalog row once, in a deterministic order. Concurrent orders for
  -- the same SKU serialize here, so both cannot spend the same final units.
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
    WHERE c.stock IS NOT NULL
      AND c.stock < requested.requested_qty
  ) THEN
    RAISE EXCEPTION 'insufficient stock for one or more items';
  END IF;

  IF v_tracks_inventory THEN
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
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text)
IS 'Atomically validates an order, locks catalog rows, reserves tracked inventory, and creates authoritative order snapshots.';

CREATE OR REPLACE FUNCTION public.enforce_order_inventory_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    CASE OLD.status
      WHEN 'pending' THEN NEW.status IN ('confirmed', 'cancelled')
      WHEN 'confirmed' THEN NEW.status IN ('preparing', 'ready', 'cancelled')
      WHEN 'preparing' THEN NEW.status IN ('ready', 'cancelled')
      WHEN 'ready' THEN NEW.status IN ('out_for_delivery', 'delivered', 'cancelled')
      WHEN 'out_for_delivery' THEN NEW.status IN ('delivered', 'cancelled')
      ELSE false
    END
  ) THEN
    RAISE EXCEPTION 'invalid order status transition from % to %', OLD.status, NEW.status;
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
$$;

REVOKE ALL ON FUNCTION public.enforce_order_inventory_status()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS orders_inventory_status_guard ON public.orders;
CREATE TRIGGER orders_inventory_status_guard
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_inventory_status();

REVOKE UPDATE, DELETE ON TABLE public.order_items FROM authenticated;
REVOKE DELETE ON TABLE public.orders FROM authenticated;

DROP POLICY IF EXISTS "Members manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Members delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Managers delete tenant orders" ON public.orders;

COMMENT ON TABLE public.order_items IS
'Immutable authoritative order snapshots created only by public.create_order(...).';

CREATE OR REPLACE FUNCTION public.set_order_status(
  _order uuid,
  _status text
)
RETURNS TABLE (
  order_id uuid,
  status text,
  inventory_released_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF NOT (
    private.is_tenant_member(auth.uid(), v_order.tenant_id, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'order access denied';
  END IF;

  UPDATE public.orders
  SET status = _status
  WHERE id = _order
  RETURNING * INTO v_order;

  RETURN QUERY
  SELECT v_order.id, v_order.status, v_order.inventory_released_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_status(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.set_order_status(uuid, text)
IS 'Updates an order through the enforced status state machine; cancellation releases reserved stock exactly once.';

COMMENT ON COLUMN public.orders.inventory_reserved_at IS
'Set only for Gate-8 orders that atomically deducted one or more tracked catalog stocks.';

COMMENT ON COLUMN public.orders.inventory_released_at IS
'Set when a reserved order is cancelled and its tracked stock is released exactly once.';
