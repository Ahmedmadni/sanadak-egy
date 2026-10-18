-- SANADAK Gate 35: READ-ONLY follow-up to Gate 31.
-- Correct Supabase project must be verified in Lovable UI before running.
-- This file has SELECT statements only. Do not use as a migration.
--
-- Gate 31 showed policy NAMES and EFFECTIVE privileges but not policy
-- predicates (USING / WITH CHECK) or the direct sources of table grants.
-- Without those, an assertion that sensitive RLS is safe is unproven.

-- 01: Show actual policies, including their executable row predicates.
-- Contains policy metadata only, no customer/order/user rows.
SELECT
  '01_policy_predicates' AS report,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants', 'tenant_members', 'user_roles', 'subscriptions',
    'plans', 'activity_types', 'profiles', 'notifications',
    'orders', 'order_items', 'order_status_history',
    'bookings', 'booking_status_history', 'catalog_items',
    'branches', 'staff', 'reviews', 'tenant_documents',
    'store_requests'
  )
ORDER BY tablename, policyname;

-- 02: Show which principals directly received table privileges.
-- This differs from Gate 31 has_table_privilege: the latter describes
-- effective rights and does not identify whether a grant came from PUBLIC.
SELECT
  '02_direct_table_grants' AS report,
  n.nspname || '.' || c.relname AS relation_name,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END AS grantee,
  a.privilege_type,
  a.is_grantable
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))
) a
LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = a.grantee
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v')
  AND c.relname IN (
    'tenants', 'tenant_members', 'user_roles', 'subscriptions',
    'plans', 'activity_types', 'profiles', 'notifications',
    'orders', 'order_items', 'order_status_history',
    'bookings', 'booking_status_history', 'catalog_items',
    'branches', 'staff', 'reviews', 'tenant_documents',
    'store_requests', 'storefront_tenants', 'storefront_catalog_items',
    'storefront_branches', 'storefront_staff', 'storefront_reviews'
  )
  AND (a.grantee = 0 OR grantee_role.rolname IN ('anon', 'authenticated'))
ORDER BY relation_name, grantee, a.privilege_type;

-- 03: Confirm that API roles themselves are not bypassing RLS.
SELECT
  '03_api_role_security' AS report,
  rolname,
  rolsuper,
  rolbypassrls,
  rolinherit,
  rolcanlogin
FROM pg_catalog.pg_roles
WHERE rolname IN ('anon', 'authenticated')
ORDER BY rolname;
