-- Gate 6 — transactional availability smoke test.
--
-- This creates a complete booking fixture inside a PL/pgSQL subtransaction,
-- verifies that an open slot is returned, inserts a conflicting booking with an
-- explicit negative serial (so no sequence is consumed), verifies that the slot
-- disappears, then intentionally rolls the entire fixture back.

DO $gate6$
DECLARE
  v_category text;
  v_plan uuid;
  v_tenant uuid;
  v_item uuid;
  v_branch uuid;
  v_staff uuid;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_before_count integer;
  v_after_count integer;
  v_subscription_count integer;
  v_slug text := 'gate-6-smoke-' || replace(gen_random_uuid()::text, '-', '');
  v_test_date date := (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date + 1;
BEGIN
  SELECT at.code
    INTO v_category
  FROM public.activity_types at
  WHERE at.has_bookings = true
    AND at.is_active = true
  ORDER BY at.sort_order, at.code
  LIMIT 1;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Gate 6 smoke needs one active booking-capable activity type';
  END IF;

  SELECT p.id
    INTO v_plan
  FROM public.plans p
  WHERE p.is_active = true
  ORDER BY p.sort_order, p.created_at
  LIMIT 1;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Gate 6 smoke needs one active plan';
  END IF;

  BEGIN
    INSERT INTO public.tenants (
      slug,
      name,
      category,
      plan_id,
      status,
      verified_at
    )
    VALUES (
      v_slug,
      'Gate 6 Smoke Test',
      v_category,
      v_plan,
      'active',
      clock_timestamp()
    )
    RETURNING id INTO v_tenant;

    -- Gate 4 normally bootstraps a pending subscription through the tenant
    -- trigger. Create one only if the trigger is not present in this environment.
    SELECT count(*)
      INTO v_subscription_count
    FROM public.subscriptions s
    WHERE s.tenant_id = v_tenant;

    IF v_subscription_count = 0 THEN
      INSERT INTO public.subscriptions (
        tenant_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        payment_verified_at,
        payment_method
      )
      VALUES (
        v_tenant,
        v_plan,
        'active',
        clock_timestamp(),
        clock_timestamp() + interval '30 days',
        clock_timestamp(),
        'gate_6_smoke'
      );
    ELSE
      UPDATE public.subscriptions
      SET status = 'active',
          current_period_start = clock_timestamp(),
          current_period_end = clock_timestamp() + interval '30 days',
          payment_verified_at = clock_timestamp(),
          payment_method = 'gate_6_smoke'
      WHERE tenant_id = v_tenant;
    END IF;

    INSERT INTO public.branches (tenant_id, name, is_active)
    VALUES (v_tenant, 'Smoke Branch', true)
    RETURNING id INTO v_branch;

    INSERT INTO public.staff (
      tenant_id,
      branch_id,
      name,
      role,
      is_active
    )
    VALUES (
      v_tenant,
      v_branch,
      'Smoke Provider',
      'QA',
      true
    )
    RETURNING id INTO v_staff;

    INSERT INTO public.catalog_items (
      tenant_id,
      kind,
      name,
      price,
      duration_minutes,
      is_active
    )
    VALUES (
      v_tenant,
      'service',
      'Smoke Service',
      100,
      30,
      true
    )
    RETURNING id INTO v_item;

    SELECT count(*)
      INTO v_before_count
    FROM public.get_booking_availability(
      v_tenant,
      v_item,
      v_test_date,
      v_branch,
      v_staff
    );

    IF v_before_count <= 0 THEN
      RAISE EXCEPTION 'Gate 6 smoke failed: no initial slots were returned';
    END IF;

    SELECT a.slot_start, a.slot_end
      INTO v_slot_start, v_slot_end
    FROM public.get_booking_availability(
      v_tenant,
      v_item,
      v_test_date,
      v_branch,
      v_staff
    ) a
    ORDER BY a.slot_start
    LIMIT 1;

    INSERT INTO public.bookings (
      tenant_id,
      item_id,
      branch_id,
      staff_id,
      customer_name,
      customer_phone,
      slot_start,
      slot_end,
      status,
      serial_no
    )
    VALUES (
      v_tenant,
      v_item,
      v_branch,
      v_staff,
      'Gate 6 Smoke Customer',
      '00000000000',
      v_slot_start,
      v_slot_end,
      'pending',
      -1
    );

    SELECT count(*)
      INTO v_after_count
    FROM public.get_booking_availability(
      v_tenant,
      v_item,
      v_test_date,
      v_branch,
      v_staff
    ) a
    WHERE a.slot_start = v_slot_start;

    IF v_after_count <> 0 THEN
      RAISE EXCEPTION 'Gate 6 smoke failed: conflicting slot remained available';
    END IF;

    -- Entering the exception handler rolls back every fixture row above.
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'GATE6_ROLLBACK';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'GATE6_ROLLBACK' THEN
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'availability_returns_slots: PASS (% slots)', v_before_count;
  RAISE NOTICE 'conflicting_slot_is_removed: PASS';
  RAISE NOTICE 'temporary_fixture_rolled_back: PASS';
END;
$gate6$;
