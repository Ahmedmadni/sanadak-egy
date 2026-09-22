-- Gate 9B service-filter smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate9b_smoke_results (
  check_name text PRIMARY KEY,
  result text NOT NULL
) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'Gate9bSmoke' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_orders_category text;
  v_bookings_category text;
  v_plan uuid;
  v_orders uuid;
  v_bookings uuid;
  v_no_catalog uuid;
  v_hidden uuid;
  v_count bigint;
  v_total bigint;
  v_only_expected boolean;
  v_invalid_service_rejected boolean := false;
BEGIN
  v_orders_category := lower(v_marker) || '-orders';
  v_bookings_category := lower(v_marker) || '-bookings';

  INSERT INTO public.activity_types (
    code, label_ar, label_en, catalog_label_ar, catalog_label_en,
    has_orders, has_bookings
  ) VALUES
    (v_orders_category, 'طلبات تجريبية', 'Test orders', 'منتجات', 'Products', true, false),
    (v_bookings_category, 'حجوزات تجريبية', 'Test bookings', 'خدمات', 'Services', false, true);

  INSERT INTO public.plans (code, name_ar, name_en, price_monthly, currency, is_active)
  VALUES (lower(v_marker), 'اختبار Gate 9B', 'Gate 9B smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug, name, category, plan_id, status)
  VALUES (lower(v_marker) || '-orders', v_marker || ' Orders', v_orders_category, v_plan, 'active')
  RETURNING id INTO v_orders;

  INSERT INTO public.tenants (slug, name, category, plan_id, status)
  VALUES (lower(v_marker) || '-bookings', v_marker || ' Bookings', v_bookings_category, v_plan, 'active')
  RETURNING id INTO v_bookings;

  INSERT INTO public.tenants (slug, name, category, plan_id, status)
  VALUES (lower(v_marker) || '-empty', v_marker || ' Empty', v_orders_category, v_plan, 'active')
  RETURNING id INTO v_no_catalog;

  INSERT INTO public.tenants (slug, name, category, plan_id, status)
  VALUES (lower(v_marker) || '-hidden', v_marker || ' Hidden', v_orders_category, v_plan, 'hidden')
  RETURNING id INTO v_hidden;

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = clock_timestamp(),
      current_period_end = clock_timestamp() + interval '1 day'
  WHERE tenant_id IN (v_orders, v_bookings, v_no_catalog, v_hidden);

  INSERT INTO public.catalog_items (tenant_id, kind, name, duration_minutes, is_active)
  VALUES
    (v_orders, 'product', v_marker || ' Product', NULL, true),
    (v_bookings, 'service', v_marker || ' Service', 30, true),
    (v_hidden, 'product', v_marker || ' Hidden item', NULL, true);

  SELECT count(*), COALESCE(max(total_count), 0)
  INTO v_count, v_total
  FROM public.search_tenants_v2(_query => v_marker);
  INSERT INTO gate9b_smoke_results VALUES (
    'all_services_preserve_visible_results',
    CASE WHEN v_count = 3 AND v_total = 3 THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*), bool_and(id = v_orders)
  INTO v_count, v_only_expected
  FROM public.search_tenants_v2(_query => v_marker, _service => 'orders');
  INSERT INTO gate9b_smoke_results VALUES (
    'orders_require_capability_and_catalog',
    CASE WHEN v_count = 1 AND v_only_expected THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*), bool_and(id = v_bookings)
  INTO v_count, v_only_expected
  FROM public.search_tenants_v2(_query => v_marker, _service => 'bookings');
  INSERT INTO gate9b_smoke_results VALUES (
    'bookings_require_valid_service',
    CASE WHEN v_count = 1 AND v_only_expected THEN 'PASS' ELSE 'FAIL' END
  );

  UPDATE public.catalog_items SET is_active = false WHERE tenant_id = v_bookings;
  SELECT count(*) INTO v_count
  FROM public.search_tenants_v2(_query => v_marker, _service => 'bookings');
  INSERT INTO gate9b_smoke_results VALUES (
    'inactive_booking_service_excluded',
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*) INTO v_count FROM public.search_tenants(_query => v_marker);
  INSERT INTO gate9b_smoke_results VALUES (
    'original_search_still_works',
    CASE WHEN v_count = 3 THEN 'PASS' ELSE 'FAIL' END
  );

  BEGIN
    PERFORM 1 FROM public.search_tenants_v2(_service => 'invalid');
  EXCEPTION WHEN OTHERS THEN
    v_invalid_service_rejected := SQLERRM LIKE '%invalid search service%';
  END;
  INSERT INTO gate9b_smoke_results VALUES (
    'invalid_service_rejected',
    CASE WHEN v_invalid_service_rejected THEN 'PASS' ELSE 'FAIL' END
  );
END;
$test$;

SELECT check_name, result FROM gate9b_smoke_results ORDER BY check_name;

ROLLBACK;
