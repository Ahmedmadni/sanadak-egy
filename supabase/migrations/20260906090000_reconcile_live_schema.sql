-- Gate 1B: forward-only reconciliation of repository-intended state missing live.
-- This migration is deliberately additive/data-preserving and safe to re-run where practical.

-- =========================================================
-- 1. Missing columns
-- =========================================================
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS unit_label text;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.plans.commission_rate
  IS 'Platform commission percentage applied to tenant orders on this plan';

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_reference text;

-- =========================================================
-- 2. Missing activity type registry
-- =========================================================
CREATE TABLE IF NOT EXISTS public.activity_types (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  catalog_kind text NOT NULL DEFAULT 'product',
  catalog_label_ar text NOT NULL,
  catalog_label_en text NOT NULL,
  staff_label_ar text NOT NULL DEFAULT 'الفريق',
  staff_label_en text NOT NULL DEFAULT 'Staff',
  has_orders boolean NOT NULL DEFAULT true,
  has_bookings boolean NOT NULL DEFAULT false,
  uses_variants boolean NOT NULL DEFAULT false,
  uses_stock boolean NOT NULL DEFAULT false,
  uses_duration boolean NOT NULL DEFAULT false,
  uses_barcode boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.activity_types TO anon, authenticated;
GRANT ALL ON public.activity_types TO service_role;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads active activity types" ON public.activity_types;
CREATE POLICY "Public reads active activity types"
  ON public.activity_types FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage activity types" ON public.activity_types;
CREATE POLICY "Admins manage activity types"
  ON public.activity_types FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS activity_types_updated ON public.activity_types;
CREATE TRIGGER activity_types_updated
  BEFORE UPDATE ON public.activity_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.activity_types (
  code, label_ar, label_en, catalog_kind, catalog_label_ar, catalog_label_en,
  staff_label_ar, staff_label_en, has_orders, has_bookings, uses_variants,
  uses_stock, uses_duration, uses_barcode, sort_order
) VALUES
  ('restaurants', 'مطعم',            'Restaurant',        'menu_item', 'قائمة الطعام',       'Menu',               'الفريق',     'Staff',   true,  true,  true,  false, false, false, 1),
  ('cafes',       'كافيه',           'Café',              'menu_item', 'قائمة المشروبات',    'Menu',               'الفريق',     'Staff',   true,  true,  true,  false, false, false, 2),
  ('shops',       'متجر',            'Shop',              'product',   'المنتجات',           'Products',           'الفريق',     'Staff',   true,  false, true,  true,  false, true,  3),
  ('super',       'سوبرماركت',       'Supermarket',       'product',   'المنتجات',           'Products',           'الفريق',     'Staff',   true,  false, false, true,  false, true,  4),
  ('pharmacy',    'صيدلية',          'Pharmacy',          'product',   'المنتجات',           'Products',           'الفريق',     'Staff',   true,  false, false, true,  false, true,  5),
  ('halls',       'قاعة أفراح',      'Wedding hall',      'package',   'الباقات والأسعار',   'Packages & pricing', 'الفريق',     'Staff',   false, true,  false, false, true,  false, 6),
  ('medical',     'عيادة / مستشفى',  'Clinic / Hospital', 'service',   'الخدمات والكشوفات',  'Services',           'الأطباء',    'Doctors', false, true,  false, false, true,  false, 7),
  ('salon',       'صالون',           'Salon',             'service',   'الخدمات',            'Services',           'فريق العمل', 'Staff',   false, true,  false, false, true,  false, 8)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 3. Missing legal/payment document registry
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  file_path text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_documents_tenant_idx
  ON public.tenant_documents(tenant_id);

GRANT SELECT, INSERT, UPDATE ON public.tenant_documents TO authenticated;
GRANT ALL ON public.tenant_documents TO service_role;
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view own tenant documents" ON public.tenant_documents;
CREATE POLICY "Members view own tenant documents"
  ON public.tenant_documents FOR SELECT TO authenticated
  USING (
    private.is_tenant_member(auth.uid(), tenant_id, 'manager')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Members upload tenant documents" ON public.tenant_documents;
CREATE POLICY "Members upload tenant documents"
  ON public.tenant_documents FOR INSERT TO authenticated
  WITH CHECK (
    private.is_tenant_member(auth.uid(), tenant_id, 'manager')
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins moderate tenant documents" ON public.tenant_documents;
CREATE POLICY "Admins moderate tenant documents"
  ON public.tenant_documents FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- 4. Restore signup automation and repair only absent profiles
-- =========================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

INSERT INTO public.profiles (id, full_name, phone)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 5. Tenant lifecycle / subscription helpers
-- =========================================================
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
    INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_end)
    VALUES (NEW.id, NEW.plan_id, 'active', now() + interval '30 days');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_tenant() FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM public.tenants t
LEFT JOIN public.tenant_members tm
  ON tm.tenant_id = t.id
 AND tm.user_id = t.owner_id
WHERE t.owner_id IS NOT NULL
  AND tm.id IS NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

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
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.subscriptions s
          WHERE s.tenant_id = t.id
            AND s.status = 'active'
            AND s.current_period_end > now()
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.tenant_is_visible(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_is_visible(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_subscription_expiry(_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  SELECT s.*
  INTO sub
  FROM public.subscriptions s
  WHERE s.tenant_id = _tenant
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
$$;

REVOKE ALL ON FUNCTION public.check_subscription_expiry(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_subscription_expiry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_payment_info(_tenant uuid, _method text, _reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_tenant_member(auth.uid(), _tenant, 'owner') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _method IS NULL OR _method NOT IN ('bank_transfer', 'vodafone_cash') THEN
    RAISE EXCEPTION 'invalid payment method';
  END IF;

  UPDATE public.subscriptions
  SET payment_method = _method,
      payment_reference = _reference
  WHERE tenant_id = _tenant
    AND id = (
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.tenant_id = _tenant
      ORDER BY s.current_period_end DESC
      LIMIT 1
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_info(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment_info(uuid, text, text) TO authenticated;

-- =========================================================
-- 6. Restore final repository visibility/commerce policy state
--    These live policies currently exist in an older status/existence-only form.
-- =========================================================
DROP POLICY IF EXISTS "Public sees active tenants" ON public.tenants;
CREATE POLICY "Public sees active tenants"
  ON public.tenants FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(id));

DROP POLICY IF EXISTS "Public sees branches of active tenants" ON public.branches;
CREATE POLICY "Public sees branches of active tenants"
  ON public.branches FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Public sees staff of active tenants" ON public.staff;
CREATE POLICY "Public sees staff of active tenants"
  ON public.staff FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Public sees catalog of active tenants" ON public.catalog_items;
CREATE POLICY "Public sees catalog of active tenants"
  ON public.catalog_items FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;
CREATE POLICY "Anyone can create booking"
  ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.tenant_is_visible(tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.tenant_is_visible(tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
CREATE POLICY "Anyone insert order items"
  ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND public.tenant_is_visible(o.tenant_id)
    )
  );

-- =========================================================
-- 7. Restore missing self-service onboarding/bootstrap policies
-- =========================================================
DROP POLICY IF EXISTS "Users create own pending tenant" ON public.tenants;
CREATE POLICY "Users create own pending tenant"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "First admin bootstrap" ON public.user_roles;
CREATE POLICY "First admin bootstrap"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    role = 'admin'::public.app_role
    AND user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role
    )
  );

-- =========================================================
-- 8. Restore storage buckets and tenant-scoped object policies
--    Object path contract: <tenant_uuid>/<filename>
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-media', 'tenant-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads tenant media" ON storage.objects;
CREATE POLICY "Public reads tenant media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tenant-media');

DROP POLICY IF EXISTS "Members upload tenant media" ON storage.objects;
CREATE POLICY "Members upload tenant media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND private.is_tenant_member(
      auth.uid(),
      CASE
        WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END,
      'manager'
    )
  );

DROP POLICY IF EXISTS "Members update tenant media" ON storage.objects;
CREATE POLICY "Members update tenant media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND private.is_tenant_member(
      auth.uid(),
      CASE
        WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END,
      'manager'
    )
  )
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND private.is_tenant_member(
      auth.uid(),
      CASE
        WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END,
      'manager'
    )
  );

DROP POLICY IF EXISTS "Members delete tenant media" ON storage.objects;
CREATE POLICY "Members delete tenant media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND private.is_tenant_member(
      auth.uid(),
      CASE
        WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END,
      'manager'
    )
  );

DROP POLICY IF EXISTS "Members read own tenant documents" ON storage.objects;
CREATE POLICY "Members read own tenant documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND (
      private.is_tenant_member(
        auth.uid(),
        CASE
          WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN ((storage.foldername(name))[1])::uuid
          ELSE NULL
        END,
        'manager'
      )
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Members upload tenant documents to storage" ON storage.objects;
CREATE POLICY "Members upload tenant documents to storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND private.is_tenant_member(
      auth.uid(),
      CASE
        WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END,
      'manager'
    )
  );
