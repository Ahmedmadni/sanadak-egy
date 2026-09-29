-- Gate 19D: minimize public data exposure.
--
-- Public storefront/discovery reads move to curated owner-executed views with
-- explicit visibility filters and a small column surface. Anonymous callers lose
-- direct SELECT on the underlying tables. Authenticated tenant members/admins
-- keep their existing base-table access through RLS.

BEGIN;

DROP POLICY IF EXISTS "Public sees active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Public sees branches of active tenants" ON public.branches;
DROP POLICY IF EXISTS "Public sees staff of active tenants" ON public.staff;
DROP POLICY IF EXISTS "Public sees catalog of active tenants" ON public.catalog_items;
DROP POLICY IF EXISTS "Public reads approved visible reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public reads approved reviews" ON public.reviews;

REVOKE SELECT ON TABLE public.tenants FROM anon;
REVOKE SELECT ON TABLE public.branches FROM anon;
REVOKE SELECT ON TABLE public.staff FROM anon;
REVOKE SELECT ON TABLE public.catalog_items FROM anon;
REVOKE SELECT ON TABLE public.reviews FROM anon;

-- Preserve least-privilege member reads after removing the broad public policies.
DROP POLICY IF EXISTS "Members view tenant branches" ON public.branches;
CREATE POLICY "Members view tenant branches"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (
    private.is_tenant_member(auth.uid(), tenant_id, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Members view tenant staff" ON public.staff;
CREATE POLICY "Members view tenant staff"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (
    private.is_tenant_member(auth.uid(), tenant_id, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE OR REPLACE VIEW public.storefront_tenants
WITH (security_barrier = true)
AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.category,
  t.description,
  t.area,
  t.phone,
  t.image_url,
  t.cover_url,
  t.verified_at
FROM public.tenants t
WHERE public.tenant_is_visible(t.id);

CREATE OR REPLACE VIEW public.storefront_catalog_items
WITH (security_barrier = true)
AS
SELECT
  c.id,
  c.tenant_id,
  c.kind,
  c.name,
  c.description,
  c.price,
  c.currency,
  c.image_url,
  c.category,
  c.variants,
  c.stock,
  c.duration_minutes,
  c.sort_order
FROM public.catalog_items c
WHERE c.is_active = true
  AND public.tenant_is_visible(c.tenant_id);

CREATE OR REPLACE VIEW public.storefront_branches
WITH (security_barrier = true)
AS
SELECT
  b.id,
  b.tenant_id,
  b.name,
  b.address,
  b.created_at
FROM public.branches b
WHERE b.is_active = true
  AND public.tenant_is_visible(b.tenant_id);

CREATE OR REPLACE VIEW public.storefront_staff
WITH (security_barrier = true)
AS
SELECT
  s.id,
  s.tenant_id,
  s.branch_id,
  s.name,
  s.role,
  s.specialty,
  s.created_at
FROM public.staff s
WHERE s.is_active = true
  AND public.tenant_is_visible(s.tenant_id);

CREATE OR REPLACE VIEW public.storefront_reviews
WITH (security_barrier = true)
AS
SELECT
  r.id,
  r.tenant_id,
  r.rating,
  r.body,
  r.verified_at,
  r.created_at
FROM public.reviews r
WHERE r.is_approved = true
  AND public.tenant_is_visible(r.tenant_id);

REVOKE ALL ON TABLE
  public.storefront_tenants,
  public.storefront_catalog_items,
  public.storefront_branches,
  public.storefront_staff,
  public.storefront_reviews
FROM PUBLIC;

GRANT SELECT ON TABLE
  public.storefront_tenants,
  public.storefront_catalog_items,
  public.storefront_branches,
  public.storefront_staff,
  public.storefront_reviews
TO anon, authenticated;

COMMENT ON VIEW public.storefront_tenants IS
'Public tenant profile surface. Omits owner_id, plan_id, settings, lifecycle state and internal timestamps.';
COMMENT ON VIEW public.storefront_staff IS
'Public staff surface. Omits auth user_id and private schedule metadata.';
COMMENT ON VIEW public.storefront_reviews IS
'Public approved review surface. Omits customer identity and moderation metadata.';

COMMIT;
