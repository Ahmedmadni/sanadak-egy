
-- The "Fixed security findings" migration (20260705050433) tightened the
-- bookings/orders/order_items INSERT policies (good — it added ownership
-- and existence checks), but it replaced them without the tenant_is_visible()
-- gate from Phase 2, so new orders/bookings no longer stop when a tenant is
-- hidden/suspended/expired. Re-apply that gate on top of the tightened checks.

DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;
CREATE POLICY "Anyone can create booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.tenant_is_visible(tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.tenant_is_visible(tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
CREATE POLICY "Anyone insert order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.tenant_is_visible(o.tenant_id)
    )
  );

-- check_subscription_expiry() was callable by any authenticated user for any
-- tenant_id (it only mutates that tenant's own subscription/notification rows
-- based on real dates, so it wasn't directly exploitable, but there's no
-- reason to let a stranger trigger it on someone else's tenant either).
CREATE OR REPLACE FUNCTION public.check_subscription_expiry(_tenant uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub RECORD;
  owner uuid;
  days_left int;
  notif_kind text;
BEGIN
  IF NOT (private.is_tenant_member(auth.uid(), _tenant, 'employee') OR private.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

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
