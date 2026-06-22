
-- =========================================================
-- Phase 1: Multi-tenant SaaS foundation
-- =========================================================

-- 1. Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- 2. updated_at helper (already exists, ensure presence)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- PLANS
-- =========================================================
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_quota_monthly int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.plans FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed plans
INSERT INTO public.plans (code, name_ar, name_en, price_monthly, ai_quota_monthly, sort_order, limits, features) VALUES
  ('free',    'مجاني',  'Free',    0,   0,    1, '{"products":10,"branches":1,"staff":2}'::jsonb,
   '{"analytics":false,"delivery":false,"ai_studio":false,"api":false}'::jsonb),
  ('pro',     'احترافي','Pro',     299, 100,  2, '{"products":200,"branches":3,"staff":15}'::jsonb,
   '{"analytics":true,"delivery":true,"ai_studio":true,"api":false}'::jsonb),
  ('premium', 'بريميوم','Premium', 799, 1000, 3, '{"products":-1,"branches":-1,"staff":-1}'::jsonb,
   '{"analytics":true,"delivery":true,"ai_studio":true,"api":true,"advanced_ai":true}'::jsonb);

-- =========================================================
-- TENANTS (business workspaces)
-- =========================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  area text,
  phone text,
  email text,
  image_url text,
  cover_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active', -- active | hidden | suspended | pending
  verified_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenants_category_idx ON public.tenants(category);
CREATE INDEX tenants_status_idx ON public.tenants(status);
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TENANT MEMBERS
-- =========================================================
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'employee', -- owner | manager | employee
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX tenant_members_user_idx ON public.tenant_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user uuid, _tenant uuid, _min_role text DEFAULT 'employee')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant AND tm.user_id = _user
      AND CASE _min_role
            WHEN 'owner'    THEN tm.role = 'owner'
            WHEN 'manager'  THEN tm.role IN ('owner','manager')
            ELSE                 tm.role IN ('owner','manager','employee')
          END
  )
$$;

-- Tenants policies (now that helper exists)
CREATE POLICY "Public sees active tenants" ON public.tenants FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Members see own tenant" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), id, 'employee'));
CREATE POLICY "Admins see all tenants" ON public.tenants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), id, 'owner'))
  WITH CHECK (public.is_tenant_member(auth.uid(), id, 'owner'));
CREATE POLICY "Admins manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Tenant members policies
CREATE POLICY "Members view own membership" ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners manage members" ON public.tenant_members FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'owner') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'owner') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- BRANCHES
-- =========================================================
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  lat numeric, lng numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX branches_tenant_idx ON public.branches(tenant_id);
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public sees branches of active tenants" ON public.branches FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'active'));
CREATE POLICY "Members manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- STAFF
-- =========================================================
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text,
  specialty text,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_tenant_idx ON public.staff(tenant_id);
GRANT SELECT ON public.staff TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public sees staff of active tenants" ON public.staff FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'active'));
CREATE POLICY "Members manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- CATALOG (products / services / packages)
-- =========================================================
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'product', -- product | service | package | menu_item
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  image_url text,
  category text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock int,
  duration_minutes int,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_tenant_idx ON public.catalog_items(tenant_id);
CREATE INDEX catalog_kind_idx ON public.catalog_items(kind);
GRANT SELECT ON public.catalog_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER catalog_updated BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public sees catalog of active tenants" ON public.catalog_items FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'active'));
CREATE POLICY "Members view catalog" ON public.catalog_items FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'employee'));
CREATE POLICY "Members manage catalog" ON public.catalog_items FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- BOOKINGS
-- =========================================================
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending | confirmed | completed | cancelled | no_show
  notes text,
  serial_no bigserial,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_tenant_idx ON public.bookings(tenant_id);
CREATE INDEX bookings_customer_idx ON public.bookings(customer_id);
CREATE INDEX bookings_slot_idx ON public.bookings(slot_start);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT INSERT ON public.bookings TO anon;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can create booking" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Customer sees own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid());
CREATE POLICY "Members see tenant bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members manage tenant bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members delete tenant bookings" ON public.bookings FOR DELETE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- ORDERS + ORDER ITEMS
-- =========================================================
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  delivery_type text NOT NULL DEFAULT 'pickup', -- pickup | delivery | dine_in
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending', -- pending | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
  payment_status text NOT NULL DEFAULT 'unpaid',
  notes text,
  serial_no bigserial,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_tenant_idx ON public.orders(tenant_id);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Customer sees own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Members see tenant orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members manage tenant orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers delete tenant orders" ON public.orders FOR DELETE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items follow parent order" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.customer_id = auth.uid()
    OR public.is_tenant_member(auth.uid(), o.tenant_id, 'employee')
    OR public.has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Anyone insert order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Members manage order items" ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND
    (public.is_tenant_member(auth.uid(), o.tenant_id, 'employee') OR public.has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (true);
CREATE POLICY "Members delete order items" ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND
    (public.is_tenant_member(auth.uid(), o.tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role))));

-- =========================================================
-- REVIEWS
-- =========================================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating int NOT NULL,
  body text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_tenant_idx ON public.reviews(tenant_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Authed users create review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers edit own review" ON public.reviews FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers delete own review" ON public.reviews FOR DELETE TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members moderate reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active', -- active | past_due | cancelled | expired
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subs_tenant_idx ON public.subscriptions(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Members view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'owner') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- AI USAGE
-- =========================================================
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  tokens int NOT NULL DEFAULT 0,
  cost numeric(10,4) NOT NULL DEFAULT 0,
  period_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_tenant_period_idx ON public.ai_usage(tenant_id, period_month);
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view usage" ON public.ai_usage FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id, 'manager') OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members insert usage" ON public.ai_usage FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id, 'employee'));

-- =========================================================
-- SUPPORT TICKETS
-- =========================================================
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "User sees own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "User creates ticket" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications(user_id, is_read);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- MIGRATE existing public.stores -> tenants
-- =========================================================
INSERT INTO public.tenants (id, slug, name, category, description, area, phone, image_url, owner_id, plan_id, status, created_at)
SELECT
  s.id,
  COALESCE(NULLIF(regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'), ''), s.id::text) || '-' || substr(s.id::text, 1, 6),
  s.name, s.category, s.description, s.area, s.phone, s.image_url, s.owner_id,
  (SELECT id FROM public.plans WHERE code = 'free'),
  'active',
  s.created_at
FROM public.stores s
ON CONFLICT (id) DO NOTHING;

-- Auto-create owner membership where owner_id is set
INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT t.id, t.owner_id, 'owner' FROM public.tenants t WHERE t.owner_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;
