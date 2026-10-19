-- SANADAK STAGING S1 — read-only resume preflight, no application row data.
-- Run ONLY using Lovable project a5ba6f1c-a324-4761-a604-2936a1f8f5cf.
-- Report BLOCKED and stop if any expected value mismatches.
-- This does not certify RLS authorization or register migrations.
SELECT
  'staging_s1_resume' AS report,
  current_database() AS database_name,
  current_user AS query_role,
  inet_server_addr()::text AS server_addr,
  inet_server_addr()::text = '2a05:d018:10e0:3301:ec65:1759:a8e9:e6e5/128' AS expected_server,
  to_regclass('supabase_migrations.schema_migrations') IS NULL AS migration_registry_still_absent,
  to_regclass('public.tenants') IS NOT NULL AS has_tenants,
  to_regclass('public.orders') IS NOT NULL AS has_orders,
  to_regclass('public.bookings') IS NOT NULL AS has_bookings,
  to_regclass('public.activity_types') IS NOT NULL AS has_activity_types,
  to_regclass('public.tenant_documents') IS NOT NULL AS has_tenant_documents,
  to_regprocedure('public.tenant_is_visible(uuid)') IS NOT NULL AS has_visibility_rpc,
  to_regprocedure('private.is_tenant_member(uuid,uuid,text)') IS NOT NULL AS has_private_member_rpc,
  NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'user_roles'
      AND p.policyname = 'First admin bootstrap'
  ) AS unsafe_admin_self_claim_absent,
  EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
      AND t.tgenabled <> 'D'
  ) AS profile_creation_trigger_present,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'tenant_documents'
  ) AS tenant_documents_policies_present,
  (SELECT count(*) FROM public.plans) AS plan_template_count;

-- Capture names of installed tables and server-side policies without
-- exposing any tenant/customer/user rows.
SELECT
  'staging_s1_object_inventory' AS report,
  n.nspname || '.' || c.relname AS relation_name,
  c.relkind,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
ORDER BY relation_name;

SELECT
  'staging_s1_policy_inventory' AS report,
  schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('tenants','user_roles','tenant_documents','orders','bookings')
ORDER BY tablename, policyname;
