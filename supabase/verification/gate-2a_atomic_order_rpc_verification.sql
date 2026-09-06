-- SANAD Gate 2A — atomic order RPC verification
-- READ ONLY. Does not create orders.

select
  'create_order_function' as check_name,
  case when to_regprocedure('public.create_order(uuid,jsonb,text,text,text,text,text)') is null
       then 'FAIL' else 'PASS' end as result;

select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'create_order'
order by grantee;

select
  'legacy_orders_direct_insert_still_available' as check_name,
  case when has_table_privilege('anon', 'public.orders', 'INSERT')
          and has_table_privilege('authenticated', 'public.orders', 'INSERT')
       then 'PASS_STAGE_2A' else 'CHECK' end as result
union all
select
  'legacy_order_items_direct_insert_still_available',
  case when has_table_privilege('anon', 'public.order_items', 'INSERT')
          and has_table_privilege('authenticated', 'public.order_items', 'INSERT')
       then 'PASS_STAGE_2A' else 'CHECK' end;

select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_order';
