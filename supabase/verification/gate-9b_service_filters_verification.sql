-- Gate 9B search RPC verification. Read only; run after the migration.

SELECT check_name, result
FROM (
  SELECT 'search_v2_exists' AS check_name,
    CASE WHEN to_regprocedure(
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)'
    ) IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result

  UNION ALL

  SELECT 'search_v2_anon_execute',
    CASE WHEN has_function_privilege(
      'anon',
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)',
      'EXECUTE'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'search_v2_authenticated_execute',
    CASE WHEN has_function_privilege(
      'authenticated',
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)',
      'EXECUTE'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'search_v2_public_execute_absent',
    CASE WHEN has_function_privilege(
      'public',
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)',
      'EXECUTE'
    ) THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'search_v2_security_definer',
    CASE WHEN p.prosecdef THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid = 'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)'::regprocedure

  UNION ALL

  SELECT 'search_v2_empty_search_path',
    CASE WHEN COALESCE(array_to_string(p.proconfig, ','), '')
      LIKE '%search_path=""%' THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid = 'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)'::regprocedure

  UNION ALL

  SELECT 'search_v2_subscription_gate',
    CASE WHEN pg_get_functiondef(
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)'::regprocedure
    ) LIKE '%s.status = ''active''%'
    THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'search_v2_catalog_gate',
    CASE WHEN pg_get_functiondef(
      'public.search_tenants_v2(text,text,text,boolean,text,integer,integer,text)'::regprocedure
    ) LIKE '%c.is_active = true%'
    THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'search_v1_still_exists',
    CASE WHEN to_regprocedure(
      'public.search_tenants(text,text,text,boolean,text,integer,integer)'
    ) IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY check_name;
