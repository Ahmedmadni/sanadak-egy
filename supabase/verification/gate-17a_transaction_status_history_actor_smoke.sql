-- Gate 17A functional smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate17a_smoke_results (
  check_name text PRIMARY KEY,
  result text NOT NULL
) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'gate17a-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_customer uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_plan uuid;
  v_tenant uuid;
  v_order uuid;
  v_booking uuid;
  v_count bigint;
BEGIN
  INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_customer, 'authenticated', 'authenticated', v_marker || '-customer@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_manager, 'authenticated', 'authenticated', v_marker || '-manager@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.profiles (id, full_name)
  VALUES (v_manager, 'Gate 17A manager')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.plans (code,name_ar,name_en,price_monthly,currency,is_active)
  VALUES (v_marker, 'اختبار Gate 17A', 'Gate 17A smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug,name,category,owner_id,plan_id,status)
  VALUES (v_marker, 'Gate 17A Smoke', 'shops', v_manager, v_plan, 'active')
  RETURNING id INTO v_tenant;

  INSERT INTO public.orders (tenant_id,customer_id,customer_name,customer_phone,status)
  VALUES (v_tenant,v_customer,'Gate 17A customer','01000000000','pending')
  RETURNING id INTO v_order;

  INSERT INTO public.bookings (tenant_id,customer_id,customer_name,customer_phone,slot_start,status)
  VALUES (v_tenant,v_customer,'Gate 17A customer','01000000000',clock_timestamp() + interval '2 days','pending')
  RETURNING id INTO v_booking;

  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  PERFORM 1 FROM public.set_order_status(v_order, 'confirmed');
  PERFORM 1 FROM public.set_booking_status(v_booking, 'confirmed', NULL);

  SELECT count(*) INTO v_count
  FROM public.order_status_history
  WHERE order_id = v_order
    AND changed_by = v_manager
    AND changed_by_name = 'Gate 17A manager';
  INSERT INTO gate17a_smoke_results VALUES (
    'order_history_records_actor_name_snapshot',
    CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT count(*) INTO v_count
  FROM public.booking_status_history
  WHERE booking_id = v_booking
    AND changed_by = v_manager
    AND changed_by_name = 'Gate 17A manager';
  INSERT INTO gate17a_smoke_results VALUES (
    'booking_history_records_actor_name_snapshot',
    CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL' END
  );
END;
$test$;

SELECT check_name, result FROM gate17a_smoke_results ORDER BY check_name;

ROLLBACK;
