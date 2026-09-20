-- Gate 8A inventory reservation verification.
-- READ ONLY.

select check_name, result
from (
  select
    'orders_inventory_reserved_at_exists' as check_name,
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orders'
        and column_name = 'inventory_reserved_at'
    ) then 'PASS' else 'FAIL' end as result

  union all

  select
    'orders_inventory_released_at_exists',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orders'
        and column_name = 'inventory_released_at'
    ) then 'PASS' else 'FAIL' end

  union all

  select
    'stock_nonnegative_constraint_valid',
    case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.catalog_items'::regclass
        and conname = 'catalog_items_stock_nonnegative'
        and convalidated
    ) then 'PASS' else 'FAIL' end

  union all

  select
    'negative_stock_absent',
    case when exists (
      select 1 from public.catalog_items where stock < 0
    ) then 'FAIL' else 'PASS' end

  union all

  select
    'authenticated_order_items_update_closed',
    case when has_table_privilege('authenticated', 'public.order_items', 'UPDATE')
      then 'FAIL' else 'PASS' end

  union all

  select
    'authenticated_order_items_delete_closed',
    case when has_table_privilege('authenticated', 'public.order_items', 'DELETE')
      then 'FAIL' else 'PASS' end

  union all

  select
    'authenticated_orders_delete_closed',
    case when has_table_privilege('authenticated', 'public.orders', 'DELETE')
      then 'FAIL' else 'PASS' end

  union all

  select
    'inventory_guard_trigger_enabled',
    case when exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.orders'::regclass
        and tgname = 'orders_inventory_status_guard'
        and tgenabled <> 'D'
    ) then 'PASS' else 'FAIL' end

  union all

  select
    'create_order_uses_update_lock',
    case when pg_get_functiondef(
      'public.create_order(uuid,jsonb,text,text,text,text,text)'::regprocedure
    ) like '%FOR UPDATE OF c%'
    then 'PASS' else 'FAIL' end

  union all

  select
    'create_order_decrements_stock',
    case when pg_get_functiondef(
      'public.create_order(uuid,jsonb,text,text,text,text,text)'::regprocedure
    ) like '%SET stock = c.stock - requested.requested_qty%'
    then 'PASS' else 'FAIL' end

  union all

  select
    'set_order_status_authenticated_execute',
    case when has_function_privilege(
      'authenticated',
      'public.set_order_status(uuid,text)',
      'EXECUTE'
    ) then 'PASS' else 'FAIL' end

  union all

  select
    'set_order_status_anon_execute_absent',
    case when has_function_privilege(
      'anon',
      'public.set_order_status(uuid,text)',
      'EXECUTE'
    ) then 'FAIL' else 'PASS' end

  union all

  select
    'set_order_status_public_execute_absent',
    case when has_function_privilege(
      'public',
      'public.set_order_status(uuid,text)',
      'EXECUTE'
    ) then 'FAIL' else 'PASS' end

  union all

  select
    'set_order_status_security_definer',
    case when p.prosecdef then 'PASS' else 'FAIL' end
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_order_status'

  union all

  select
    'set_order_status_empty_search_path',
    case when coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%'
      then 'PASS' else 'FAIL' end
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_order_status'

  union all

  select
    'authenticated_direct_order_update_closed',
    case when has_table_privilege('authenticated', 'public.orders', 'UPDATE')
      then 'FAIL' else 'PASS' end
) checks
order by check_name;
