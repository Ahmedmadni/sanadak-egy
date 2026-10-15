-- Gate 19B read-only verification.

SELECT 'orders_direct_insert_revoked' AS check_name,
       CASE
         WHEN has_table_privilege('anon', 'public.orders', 'INSERT')
           OR has_table_privilege('authenticated', 'public.orders', 'INSERT')
         THEN 'FAIL' ELSE 'PASS'
       END AS result
UNION ALL
SELECT 'bookings_direct_insert_revoked',
       CASE
         WHEN has_table_privilege('anon', 'public.bookings', 'INSERT')
           OR has_table_privilege('authenticated', 'public.bookings', 'INSERT')
         THEN 'FAIL' ELSE 'PASS'
       END
UNION ALL
SELECT 'create_order_anon_execute',
       CASE
         WHEN has_function_privilege(
           'anon',
           'public.create_order(uuid,jsonb,text,text,text,text,text)',
           'EXECUTE'
         ) THEN 'PASS' ELSE 'FAIL'
       END
UNION ALL
SELECT 'create_booking_anon_execute',
       CASE
         WHEN has_function_privilege(
           'anon',
           'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)',
           'EXECUTE'
         ) THEN 'PASS' ELSE 'FAIL'
       END
ORDER BY check_name;

SELECT
  'legacy_anonymous_pending_orders_with_reserved_inventory' AS finding,
  count(*) AS row_count
FROM public.orders o
WHERE o.customer_id IS NULL
  AND o.status = 'pending'
  AND o.inventory_reserved_at IS NOT NULL
  AND o.inventory_released_at IS NULL
UNION ALL
SELECT
  'anonymous_pending_bookings',
  count(*)
FROM public.bookings b
WHERE b.customer_id IS NULL
  AND b.status = 'pending';
