-- Gate 12A booking lifecycle verification. Read only; run after the migration.

SELECT check_name, result
FROM (
  SELECT 'booking_status_rpc_exists' AS check_name,
    CASE WHEN to_regprocedure('public.set_booking_status(uuid,text,text)') IS NOT NULL
      THEN 'PASS' ELSE 'FAIL' END AS result

  UNION ALL

  SELECT 'authenticated_direct_booking_update_closed',
    CASE WHEN has_table_privilege('authenticated', 'public.bookings', 'UPDATE')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'authenticated_direct_booking_delete_closed',
    CASE WHEN has_table_privilege('authenticated', 'public.bookings', 'DELETE')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'authenticated_booking_select_retained',
    CASE WHEN has_table_privilege('authenticated', 'public.bookings', 'SELECT')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'booking_status_rpc_authenticated_execute',
    CASE WHEN has_function_privilege('authenticated', 'public.set_booking_status(uuid,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'booking_status_rpc_anon_execute_absent',
    CASE WHEN has_function_privilege('anon', 'public.set_booking_status(uuid,text,text)', 'EXECUTE')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'booking_status_rpc_security_definer',
    CASE WHEN p.prosecdef THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid = 'public.set_booking_status(uuid,text,text)'::regprocedure

  UNION ALL

  SELECT 'booking_status_rpc_empty_search_path',
    CASE WHEN COALESCE(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid = 'public.set_booking_status(uuid,text,text)'::regprocedure

  UNION ALL

  SELECT 'booking_status_constraint_exists',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.bookings'::regclass
        AND c.conname = 'bookings_status_allowed'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'legacy_booking_update_policy_absent',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = 'bookings'
        AND p.cmd IN ('UPDATE', 'DELETE')
    ) THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY check_name;
