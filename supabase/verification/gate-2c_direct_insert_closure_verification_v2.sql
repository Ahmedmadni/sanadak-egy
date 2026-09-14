-- SANAD Gate 2C — direct order INSERT closure verification
-- READ ONLY.

select
  'anon_orders_insert_closed' as check_name,
  case when has_table_privilege('anon', 'public.orders', 'INSERT') then 'FAIL' else 'PASS' end as result
union all
select
  'authenticated_orders_insert_closed',
  case when has_table_privilege('authenticated', 'public.orders', 'INSERT') then 'FAIL' else 'PASS' end
union all
select
  'anon_order_items_insert_closed',
  case when has_table_privilege('anon', 'public.order_items', 'INSERT') then 'FAIL' else 'PASS' end
union all
select
  'authenticated_order_items_insert_closed',
  case when has_table_privilege('authenticated', 'public.order_items', 'INSERT') then 'FAIL' else 'PASS' end
union all
select
  'legacy_orders_insert_policy_absent',
  case when exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='orders'
      and policyname='Anyone can create order' and cmd='INSERT'
  ) then 'FAIL' else 'PASS' end
union all
select
  'legacy_order_items_insert_policy_absent',
  case when exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='order_items'
      and policyname='Anyone insert order items' and cmd='INSERT'
  ) then 'FAIL' else 'PASS' end
union all
select
  'anon_create_order_execute',
  case when has_function_privilege('anon', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'authenticated_create_order_execute',
  case when has_function_privilege('authenticated', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'public_create_order_execute_absent',
  case when has_function_privilege('public', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE') then 'FAIL' else 'PASS' end
union all
select
  'create_order_security_definer',
  case when p.prosecdef then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='create_order'
union all
select
  'create_order_empty_search_path',
  case when coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%' then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='create_order'
order by check_name;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'order_items')
order by tablename, policyname;
