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
  'anon_create_order_execute',
  case when has_function_privilege('anon', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'authenticated_create_order_execute',
  case when has_function_privilege('authenticated', 'public.create_order(uuid,jsonb,text,text,text,text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
order by check_name;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'order_items')
order by tablename, policyname;
