-- Gate 2C: force customer checkout through public.create_order(...)
--
-- Preconditions before applying live:
-- 1) Gate 2A/B is deployed to the frontend.
-- 2) Browser checkout has been verified to create orders through public.create_order(...).
--
-- This migration removes the legacy direct INSERT surface for customer-facing roles.

REVOKE INSERT ON TABLE public.orders FROM anon, authenticated;
REVOKE INSERT ON TABLE public.order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;

COMMENT ON TABLE public.orders IS
'Orders are created atomically through public.create_order(...); direct anon/authenticated INSERT is intentionally disabled.';

COMMENT ON TABLE public.order_items IS
'Order item snapshots are created atomically through public.create_order(...); direct anon/authenticated INSERT is intentionally disabled.';
