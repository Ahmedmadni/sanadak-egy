-- SANADAK Gate 31: READ-ONLY Gate 19 rollout preflight.
-- Run ONLY in the correct authorized Sanadak Supabase project.
-- This script reads schema metadata, grants and storage-bucket settings.
-- No secrets, authentication tokens, customer identities or order details.
-- DO NOT substitute a SQL write/migration tool. Return ALL result sets.
--
-- 1. Verify environment identity and visibility.
SELECT
  '01_environment' AS report,
  current_database() AS database_name,
  current_user AS querying_role,
  current_setting('server_version') AS postgres_version,
  now() AT TIME ZONE 'UTC' AS checked_at_utc,
  to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migrations_registry_exists;

-- 2. Object inventory and RLS/grant posture.
-- Some objects are intentionally missing BEFORE Gate 19.
WITH expected(schema_name, object_name, phase) AS (
  VALUES
    ('public', 'tenants', 'baseline'),
    ('public', 'tenant_members', 'baseline'),
    ('public', 'user_roles', 'baseline'),
    ('public', 'subscriptions', 'baseline'),
    ('public', 'plans', 'baseline'),
    ('public', 'activity_types', 'baseline'),
    ('public', 'profiles', 'baseline'),
    ('public', 'notifications', 'baseline'),
    ('public', 'orders', 'baseline'),
    ('public', 'order_items', 'baseline'),
    ('public', 'order_status_history', 'baseline'),
    ('public', 'bookings', 'baseline'),
    ('public', 'booking_status_history', 'baseline'),
    ('public', 'catalog_items', 'baseline'),
    ('public', 'branches', 'baseline'),
    ('public', 'staff', 'baseline'),
    ('public', 'reviews', 'baseline'),
    ('public', 'tenant_documents', 'baseline'),
    ('public', 'store_requests', 'legacy-optional'),
    ('public', 'storefront_tenants', 'gate19d'),
    ('public', 'storefront_catalog_items', 'gate19d'),
    ('public', 'storefront_branches', 'gate19d'),
    ('public', 'storefront_staff', 'gate19d'),
    ('public', 'storefront_reviews', 'gate19d')
)
SELECT
  '02_relations' AS report,
  e.phase,
  e.schema_name || '.' || e.object_name AS relation_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    ELSE coalesce(c.relkind::text, 'MISSING')
  END AS relation_kind,
  CASE WHEN c.relkind IN ('r','p') THEN c.relrowsecurity ELSE NULL END AS rls_enabled,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('anon', c.oid, 'SELECT') END AS anon_select,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('authenticated', c.oid, 'SELECT') END AS authenticated_select,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('anon', c.oid, 'INSERT') END AS anon_insert,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('authenticated', c.oid, 'INSERT') END AS authenticated_insert,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('authenticated', c.oid, 'UPDATE') END AS authenticated_update,
  count(p.polname) AS rls_policy_count
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = e.schema_name
LEFT JOIN pg_class c ON c.relnamespace = n.oid
                    AND c.relname = e.object_name
                    AND c.relkind IN ('r','p','v','m')
LEFT JOIN pg_policy p ON p.polrelid = c.oid
GROUP BY e.phase, e.schema_name, e.object_name, c.oid, c.relkind, c.relrowsecurity
ORDER BY e.phase, relation_name;

-- 3. Column prerequisites referenced by Gate 19 migrations and current UI.
-- Missing column => review before deploying. No row data is accessed.
WITH required(relation_name, column_name, phase) AS (
  VALUES
    ('tenants', 'id', 'baseline'),
    ('tenants', 'owner_id', 'baseline'),
    ('tenants', 'slug', 'baseline'),
    ('tenants', 'status', 'baseline'),
    ('tenants', 'plan_id', 'baseline'),
    ('tenants', 'verified_at', 'baseline'),
    ('tenants', 'email', 'gate19a'),
    ('tenants', 'image_url', 'gate19a'),
    ('tenants', 'cover_url', 'gate19a'),
    ('subscriptions', 'payment_verified_at', 'gate19a'),
    ('subscriptions', 'payment_verified_by', 'gate19a'),
    ('subscriptions', 'current_period_end', 'baseline'),
    ('orders', 'inventory_reserved_at', 'gate19b'),
    ('orders', 'inventory_released_at', 'gate19b'),
    ('orders', 'customer_id', 'baseline'),
    ('orders', 'status', 'baseline'),
    ('catalog_items', 'variants', 'gate19b'),
    ('catalog_items', 'stock', 'gate19b'),
    ('catalog_items', 'is_active', 'baseline'),
    ('bookings', 'customer_id', 'baseline'),
    ('bookings', 'slot_start', 'baseline'),
    ('bookings', 'status', 'baseline'),
    ('tenant_documents', 'tenant_id', 'gate19c'),
    ('tenant_documents', 'file_path', 'gate19c'),
    ('tenant_documents', 'uploaded_by', 'gate19c'),
    ('tenant_documents', 'kind', 'gate19c'),
    ('branches', 'is_active', 'gate19d'),
    ('staff', 'is_active', 'gate19d'),
    ('reviews', 'is_approved', 'gate19d'),
    ('reviews', 'verified_at', 'gate19d')
)
SELECT
  '03_columns' AS report,
  req.phase,
  'public.' || req.relation_name || '.' || req.column_name AS required_column,
  CASE WHEN a.attnum IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status,
  CASE WHEN a.attnum IS NOT NULL THEN format_type(a.atttypid, a.atttypmod) END AS pg_type
FROM required req
LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || req.relation_name)
LEFT JOIN pg_attribute a ON a.attrelid = c.oid
                        AND a.attname = req.column_name
                        AND a.attnum > 0
                        AND NOT a.attisdropped
ORDER BY req.phase, required_column;

-- 4. RPC names, actual signatures, SECURITY DEFINER and search_path.
-- Resolve by namespace/name to avoid errors if a planned enum/type is absent.
-- Overloaded RPCs appear in separate rows for review.
WITH required(schema_name, function_name, phase) AS (
  VALUES
    ('public', 'tenant_is_visible', 'baseline'),
    ('public', 'create_order', 'baseline'),
    ('public', 'create_booking', 'baseline'),
    ('public', 'set_order_status', 'baseline'),
    ('public', 'set_booking_status', 'baseline'),
    ('public', 'search_tenants_v2', 'baseline'),
    ('public', 'update_tenant_profile', 'gate19a'),
    ('public', 'admin_verify_tenant_payment', 'gate19a'),
    ('public', 'reject_tenant_onboarding', 'gate19a'),
    ('public', 'request_tenant_onboarding', 'gate19c'),
    ('private', 'has_role', 'baseline'),
    ('private', 'is_tenant_member', 'baseline')
)
SELECT
  '04_functions' AS report,
  req.phase,
  req.schema_name || '.' || req.function_name AS function_name,
  CASE WHEN p.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status,
  CASE WHEN p.oid IS NOT NULL THEN pg_get_function_identity_arguments(p.oid) END AS arguments,
  p.prosecdef AS security_definer,
  coalesce(array_to_string(p.proconfig, ','), '') AS function_settings,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute
FROM required req
LEFT JOIN pg_namespace n ON n.nspname = req.schema_name
LEFT JOIN pg_proc p ON p.pronamespace = n.oid
                   AND p.proname = req.function_name
ORDER BY req.phase, function_name, arguments;

-- 5. Current policy names and roles; only security metadata, no user data.
SELECT
  '05_rls_policies' AS report,
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants', 'subscriptions', 'tenant_members', 'orders', 'order_items',
    'bookings', 'booking_status_history', 'order_status_history',
    'catalog_items', 'branches', 'staff', 'reviews',
    'tenant_documents', 'store_requests'
  )
ORDER BY tablename, policyname;

-- 6. Bucket existence, privacy and server-side upload constraints.
-- Bucket names and rules only: no object/file paths or user identities.
SELECT
  '06_storage_buckets' AS report,
  id AS bucket_name,
  public AS is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('tenant-documents', 'tenant-media')
ORDER BY id;
