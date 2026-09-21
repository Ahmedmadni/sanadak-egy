-- Gate 9A search smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate9_smoke_results (
  check_name text PRIMARY KEY,
  result text NOT NULL
) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'Gate9Smoke' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_plan uuid;
  v_alpha uuid;
  v_beta uuid;
  v_hidden uuid;
  v_count bigint;
  v_total bigint;
  v_result_id uuid;
  v_invalid_sort_rejected boolean := false;
BEGIN
  INSERT INTO public.plans (code, name_ar, name_en, price_monthly, currency, is_active)
  VALUES (lower(v_marker), 'اختبار Gate 9', 'Gate 9 smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug, name, category, area, plan_id, status, verified_at)
  VALUES (lower(v_marker) || '-a', v_marker || ' Alpha', 'shops', 'Cairo', v_plan, 'active', clock_timestamp())
  RETURNING id INTO v_alpha;

  INSERT INTO public.tenants (slug, name, category, area, plan_id, status)
  VALUES (lower(v_marker) || '-b', v_marker || ' Beta', 'cafes', 'Giza', v_plan, 'active')
  RETURNING id INTO v_beta;

  INSERT INTO public.tenants (slug, name, category, area, plan_id, status)
  VALUES (lower(v_marker) || '-hidden', v_marker || ' Hidden', 'shops', 'Cairo', v_plan, 'hidden')
  RETURNING id INTO v_hidden;

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = clock_timestamp(),
      current_period_end = clock_timestamp() + interval '1 day'
  WHERE tenant_id IN (v_alpha, v_beta, v_hidden);

  SELECT count(*), COALESCE(max(total_count), 0)
  INTO v_count, v_total
  FROM public.search_tenants(_query => v_marker);
  INSERT INTO gate9_smoke_results VALUES (
    'hidden_tenant_excluded',
    CASE WHEN v_count = 2 AND v_total = 2 THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*), max(id)
  INTO v_count, v_result_id
  FROM public.search_tenants(_query => v_marker, _category => 'shops', _area => 'cai');
  INSERT INTO gate9_smoke_results VALUES (
    'category_and_area_filters',
    CASE WHEN v_count = 1 AND v_result_id = v_alpha THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*), max(id)
  INTO v_count, v_result_id
  FROM public.search_tenants(_query => v_marker, _verified_only => true);
  INSERT INTO gate9_smoke_results VALUES (
    'verified_filter',
    CASE WHEN v_count = 1 AND v_result_id = v_alpha THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*), COALESCE(max(total_count), 0), max(id)
  INTO v_count, v_total, v_result_id
  FROM public.search_tenants(_query => v_marker, _sort => 'name', _limit => 1, _offset => 1);
  INSERT INTO gate9_smoke_results VALUES (
    'pagination_and_total',
    CASE WHEN v_count = 1 AND v_total = 2 AND v_result_id = v_beta THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*) INTO v_count
  FROM public.search_tenants(_query => v_marker || '%');
  INSERT INTO gate9_smoke_results VALUES (
    'percent_is_literal',
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END
  );

  BEGIN
    PERFORM 1 FROM public.search_tenants(_sort => 'invalid');
  EXCEPTION WHEN OTHERS THEN
    v_invalid_sort_rejected := SQLERRM LIKE '%invalid search sort%';
  END;
  INSERT INTO gate9_smoke_results VALUES (
    'invalid_sort_rejected',
    CASE WHEN v_invalid_sort_rejected THEN 'PASS' ELSE 'FAIL' END
  );
END;
$test$;

SELECT check_name, result
FROM gate9_smoke_results
ORDER BY check_name;

ROLLBACK;
