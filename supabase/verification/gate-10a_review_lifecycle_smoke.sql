-- Gate 10A review lifecycle smoke test. All fixtures are rolled back.

BEGIN;

CREATE TEMPORARY TABLE gate10_smoke_results (
  check_name text PRIMARY KEY,
  result text NOT NULL
) ON COMMIT DROP;

DO $test$
DECLARE
  v_marker text := 'gate10-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_customer uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_plan uuid;
  v_tenant uuid;
  v_review uuid;
  v_count bigint;
  v_rating integer;
  v_body text;
  v_approved boolean;
  v_verified timestamptz;
  v_updated boolean;
  v_rejected boolean;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_customer, 'authenticated', 'authenticated', v_marker || '-customer@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_manager, 'authenticated', 'authenticated', v_marker || '-manager@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_outsider, 'authenticated', 'authenticated', v_marker || '-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.plans (code, name_ar, name_en, price_monthly, currency, is_active)
  VALUES (v_marker, 'اختبار Gate 10', 'Gate 10 smoke', 0, 'EGP', true)
  RETURNING id INTO v_plan;

  INSERT INTO public.tenants (slug, name, category, owner_id, plan_id, status)
  VALUES (v_marker, 'Gate 10 Smoke', 'restaurants', v_manager, v_plan, 'active')
  RETURNING id INTO v_tenant;

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = clock_timestamp(),
      current_period_end = clock_timestamp() + interval '1 day'
  WHERE tenant_id = v_tenant;

  INSERT INTO public.orders (tenant_id, customer_id, status)
  VALUES (v_tenant, v_customer, 'delivered');

  PERFORM set_config('request.jwt.claim.sub', v_customer::text, true);
  SELECT result.review_id, result.is_approved, result.updated_existing
  INTO v_review, v_approved, v_updated
  FROM public.submit_review(v_tenant, 5, 'Verified review') result;

  SELECT r.rating, r.body, r.is_approved, r.verified_at
  INTO v_rating, v_body, v_approved, v_verified
  FROM public.reviews r
  WHERE r.id = v_review;
  INSERT INTO gate10_smoke_results VALUES (
    'completed_customer_creates_pending_review',
    CASE WHEN v_rating = 5
      AND v_body = 'Verified review'
      AND v_approved = false
      AND v_verified IS NOT NULL
      AND v_updated = false
    THEN 'PASS' ELSE 'FAIL' END
  );

  SELECT result.updated_existing
  INTO v_updated
  FROM public.submit_review(v_tenant, 4, 'Revised review') result;
  SELECT count(*), max(r.rating), max(r.body)
  INTO v_count, v_rating, v_body
  FROM public.reviews r
  WHERE r.tenant_id = v_tenant AND r.customer_id = v_customer;
  INSERT INTO gate10_smoke_results VALUES (
    'resubmission_updates_single_review',
    CASE WHEN v_count = 1 AND v_rating = 4 AND v_body = 'Revised review' AND v_updated
      THEN 'PASS' ELSE 'FAIL' END
  );

  v_rejected := false;
  BEGIN
    PERFORM 1 FROM public.submit_review(v_tenant, 6, NULL);
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%rating must be between 1 and 5%';
  END;
  INSERT INTO gate10_smoke_results VALUES (
    'invalid_rating_rejected',
    CASE WHEN v_rejected THEN 'PASS' ELSE 'FAIL' END
  );

  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  v_rejected := false;
  BEGIN
    PERFORM 1 FROM public.submit_review(v_tenant, 5, 'Not eligible');
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%completed order or booking is required%';
  END;
  INSERT INTO gate10_smoke_results VALUES (
    'unverified_customer_rejected',
    CASE WHEN v_rejected THEN 'PASS' ELSE 'FAIL' END
  );

  PERFORM set_config('request.jwt.claim.sub', v_manager::text, true);
  PERFORM 1 FROM public.moderate_review(v_review, true);
  SELECT r.rating, r.body, r.is_approved
  INTO v_rating, v_body, v_approved
  FROM public.reviews r
  WHERE r.id = v_review;
  INSERT INTO gate10_smoke_results VALUES (
    'manager_moderates_publication_only',
    CASE WHEN v_rating = 4 AND v_body = 'Revised review' AND v_approved
      THEN 'PASS' ELSE 'FAIL' END
  );

  PERFORM set_config('request.jwt.claim.sub', v_customer::text, true);
  PERFORM public.delete_own_review(v_review);
  SELECT count(*) INTO v_count FROM public.reviews r WHERE r.id = v_review;
  INSERT INTO gate10_smoke_results VALUES (
    'customer_deletes_own_review',
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END
  );
END;
$test$;

SELECT check_name, result
FROM gate10_smoke_results
ORDER BY check_name;

ROLLBACK;
