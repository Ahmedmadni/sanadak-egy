-- Gate 17A structural and security verification.

SELECT check_name, result
FROM (
  SELECT 'order_history_actor_name_column_exists' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'order_status_history' AND column_name = 'changed_by_name'
    ) THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL
  SELECT 'booking_history_actor_name_column_exists',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'booking_status_history' AND column_name = 'changed_by_name'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_actor_name_column_nullable',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('order_status_history', 'booking_status_history')
        AND column_name = 'changed_by_name'
        AND is_nullable <> 'YES'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'history_actor_functions_security_definer',
    CASE WHEN bool_and(p.prosecdef) THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p
    WHERE p.oid IN ('public.record_order_status_history()'::regprocedure, 'public.record_booking_status_history()'::regprocedure)
  UNION ALL
  SELECT 'history_actor_functions_empty_search_path',
    CASE WHEN bool_and(COALESCE(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%') THEN 'PASS' ELSE 'FAIL' END
    FROM pg_proc p
    WHERE p.oid IN ('public.record_order_status_history()'::regprocedure, 'public.record_booking_status_history()'::regprocedure)
  UNION ALL
  SELECT 'history_actor_functions_public_execute_absent',
    CASE WHEN NOT has_function_privilege('public', 'public.record_order_status_history()', 'EXECUTE')
              AND NOT has_function_privilege('public', 'public.record_booking_status_history()', 'EXECUTE')
         THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY check_name;
