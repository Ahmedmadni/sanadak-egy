-- Gate 19C: self-onboarding and storage abuse hardening.
--
-- Contract:
-- 1) Authenticated users cannot INSERT tenants directly.
-- 2) Self-onboarding flows through one validated RPC and permits at most one
--    pending onboarding request per account at a time.
-- 3) The obsolete legacy store_requests public submission path is closed.
-- 4) Tenant document/media buckets enforce MIME and file-size limits.
-- 5) tenant_documents rows must reference an object path owned by the same tenant.
-- 6) Private SECURITY DEFINER helpers use an empty search_path.

BEGIN;

CREATE OR REPLACE FUNCTION private.has_role(
  _user_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION private.is_tenant_member(
  _user uuid,
  _tenant uuid,
  _min_role text DEFAULT 'employee'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant
      AND tm.user_id = _user
      AND CASE _min_role
            WHEN 'owner' THEN tm.role = 'owner'
            WHEN 'manager' THEN tm.role IN ('owner', 'manager')
            ELSE tm.role IN ('owner', 'manager', 'employee')
          END
  )
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_tenant_member(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_tenant_member(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_tenant_onboarding(
  _name text,
  _category text,
  _plan uuid,
  _slug text DEFAULT NULL,
  _area text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant uuid;
  v_slug text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF char_length(btrim(COALESCE(_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'tenant name must be between 1 and 200 characters';
  END IF;

  IF char_length(COALESCE(_area, '')) > 200
     OR char_length(COALESCE(_phone, '')) > 40
     OR char_length(COALESCE(_description, '')) > 4000 THEN
    RAISE EXCEPTION 'tenant onboarding field is too long';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.activity_types a
    WHERE a.code = _category
      AND a.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid or inactive activity type';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = _plan
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'active subscription plan is required';
  END IF;

  -- Serialize onboarding requests per account so concurrent requests cannot
  -- race past the one-pending-request invariant.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('tenant-onboarding:' || v_actor::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.owner_id = v_actor
      AND t.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'an onboarding request is already pending';
  END IF;

  v_slug := NULLIF(btrim(COALESCE(_slug, '')), '');

  IF v_slug IS NULL THEN
    v_slug := 'tenant-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  END IF;

  IF char_length(v_slug) NOT BETWEEN 1 AND 80
     OR v_slug !~ '^[[:alnum:]][[:alnum:]-]*$' THEN
    RAISE EXCEPTION 'invalid tenant slug';
  END IF;

  INSERT INTO public.tenants (
    slug,
    name,
    category,
    area,
    phone,
    description,
    owner_id,
    plan_id,
    status,
    verified_at
  )
  VALUES (
    v_slug,
    btrim(_name),
    _category,
    NULLIF(btrim(COALESCE(_area, '')), ''),
    NULLIF(btrim(COALESCE(_phone, '')), ''),
    NULLIF(btrim(COALESCE(_description, '')), ''),
    v_actor,
    _plan,
    'pending',
    NULL
  )
  RETURNING id INTO v_tenant;

  RETURN v_tenant;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_tenant_onboarding(text, text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_tenant_onboarding(text, text, uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.request_tenant_onboarding(text, text, uuid, text, text, text, text)
IS 'Creates one validated pending tenant onboarding request for the authenticated account; direct tenant INSERT is closed.';

REVOKE INSERT ON TABLE public.tenants FROM authenticated;

DROP POLICY IF EXISTS "Users create own pending tenant" ON public.tenants;

DROP POLICY IF EXISTS "Anyone can submit a request" ON public.store_requests;
REVOKE INSERT ON TABLE public.store_requests FROM anon, authenticated;

-- Server-side bucket enforcement. Client checks are only a UX layer.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]::text[]
WHERE id = 'tenant-documents';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]::text[]
WHERE id = 'tenant-media';

DROP POLICY IF EXISTS "Members upload tenant documents" ON public.tenant_documents;
CREATE POLICY "Members upload tenant documents"
  ON public.tenant_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_tenant_member(auth.uid(), tenant_id, 'manager')
    AND uploaded_by = auth.uid()
    AND file_path LIKE tenant_id::text || '/%'
    AND char_length(file_path) <= 512
    AND kind IN (
      'commercial_register',
      'owner_id',
      'activity_license',
      'payment_receipt'
    )
  );

COMMIT;
