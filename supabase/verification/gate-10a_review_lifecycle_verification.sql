-- Gate 10A review lifecycle verification. Read only; run after the migration.

SELECT check_name, result
FROM (
  SELECT 'reviews_rating_constraint_valid' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.reviews'::regclass
        AND c.conname = 'reviews_rating_range'
        AND c.convalidated
    ) THEN 'PASS' ELSE 'FAIL' END AS result

  UNION ALL

  SELECT 'reviews_body_constraint_valid',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.reviews'::regclass
        AND c.conname = 'reviews_body_length'
        AND c.convalidated
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'reviews_default_pending',
    CASE WHEN pg_get_expr(d.adbin, d.adrelid) = 'false'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_attribute a
  JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = 'public.reviews'::regclass
    AND a.attname = 'is_approved'

  UNION ALL

  SELECT 'authenticated_review_insert_closed',
    CASE WHEN has_table_privilege('authenticated', 'public.reviews', 'INSERT')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'authenticated_review_update_closed',
    CASE WHEN has_table_privilege('authenticated', 'public.reviews', 'UPDATE')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'authenticated_review_delete_closed',
    CASE WHEN has_table_privilege('authenticated', 'public.reviews', 'DELETE')
      THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'authenticated_review_select_retained',
    CASE WHEN has_table_privilege('authenticated', 'public.reviews', 'SELECT')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'submit_review_authenticated_execute',
    CASE WHEN has_function_privilege(
      'authenticated', 'public.submit_review(uuid,integer,text)', 'EXECUTE'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'submit_review_anon_execute_absent',
    CASE WHEN has_function_privilege(
      'anon', 'public.submit_review(uuid,integer,text)', 'EXECUTE'
    ) THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'moderate_review_authenticated_execute',
    CASE WHEN has_function_privilege(
      'authenticated', 'public.moderate_review(uuid,boolean)', 'EXECUTE'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'moderate_review_anon_execute_absent',
    CASE WHEN has_function_privilege(
      'anon', 'public.moderate_review(uuid,boolean)', 'EXECUTE'
    ) THEN 'FAIL' ELSE 'PASS' END

  UNION ALL

  SELECT 'review_rpcs_security_definer',
    CASE WHEN bool_and(p.prosecdef) THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid IN (
    'public.submit_review(uuid,integer,text)'::regprocedure,
    'public.moderate_review(uuid,boolean)'::regprocedure,
    'public.delete_own_review(uuid)'::regprocedure
  )

  UNION ALL

  SELECT 'review_rpcs_empty_search_path',
    CASE WHEN bool_and(
      COALESCE(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%'
    ) THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid IN (
    'public.submit_review(uuid,integer,text)'::regprocedure,
    'public.moderate_review(uuid,boolean)'::regprocedure,
    'public.delete_own_review(uuid)'::regprocedure
  )

  UNION ALL

  SELECT 'public_reviews_visibility_gated',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = 'reviews'
        AND p.policyname = 'Public reads approved visible reviews'
        AND p.qual LIKE '%tenant_is_visible%'
    ) THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'legacy_review_write_policies_absent',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = 'reviews'
        AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
    ) THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY check_name;
