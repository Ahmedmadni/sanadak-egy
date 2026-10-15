-- Gate 19A: tenant authorization hardening.
-- Closes direct owner/admin table UPDATE paths for tenant lifecycle and paid entitlements.
-- All business-profile edits flow through a narrow RPC; lifecycle fields remain database/admin controlled.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_tenant_profile(
  _tenant uuid,
  _name text,
  _category text,
  _area text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _cover_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_is_admin boolean := false;
  v_current_category text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_is_admin := private.has_role(v_actor, 'admin'::public.app_role);

  IF NOT (
    private.is_tenant_member(v_actor, _tenant, 'manager')
    OR v_is_admin
  ) THEN
    RAISE EXCEPTION 'tenant profile access denied';
  END IF;

  SELECT t.category
  INTO v_current_category
  FROM public.tenants t
  WHERE t.id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;

  IF char_length(btrim(COALESCE(_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'tenant name must be between 1 and 200 characters';
  END IF;

  IF _category IS DISTINCT FROM v_current_category THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'activity type changes require admin access';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.activity_types a
      WHERE a.code = _category
        AND a.is_active = true
    ) THEN
      RAISE EXCEPTION 'invalid or inactive activity type';
    END IF;
  END IF;

  IF char_length(COALESCE(_area, '')) > 200
     OR char_length(COALESCE(_phone, '')) > 40
     OR char_length(COALESCE(_email, '')) > 320
     OR char_length(COALESCE(_description, '')) > 4000
     OR char_length(COALESCE(_image_url, '')) > 2048
     OR char_length(COALESCE(_cover_url, '')) > 2048 THEN
    RAISE EXCEPTION 'tenant profile field is too long';
  END IF;

  UPDATE public.tenants t
  SET name = btrim(_name),
      category = CASE WHEN v_is_admin THEN _category ELSE v_current_category END,
      area = NULLIF(btrim(COALESCE(_area, '')), ''),
      phone = NULLIF(btrim(COALESCE(_phone, '')), ''),
      email = NULLIF(btrim(COALESCE(_email, '')), ''),
      description = NULLIF(btrim(COALESCE(_description, '')), ''),
      image_url = NULLIF(btrim(COALESCE(_image_url, '')), ''),
      cover_url = NULLIF(btrim(COALESCE(_cover_url, '')), '')
  WHERE t.id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_tenant_profile(uuid, text, text, text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_tenant_profile(uuid, text, text, text, text, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.update_tenant_profile(uuid, text, text, text, text, text, text, text, text)
IS 'Updates only business-profile fields for tenant managers/admins. Lifecycle, owner, plan, verification, slug, and settings remain protected.';

CREATE OR REPLACE FUNCTION public.admin_verify_tenant_payment(_tenant uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_sub uuid;
  v_verified_at timestamptz := clock_timestamp();
BEGIN
  IF v_actor IS NULL OR NOT private.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant
      AND t.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'tenant is not pending onboarding';
  END IF;

  SELECT s.id
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.tenant_id = _tenant
    AND s.status = 'pending'
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'pending subscription not found';
  END IF;

  UPDATE public.subscriptions s
  SET payment_verified_at = v_verified_at,
      payment_verified_by = v_actor
  WHERE s.id = v_sub;

  RETURN v_verified_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_verify_tenant_payment(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_tenant_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_tenant_onboarding(
  _tenant uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
  v_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
BEGIN
  IF v_actor IS NULL OR NOT private.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  IF char_length(COALESCE(v_reason, '')) > 1000 THEN
    RAISE EXCEPTION 'rejection reason is too long';
  END IF;

  SELECT t.*
  INTO v_tenant
  FROM public.tenants t
  WHERE t.id = _tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;

  IF v_tenant.status <> 'pending' THEN
    RAISE EXCEPTION 'tenant is not pending onboarding';
  END IF;

  UPDATE public.subscriptions s
  SET status = 'cancelled',
      cancel_at = COALESCE(s.cancel_at, clock_timestamp())
  WHERE s.id = (
    SELECT s2.id
    FROM public.subscriptions s2
    WHERE s2.tenant_id = _tenant
    ORDER BY s2.created_at DESC
    LIMIT 1
  )
    AND s.status = 'pending';

  UPDATE public.tenants t
  SET status = 'rejected'
  WHERE t.id = _tenant;

  IF v_tenant.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      tenant_id,
      kind,
      title,
      body
    )
    VALUES (
      v_tenant.owner_id,
      _tenant,
      'tenant_rejected',
      'تم رفض طلب الانضمام',
      COALESCE(
        v_reason,
        'يرجى مراجعة بياناتك ومستنداتك وإعادة المحاولة.'
      )
    );
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_tenant_onboarding(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_tenant_onboarding(uuid, text) TO authenticated;

-- No authenticated caller may update tenant rows directly after this gate.
-- SECURITY DEFINER lifecycle/profile RPCs remain authoritative.
REVOKE UPDATE ON TABLE public.tenants FROM authenticated;

COMMIT;
