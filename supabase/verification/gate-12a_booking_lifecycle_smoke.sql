-- Gate 12A booking lifecycle smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate12_smoke_results (
  check_name text PRIMARY KEY,
  result text NOT NULL
) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'gate12-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_customer uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_plan uuid;
  v_tenant uuid;
  v_item uuid;
  v_customer_booking uuid;
  v_staff_booking uuid;
  v_status text;
  v_cancelled_at timestamptz;
  v_cancelled_by uuid;
  v_rejected boolean;
  v_category text;
BEGIN
  SELECT at.code INTO v_category
  FROM public.activity_types at
  WHERE at.is_active AND at.has_bookings
  ORDER BY at.sort_order, at.code
  LIMIT 1;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Gate 12A smoke needs one active booking-capable activity type';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_customer, 'authenticated', 'authenticated', v_marker || '-customer@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_manager, 'authenticated', 'authenticated', v_marker || '-manager@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_outsider, 'authenticated', 'authenticated', v_marker || '-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.plans (code, name_ar, name_en, price_monthly, currency, is_active)
  VALUES (v_marker, 'اختبار Gate 12', 'Gate 12 smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug, name, category, owner_id, plan_id, status)
  VALUES (v_marker, 'Gate 12 Smoke', v_category, v_manager, v_plan, 'active')
  RETURNING id INTO v_tenant;

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = clock_timestamp(),
      current_period_end = clock_timestamp() + interval '1 day'
  WHERE tenant_id = v_tenant;

  INSERT INTO public.catalog_items (tenant_id, kind, name, price, duration_minutes, is_active)
  VALUES (v_tenant, 'service', 'Gate 12 smoke service', 0, 30, true)
  RETURNING id INTO v_item;

  INSERT INTO public.bookings (
    tenant_id, customer_id, item_id, customer_name, customer_phone,
    slot_start, slot_end, status
  ) VALUES (
    v_tenant, v_customer, v_item, 'Gate 12 customer', '01000000000',
    clock_timestamp() + interval '2 days', clock_timestamp() + interval '2 days 30 minutes', 'pending'
  ) RETURNING id INTO v_customer_booking;

  PERFORM set_config('request.jwt.claim.sub', v_customer::text, true);
  SELECT result.status, result.cancelled_at
  INTO v_status, v_cancelled_at
  FROM public.set_booking_status(v_customer_booking, 'cancelled', 'Changed plans') result;
  SELECT b.cancelled_by INTO v_cancelled_by
  FROM public.bookings b WHERE b.id = v_customer_booking;
  INSERT INTO gate12_smoke_results VALUES (
    'customer_cancels_own_future_booking',
    CASE WHEN v_status = 'cancelled' AND v_cancelled_at IS NOT NULL AND v_cancelled_by = v_customer
      THEN 'PASS' ELSE 'FAIL' END
  );

  INSERT INTO public.bookings (
    tenant_id, customer_id, item_id, customer_name, customer_phone,
    slot_start, slot_end, status
  ) VALUES (
    v_tenant, v_customer, v_item, 'Gate 12 customer', '01000000000',
    clock_timestamp() + interval '3 days', clock_timestamp() + interval '3 days 30 minutes', 'pending'
  ) RETURNING id INTO v_staff_booking;

  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  PERFORM 1 FROM public.set_booking_status(v_staff_booking, 'confirmed', NULL);
  SELECT result.status INTO v_status
  FROM public.set_booking_status(v_staff_booking, 'completed', NULL) result;
  INSERT INTO gate12_smoke_results VALUES (
    'staff_follows_confirmed_to_completed_path',
    CASE WHEN v_status = 'completed' THEN 'PASS' ELSE 'FAIL' END
  );

  v_rejected := false;
  BEGIN
    PERFORM 1 FROM public.set_booking_status(v_staff_booking, 'confirmed', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%invalid booking status transition%';
  END;
  INSERT INTO gate12_smoke_results VALUES (
    'terminal_booking_cannot_reopen',
    CASE WHEN v_rejected THEN 'PASS' ELSE 'FAIL' END
  );

  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  v_rejected := false;
  BEGIN
    PERFORM 1 FROM public.set_booking_status(v_customer_booking, 'cancelled', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%booking status access denied%';
  END;
  INSERT INTO gate12_smoke_results VALUES (
    'outsider_cannot_change_booking',
    CASE WHEN v_rejected THEN 'PASS' ELSE 'FAIL' END
  );
END;
$test$;

SELECT check_name, result
FROM gate12_smoke_results
ORDER BY check_name;

ROLLBACK;
