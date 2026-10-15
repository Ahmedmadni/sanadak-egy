-- Gate 19D read-only verification.

SELECT 'anon_base_tenants_select_revoked' AS check_name,
       CASE WHEN has_table_privilege('anon', 'public.tenants', 'SELECT') THEN 'FAIL' ELSE 'PASS' END AS result
UNION ALL
SELECT 'anon_base_catalog_select_revoked',
       CASE WHEN has_table_privilege('anon', 'public.catalog_items', 'SELECT') THEN 'FAIL' ELSE 'PASS' END
UNION ALL
SELECT 'anon_base_staff_select_revoked',
       CASE WHEN has_table_privilege('anon', 'public.staff', 'SELECT') THEN 'FAIL' ELSE 'PASS' END
UNION ALL
SELECT 'anon_base_reviews_select_revoked',
       CASE WHEN has_table_privilege('anon', 'public.reviews', 'SELECT') THEN 'FAIL' ELSE 'PASS' END
UNION ALL
SELECT 'storefront_tenants_anon_select',
       CASE WHEN has_table_privilege('anon', 'public.storefront_tenants', 'SELECT') THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'storefront_catalog_anon_select',
       CASE WHEN has_table_privilege('anon', 'public.storefront_catalog_items', 'SELECT') THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'storefront_staff_anon_select',
       CASE WHEN has_table_privilege('anon', 'public.storefront_staff', 'SELECT') THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'storefront_reviews_anon_select',
       CASE WHEN has_table_privilege('anon', 'public.storefront_reviews', 'SELECT') THEN 'PASS' ELSE 'FAIL' END
ORDER BY check_name;

SELECT
  schemaname,
  tablename,
  policyname,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'branches', 'staff', 'catalog_items', 'reviews')
  AND policyname LIKE 'Public%'
ORDER BY tablename, policyname;
