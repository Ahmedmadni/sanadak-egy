-- Gate 16A structural and security verification.

SELECT check_name, result
FROM (
  SELECT 'order_history_table_exists' AS check_name,
    CASE WHEN to_regclass('public.order_status_history') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL
  SELECT 'booking_history_table_exists',
    CASE WHEN to_regclass('public.booking_status_history') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_rls_enabled',
    CASE WHEN bool_and(c.relrowsecurity) THEN 'PASS' ELSE 'FAIL' END
    FROM pg_class c WHERE c.oid IN ('public.order_status_history'::regclass, 'public.booking_status_history'::regclass)
  UNION ALL
  SELECT 'history_authenticated_write_closed',
    CASE WHEN NOT has_table_privilege('authenticated', 'public.order_status_history', 'INSERT, UPDATE, DELETE')
              AND NOT has_table_privilege('authenticated', 'public.booking_status_history', 'INSERT, UPDATE, DELETE')
         THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_anon_write_closed',
    CASE WHEN NOT has_table_privilege('anon', 'public.order_status_history', 'INSERT, UPDATE, DELETE')
              AND NOT has_table_privilege('anon', 'public.booking_status_history', 'INSERT, UPDATE, DELETE')
         THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_has_no_write_policies',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('order_status_history', 'booking_status_history')
        AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_trigger_functions_exist',
    CASE WHEN to_regprocedure('public.record_order_status_history()') IS NOT NULL
              AND to_regprocedure('public.record_booking_status_history()') IS NOT NULL
         THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_trigger_functions_security_definer',
    CASE WHEN bool_and(p.prosecdef) THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p
    WHERE p.oid IN ('public.record_order_status_history()'::regprocedure, 'public.record_booking_status_history()'::regprocedure)
  UNION ALL
  SELECT 'history_trigger_functions_empty_search_path',
    CASE WHEN bool_and(COALESCE(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%') THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p
    WHERE p.oid IN ('public.record_order_status_history()'::regprocedure, 'public.record_booking_status_history()'::regprocedure)
  UNION ALL
  SELECT 'history_trigger_functions_public_execute_absent',
    CASE WHEN NOT has_function_privilege('public', 'public.record_order_status_history()', 'EXECUTE')
              AND NOT has_function_privilege('public', 'public.record_booking_status_history()', 'EXECUTE')
         THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'order_status_history_trigger_enabled',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.orders'::regclass AND tgname = 'orders_status_history' AND tgenabled = 'O'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'booking_status_history_trigger_enabled',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.bookings'::regclass AND tgname = 'bookings_status_history' AND tgenabled = 'O'
    ) THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY check_name;
