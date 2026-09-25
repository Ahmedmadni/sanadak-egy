-- Gate 14B transaction-notification verification. Read only.

SELECT check_name, result
FROM (
  SELECT 'order_notification_function_exists' AS check_name,
    CASE WHEN to_regprocedure('public.notify_order_status_change()') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL
  SELECT 'booking_notification_function_exists',
    CASE WHEN to_regprocedure('public.notify_booking_status_change()') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'notification_functions_security_definer',
    CASE WHEN bool_and(p.prosecdef) THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p WHERE p.oid IN ('public.notify_order_status_change()'::regprocedure, 'public.notify_booking_status_change()'::regprocedure)
  UNION ALL
  SELECT 'notification_functions_empty_search_path',
    CASE WHEN bool_and(COALESCE(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%') THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p WHERE p.oid IN ('public.notify_order_status_change()'::regprocedure, 'public.notify_booking_status_change()'::regprocedure)
  UNION ALL
  SELECT 'order_status_notification_trigger_enabled',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.orders'::regclass AND t.tgname = 'orders_status_notification' AND t.tgenabled = 'O') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'booking_status_notification_trigger_enabled',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.bookings'::regclass AND t.tgname = 'bookings_status_notification' AND t.tgenabled = 'O') THEN 'PASS' ELSE 'FAIL' END
) checks ORDER BY check_name;
