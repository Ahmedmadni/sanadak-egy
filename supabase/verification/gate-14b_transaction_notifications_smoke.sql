-- Gate 14B notification smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate14b_smoke_results (check_name text PRIMARY KEY, result text NOT NULL) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'gate14b-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
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

  INSERT INTO public.plans (code,name_ar,name_en,price_monthly,currency,is_active)
  VALUES (v_marker, 'اختبار Gate 14B', 'Gate 14B smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug,name,category,owner_id,plan_id,status)
  VALUES (v_marker, 'Gate 14B Smoke', 'shops', v_manager, v_plan, 'active')
  RETURNING id INTO v_tenant;

  INSERT INTO public.orders (tenant_id,customer_id,customer_name,customer_phone,status)
  VALUES (v_tenant,v_customer,'Gate 14B customer','01000000000','pending')
  RETURNING id INTO v_order;

  INSERT INTO public.bookings (tenant_id,customer_id,customer_name,customer_phone,slot_start,status)
  VALUES (v_tenant,v_customer,'Gate 14B customer','01000000000',clock_timestamp() + interval '2 days','pending')
  RETURNING id INTO v_booking;

  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  PERFORM 1 FROM public.set_order_status(v_order, 'confirmed');
  PERFORM 1 FROM public.set_booking_status(v_booking, 'confirmed', NULL);

  SELECT count(*) INTO v_count FROM public.notifications n
  WHERE n.user_id = v_customer AND n.tenant_id = v_tenant AND n.kind = 'order_status' AND n.link = '/orders';
  INSERT INTO gate14b_smoke_results VALUES ('order_status_creates_customer_notification', CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL' END);

  SELECT count(*) INTO v_count FROM public.notifications n
  WHERE n.user_id = v_customer AND n.tenant_id = v_tenant AND n.kind = 'booking_status' AND n.link = '/bookings';
  INSERT INTO gate14b_smoke_results VALUES ('booking_status_creates_customer_notification', CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL' END);
END;
$test$;

SELECT check_name, result FROM gate14b_smoke_results ORDER BY check_name;

ROLLBACK;
