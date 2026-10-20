-- S1 STAGING READ-ONLY: order RPC installed, but direct inserts remain open.
-- Run only via Lovable project a5ba6f1c-a324-4761-a604-2936a1f8f5cf.
-- Do NOT use these SELECT results to mark browser E2E completed.
SELECT
 'staging_order_rpc_readiness' AS check_name,
 inet_server_addr()::text AS db_server,
 current_database() AS db_name,
 to_regprocedure('public.create_order(uuid,jsonb,text,text,text,text,text)') IS NOT NULL
   AS atomic_order_rpc_present,
 has_function_privilege('anon', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
   AS anon_can_execute_rpc,
 has_function_privilege('authenticated', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
   AS authenticated_can_execute_rpc,
 has_table_privilege('anon','public.orders','INSERT') AS anon_can_direct_insert_orders,
 has_table_privilege('authenticated','public.orders','INSERT') AS authenticated_can_direct_insert_orders,
 has_table_privilege('anon','public.order_items','INSERT') AS anon_can_direct_insert_items,
 has_table_privilege('authenticated','public.order_items','INSERT') AS authenticated_can_direct_insert_items,
 to_regprocedure('public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)') IS NOT NULL
   AS atomic_booking_rpc_present,
 (SELECT count(*) FROM auth.users) AS registered_users,
 EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
   AND tablename = 'user_roles' AND policyname = 'First admin bootstrap') AS unsafe_admin_bootstrap_exists,
 to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
   AS migration_registry_present;

-- Schema and function evidence only. No application rows or identities.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
 p.prosecdef AS security_definer, p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
 AND p.proname IN ('create_order','create_booking')
ORDER BY p.proname;
