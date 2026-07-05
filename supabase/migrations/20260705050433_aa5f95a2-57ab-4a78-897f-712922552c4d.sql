-- Move SECURITY DEFINER helpers to private schema and tighten permissive policies
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_tenant_member(_user uuid, _tenant uuid, _min_role text DEFAULT 'employee')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_tenant_member(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_tenant_member(uuid, uuid, text) TO authenticated, service_role;

-- Drop old policies referencing public.has_role / public.is_tenant_member
DROP POLICY IF EXISTS "Admins insert stores" ON public.stores;
DROP POLICY IF EXISTS "Admins update stores" ON public.stores;
DROP POLICY IF EXISTS "Admins delete stores" ON public.stores;
DROP POLICY IF EXISTS "Admins view requests" ON public.store_requests;
DROP POLICY IF EXISTS "Admins update requests" ON public.store_requests;
DROP POLICY IF EXISTS "Admins delete requests" ON public.store_requests;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
DROP POLICY IF EXISTS "Members see own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Admins see all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners update tenant" ON public.tenants;
DROP POLICY IF EXISTS "Admins manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Customers delete own review" ON public.reviews;
DROP POLICY IF EXISTS "Members view own membership" ON public.tenant_members;
DROP POLICY IF EXISTS "Owners manage members" ON public.tenant_members;
DROP POLICY IF EXISTS "Members manage branches" ON public.branches;
DROP POLICY IF EXISTS "Members manage staff" ON public.staff;
DROP POLICY IF EXISTS "Members view catalog" ON public.catalog_items;
DROP POLICY IF EXISTS "Members manage catalog" ON public.catalog_items;
DROP POLICY IF EXISTS "Members see tenant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members manage tenant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members delete tenant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members see tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Members manage tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Managers delete tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Order items follow parent order" ON public.order_items;
DROP POLICY IF EXISTS "Members manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Members delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Members moderate reviews" ON public.reviews;
DROP POLICY IF EXISTS "Members view subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Members view usage" ON public.ai_usage;
DROP POLICY IF EXISTS "Members insert usage" ON public.ai_usage;
DROP POLICY IF EXISTS "User sees own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins manage tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins read audit" ON public.audit_log;

-- Recreate all policies using private.* helpers
CREATE POLICY "Admins insert stores" ON public.stores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update stores" ON public.stores AS PERMISSIVE FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete stores" ON public.stores AS PERMISSIVE FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view requests" ON public.store_requests AS PERMISSIVE FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update requests" ON public.store_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete requests" ON public.store_requests AS PERMISSIVE FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage plans" ON public.plans AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members see own tenant" ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING (private.is_tenant_member(auth.uid(), id, 'employee'::text));
CREATE POLICY "Admins see all tenants" ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update tenant" ON public.tenants AS PERMISSIVE FOR UPDATE TO authenticated USING (private.is_tenant_member(auth.uid(), id, 'owner'::text)) WITH CHECK (private.is_tenant_member(auth.uid(), id, 'owner'::text));
CREATE POLICY "Admins manage tenants" ON public.tenants AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers delete own review" ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated USING (((customer_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members view own membership" ON public.tenant_members AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Owners manage members" ON public.tenant_members AS PERMISSIVE FOR ALL TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'owner'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'owner'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members manage branches" ON public.branches AS PERMISSIVE FOR ALL TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members manage staff" ON public.staff AS PERMISSIVE FOR ALL TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members view catalog" ON public.catalog_items AS PERMISSIVE FOR SELECT TO authenticated USING (private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text));
CREATE POLICY "Members manage catalog" ON public.catalog_items AS PERMISSIVE FOR ALL TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members see tenant bookings" ON public.bookings AS PERMISSIVE FOR SELECT TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members manage tenant bookings" ON public.bookings AS PERMISSIVE FOR UPDATE TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members delete tenant bookings" ON public.bookings AS PERMISSIVE FOR DELETE TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members see tenant orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members manage tenant orders" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Managers delete tenant orders" ON public.orders AS PERMISSIVE FOR DELETE TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Order items follow parent order" ON public.order_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND ((o.customer_id = auth.uid()) OR private.is_tenant_member(auth.uid(), o.tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Members manage order items" ON public.order_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND (private.is_tenant_member(auth.uid(), o.tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND (private.is_tenant_member(auth.uid(), o.tenant_id, 'employee'::text) OR private.has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Members delete order items" ON public.order_items AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND (private.is_tenant_member(auth.uid(), o.tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Members moderate reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members view subscription" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'owner'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members view usage" ON public.ai_usage AS PERMISSIVE FOR SELECT TO authenticated USING ((private.is_tenant_member(auth.uid(), tenant_id, 'manager'::text) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Members insert usage" ON public.ai_usage AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (private.is_tenant_member(auth.uid(), tenant_id, 'employee'::text));
CREATE POLICY "User sees own tickets" ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins manage tickets" ON public.support_tickets AS PERMISSIVE FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read audit" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Drop public SECURITY DEFINER helpers (now private)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid, uuid, text);

-- Move handle_new_user helper to private schema as well
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

-- Tighten permissive INSERT policies (RLS_POLICY_ALWAYS_TRUE)
DROP POLICY IF EXISTS "Anyone can submit a request" ON public.store_requests;
CREATE POLICY "Anyone can submit a request" ON public.store_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(store_name,'')) BETWEEN 1 AND 200
    AND char_length(coalesce(phone,'')) BETWEEN 1 AND 40
    AND char_length(coalesce(owner_name,'')) BETWEEN 1 AND 200
    AND (submitted_by IS NULL OR submitted_by = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;
CREATE POLICY "Anyone can create booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id)
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
CREATE POLICY "Anyone insert order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id)
  );