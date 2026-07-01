
-- =========================================================
-- Phase 2+: subscription-derived visibility, self-service
-- tenant onboarding, commission, expiry notifications
-- =========================================================

-- 1. Effective visibility: a tenant is publicly visible only while status='active'
--    AND (no subscription requirement yet OR an active, non-expired subscription).
CREATE OR REPLACE FUNCTION public.tenant_is_visible(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant
      AND t.status = 'active'
      AND (
        NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id)
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.tenant_id = t.id AND s.status = 'active' AND s.current_period_end > now()
        )
      )
  )
$$;

-- Re-point public SELECT policies at the derived visibility check
DROP POLICY IF EXISTS "Public sees active tenants" ON public.tenants;
CREATE POLICY "Public sees active tenants" ON public.tenants FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(id));

DROP POLICY IF EXISTS "Public sees branches of active tenants" ON public.branches;
CREATE POLICY "Public sees branches of active tenants" ON public.branches FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Public sees staff of active tenants" ON public.staff;
CREATE POLICY "Public sees staff of active tenants" ON public.staff FOR SELECT TO anon, authenticated
  USING (public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Public sees catalog of active tenants" ON public.catalog_items;
CREATE POLICY "Public sees catalog of active tenants" ON public.catalog_items FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.tenant_is_visible(tenant_id));

-- New bookings/orders stop once the tenant is no longer visible (expired/hidden/suspended)
DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;
CREATE POLICY "Anyone can create booking" ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (public.tenant_is_visible(tenant_id));

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (public.tenant_is_visible(tenant_id));

-- =========================================================
-- 2. Self-service business registration
-- =========================================================
DROP POLICY IF EXISTS "Users create own pending tenant" ON public.tenants;
CREATE POLICY "Users create own pending tenant" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'pending');

-- Auto-bootstrap owner membership + a starter subscription whenever a tenant gets an owner.
-- Covers both self-service signup and admin-approved requests.
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  IF NEW.plan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE tenant_id = NEW.id) THEN
    INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_end)
    VALUES (NEW.id, NEW.plan_id, 'active', now() + interval '30 days');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

-- =========================================================
-- 3. Commission management (per-plan take rate)
-- =========================================================
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.plans.commission_rate IS 'Platform commission percentage applied to tenant orders on this plan';

-- =========================================================
-- 4. Subscription expiry -> hide store + notify owner
--    Invoked opportunistically when the owner opens their dashboard
--    (and can also be wired to a scheduled job later).
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_subscription_expiry(_tenant uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub RECORD;
  owner uuid;
  days_left int;
  notif_kind text;
BEGIN
  SELECT s.* INTO sub FROM public.subscriptions s WHERE s.tenant_id = _tenant ORDER BY s.current_period_end DESC LIMIT 1;
  IF sub IS NULL THEN RETURN; END IF;

  SELECT t.owner_id INTO owner FROM public.tenants t WHERE t.id = _tenant;
  IF owner IS NULL THEN RETURN; END IF;

  days_left := EXTRACT(DAY FROM sub.current_period_end - now());

  IF sub.current_period_end <= now() THEN
    notif_kind := 'subscription_expired';
  ELSIF days_left <= 7 THEN
    notif_kind := 'subscription_expiring';
  ELSE
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.tenant_id = _tenant AND n.kind = notif_kind AND n.created_at > now() - interval '1 day'
  ) THEN
    INSERT INTO public.notifications (user_id, tenant_id, kind, title, body)
    VALUES (
      owner, _tenant, notif_kind,
      CASE WHEN notif_kind = 'subscription_expired' THEN 'انتهى اشتراكك' ELSE 'اشتراكك على وشك الانتهاء' END,
      CASE WHEN notif_kind = 'subscription_expired'
        THEN 'تم إخفاء متجرك عن العملاء ولن تصل حجوزات جديدة حتى تجدد اشتراكك. بياناتك محفوظة بالكامل.'
        ELSE ('باقي ' || days_left || ' يوم على انتهاء اشتراكك الحالي.')
      END
    );
  END IF;

  IF notif_kind = 'subscription_expired' THEN
    UPDATE public.tenants SET status = 'hidden' WHERE id = _tenant AND status = 'active';
    UPDATE public.subscriptions SET status = 'expired' WHERE id = sub.id AND status = 'active';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_subscription_expiry(uuid) TO authenticated;
