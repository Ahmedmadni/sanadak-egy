-- Gate 19C read-only verification.

SELECT 'direct_tenant_insert_revoked' AS check_name,
       CASE
         WHEN has_table_privilege('authenticated', 'public.tenants', 'INSERT')
           THEN 'FAIL' ELSE 'PASS'
       END AS result
UNION ALL
SELECT 'self_onboarding_authenticated_execute',
       CASE
         WHEN has_function_privilege(
           'authenticated',
           'public.request_tenant_onboarding(text,text,uuid,text,text,text,text)',
           'EXECUTE'
         ) THEN 'PASS' ELSE 'FAIL'
       END
UNION ALL
SELECT 'self_onboarding_public_execute_absent',
       CASE
         WHEN has_function_privilege(
           'public',
           'public.request_tenant_onboarding(text,text,uuid,text,text,text,text)',
           'EXECUTE'
         ) THEN 'FAIL' ELSE 'PASS'
       END
UNION ALL
SELECT 'legacy_store_request_anon_insert_revoked',
       CASE
         WHEN has_table_privilege('anon', 'public.store_requests', 'INSERT')
           THEN 'FAIL' ELSE 'PASS'
       END
UNION ALL
SELECT 'private_has_role_empty_search_path',
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'private'
             AND p.proname = 'has_role'
             AND coalesce(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%'
         ) THEN 'PASS' ELSE 'FAIL'
       END
UNION ALL
SELECT 'private_is_tenant_member_empty_search_path',
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'private'
             AND p.proname = 'is_tenant_member'
             AND coalesce(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%'
         ) THEN 'PASS' ELSE 'FAIL'
       END
ORDER BY check_name;

SELECT
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('tenant-documents', 'tenant-media')
ORDER BY id;

SELECT
  'users_with_multiple_pending_tenants' AS finding,
  count(*) AS row_count
FROM (
  SELECT owner_id
  FROM public.tenants
  WHERE status = 'pending'
    AND owner_id IS NOT NULL
  GROUP BY owner_id
  HAVING count(*) > 1
) x;
