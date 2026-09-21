-- Gate 8A inventory reservation smoke test.
-- Runs inside a transaction and rolls back all fixtures and order changes.
-- Creates its own active tenant/subscription fixtures, so it does not depend on
-- production tenant lifecycle state.

begin;

create temporary table gate8_smoke_results (
  check_name text primary key,
  result text not null
) on commit drop;

do $$
declare
  v_plan uuid;
  v_tenant uuid;
  v_item uuid;
  v_order uuid;
  v_stock int;
  v_released_at timestamptz;
  v_failed boolean := false;
begin
  insert into public.plans (
    code,
    name_ar,
    name_en,
    price_monthly,
    currency,
    is_active
  ) values (
    'gate8-smoke-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'اختبار Gate 8',
    'Gate 8 smoke',
    0,
    'EGP',
    true
  )
  returning id into v_plan;

  insert into public.tenants (
    slug,
    name,
    category,
    plan_id,
    status,
    verified_at
  ) values (
    'gate8-smoke-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'Gate 8 rollback smoke tenant',
    'shops',
    v_plan,
    'active',
    clock_timestamp()
  )
  returning id into v_tenant;

  update public.subscriptions
  set status = 'active',
      current_period_start = clock_timestamp(),
      current_period_end = clock_timestamp() + interval '1 day',
      cancel_at = null
  where tenant_id = v_tenant;

  if not public.tenant_is_visible(v_tenant) then
    raise exception 'Gate 8 smoke fixture tenant is not visible';
  end if;

  insert into public.catalog_items (
    tenant_id,
    kind,
    name,
    price,
    currency,
    variants,
    stock,
    is_active
  ) values (
    v_tenant,
    'product',
    'Gate 8 rollback smoke item',
    10,
    'EGP',
    '[{"label":"A"},{"label":"B"}]'::jsonb,
    3,
    true
  )
  returning id into v_item;

  select created.order_id
  into v_order
  from public.create_order(
    v_tenant,
    jsonb_build_array(
      jsonb_build_object('item_id', v_item, 'qty', 1, 'variants', jsonb_build_object('selection', 'A')),
      jsonb_build_object('item_id', v_item, 'qty', 2, 'variants', jsonb_build_object('selection', 'B'))
    ),
    'Gate 8 smoke',
    '01000000000',
    null,
    'pickup',
    'rollback-only inventory smoke test'
  ) created;

  select stock into v_stock from public.catalog_items where id = v_item;
  insert into gate8_smoke_results values (
    'aggregate_quantity_reserved',
    case when v_stock = 0 then 'PASS' else 'FAIL' end
  );

  begin
    perform 1
    from public.create_order(
      v_tenant,
      jsonb_build_array(jsonb_build_object('item_id', v_item, 'qty', 1, 'variants', '{}'::jsonb)),
      'Gate 8 smoke',
      '01000000000',
      null,
      'pickup',
      null
    );
  exception
    when others then
      v_failed := sqlerrm like '%insufficient stock%';
  end;

  insert into gate8_smoke_results values (
    'oversell_rejected',
    case when v_failed then 'PASS' else 'FAIL' end
  );

  update public.orders
  set status = 'cancelled'
  where id = v_order
  returning inventory_released_at into v_released_at;

  select stock into v_stock from public.catalog_items where id = v_item;
  insert into gate8_smoke_results values (
    'cancel_restores_inventory_once',
    case when v_stock = 3 and v_released_at is not null then 'PASS' else 'FAIL' end
  );

  update public.orders
  set status = 'cancelled'
  where id = v_order;

  select stock into v_stock from public.catalog_items where id = v_item;
  insert into gate8_smoke_results values (
    'idempotent_cancel_does_not_double_restore',
    case when v_stock = 3 then 'PASS' else 'FAIL' end
  );

  v_failed := false;
  begin
    update public.orders set status = 'confirmed' where id = v_order;
  exception
    when others then
      v_failed := sqlerrm like '%invalid order status transition%';
  end;

  insert into gate8_smoke_results values (
    'cancelled_order_cannot_reopen',
    case when v_failed then 'PASS' else 'FAIL' end
  );
end;
$$;

select check_name, result
from gate8_smoke_results
order by check_name;

rollback;
