-- Gate 4A/B: reconcile tenant + subscription lifecycle before strict visibility enforcement.
--
-- Contract:
-- 1) A newly requested tenant gets a PENDING subscription. The paid period does
--    not start until an admin verifies payment and approves onboarding.
-- 2) Approval is atomic and starts a fresh 30-day period.
-- 3) Admin-created live tenants are created atomically with a plan + subscription.
-- 4) Public visibility requires an active tenant AND active, unexpired subscription.

CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;

  IF NEW.plan_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = NEW.id
     ) THEN
    INSERT INTO public.subscriptions (
      tenant_id,
      plan_id,
      status,
      current_period_start,
      current_period_end
    )
    VALUES (
      NEW.id,
      NEW.plan_id,
      'pending',
      now(),
      now() + interval '30 days'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_tenant() FROM PUBLIC, anon, authenticated, service_role;

-- Repair legacy onboarding rows that were created as active before payment was
-- verified. Approval below resets the actual paid period, so no paid days are lost.
UPDATE public.subscriptions s
SET status = 'pending'
FROM public.tenants t
WHERE t.id = s.tenant_id
  AND t.status = 'pending'
  AND s.status = 'active'
  AND s.payment_verified_at IS NULL;

CREATE OR REPLACE FUNCTION public.approve_tenant_onboarding(_tenant uuid)
RETURNS TABLE (
  tenant_id uuid,
  subscription_id uuid,
  current_period_start timestamptz,
  current_period_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_start timestamptz := clock_timestamp();
  v_end timestamptz := v_start + interval '30 days';
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  SELECT *
  INTO v_tenant
  FROM public.tenants
  WHERE id = _tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;

  IF v_tenant.status <> 'pending' THEN
    RAISE EXCEPTION 'tenant is not pending onboarding';
  END IF;

  SELECT s.*
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.tenant_id = _tenant
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription is required before approval';
  END IF;

  IF v_sub.payment_verified_at IS NULL THEN
    RAISE EXCEPTION 'payment must be verified before approval';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = v_sub.plan_id
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'selected plan is not active';
  END IF;

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = v_start,
      current_period_end = v_end,
      cancel_at = NULL
  WHERE id = v_sub.id;

  UPDATE public.tenants
  SET status = 'active',
      plan_id = v_sub.plan_id,
      verified_at = COALESCE(verified_at, v_start)
  WHERE id = _tenant;

  RETURN QUERY
  SELECT _tenant, v_sub.id, v_start, v_end;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_tenant_onboarding(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_tenant_onboarding(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_tenant(
  _name text,
  _category text,
  _plan uuid,
  _slug text DEFAULT NULL,
  _area text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _activate boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid;
  v_sub uuid;
  v_slug text;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  IF length(trim(COALESCE(_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'tenant name is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.activity_types at
    WHERE at.code = _category AND at.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid or inactive activity type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = _plan AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'an active plan is required';
  END IF;

  v_slug := NULLIF(trim(COALESCE(_slug, '')), '');
  IF v_slug IS NULL THEN
    v_slug := 'tenant-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  END IF;

  INSERT INTO public.tenants (
    slug,
    name,
    category,
    area,
    phone,
    email,
    description,
    image_url,
    owner_id,
    plan_id,
    status,
    verified_at
  )
  VALUES (
    v_slug,
    trim(_name),
    _category,
    NULLIF(trim(COALESCE(_area, '')), ''),
    NULLIF(trim(COALESCE(_phone, '')), ''),
    NULLIF(trim(COALESCE(_email, '')), ''),
    NULLIF(trim(COALESCE(_description, '')), ''),
    NULLIF(trim(COALESCE(_image_url, '')), ''),
    auth.uid(),
    _plan,
    'pending',
    NULL
  )
  RETURNING id INTO v_tenant;

  SELECT id
  INTO v_sub
  FROM public.subscriptions
  WHERE tenant_id = v_tenant
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'subscription bootstrap failed';
  END IF;

  IF _activate THEN
    UPDATE public.subscriptions
    SET status = 'active',
        payment_verified_at = v_now,
        payment_verified_by = auth.uid(),
        payment_method = 'admin_manual',
        current_period_start = v_now,
        current_period_end = v_now + interval '30 days',
        cancel_at = NULL
    WHERE id = v_sub;

    UPDATE public.tenants
    SET status = 'active',
        verified_at = v_now
    WHERE id = v_tenant;
  END IF;

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_tenant(text, text, uuid, text, text, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant(text, text, uuid, text, text, text, text, text, text, boolean)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_tenant_status(_tenant uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  IF _status NOT IN ('active', 'hidden', 'suspended') THEN
    RAISE EXCEPTION 'unsupported tenant status transition';
  END IF;

  IF _status = 'active' AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.tenant_id = _tenant
      AND s.status = 'active'
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end > now()
  ) THEN
    RAISE EXCEPTION 'tenant requires an active, unexpired subscription';
  END IF;

  UPDATE public.tenants
  SET status = _status,
      verified_at = CASE
        WHEN _status = 'active' THEN COALESCE(verified_at, clock_timestamp())
        ELSE verified_at
      END
  WHERE id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_tenant_status(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_tenant_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_subscription_expiry(_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
DECLARE
  sub record;
  owner uuid;
  days_left int;
  notif_kind text;
BEGIN
  IF NOT (
    private.is_tenant_member(auth.uid(), _tenant, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RETURN;
  END IF;

  -- Pending/onboarding subscriptions do not have a paid lifecycle yet.
  -- Only an active subscription can expire or trigger expiry notifications.
  SELECT s.*
  INTO sub
  FROM public.subscriptions s
  WHERE s.tenant_id = _tenant
    AND s.status = 'active'
  ORDER BY s.current_period_end DESC
  LIMIT 1;

  IF sub IS NULL THEN
    RETURN;
  END IF;

  SELECT t.owner_id
  INTO owner
  FROM public.tenants t
  WHERE t.id = _tenant;

  IF owner IS NULL THEN
    RETURN;
  END IF;

  days_left := EXTRACT(DAY FROM sub.current_period_end - now());

  IF sub.current_period_end <= now() THEN
    notif_kind := 'subscription_expired';
  ELSIF days_left <= 7 THEN
    notif_kind := 'subscription_expiring';
  ELSE
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.tenant_id = _tenant
      AND n.kind = notif_kind
      AND n.created_at > now() - interval '1 day'
  ) THEN
    INSERT INTO public.notifications (user_id, tenant_id, kind, title, body)
    VALUES (
      owner,
      _tenant,
      notif_kind,
      CASE
        WHEN notif_kind = 'subscription_expired' THEN 'انتهى اشتراكك'
        ELSE 'اشتراكك على وشك الانتهاء'
      END,
      CASE
        WHEN notif_kind = 'subscription_expired'
          THEN 'تم إخفاء متجرك عن العملاء ولن تصل حجوزات جديدة حتى تجدد اشتراكك. بياناتك محفوظة بالكامل.'
        ELSE ('باقي ' || days_left || ' يوم على انتهاء اشتراكك الحالي.')
      END
    );
  END IF;

  IF notif_kind = 'subscription_expired' THEN
    UPDATE public.tenants
    SET status = 'hidden'
    WHERE id = _tenant AND status = 'active';

    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE id = sub.id AND status = 'active';
  END IF;
END;
$;

REVOKE ALL ON FUNCTION public.check_subscription_expiry(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_subscription_expiry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_is_visible(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = _tenant
      AND t.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.tenant_id = t.id
          AND s.status = 'active'
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end > now()
      )
  )
$$;

REVOKE ALL ON FUNCTION public.tenant_is_visible(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_is_visible(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.tenant_is_visible(uuid) IS
'Returns true only for active tenants with an active, unexpired subscription.';
