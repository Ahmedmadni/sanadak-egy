-- Gate 8A inventory reservation smoke test.
-- Runs inside a transaction and rolls back all fixtures and order changes.
-- Requires at least one currently visible tenant.

begin;

create temporary table gate8_smoke_results (
  check_name text primary key,
  result text not null
) on commit drop;

do $$
declare
  v_tenant uuid;
  v_item uuid;
  v_order uuid;
  v_stock int;
  v_released_at timestamptz;
  v_failed boolean := false;
begin
  select t.id
  into v_tenant
  from public.tenants t
  where public.tenant_is_visible(t.id)
  order by t.created_at
  limit 1;

  if v_tenant is null then
    raise exception 'Gate 8 smoke test requires one visible tenant';
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
