-- Gate 16A: immutable status timelines for customer transactions.

BEGIN;

CREATE TABLE public.order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX order_status_history_order_created_idx
  ON public.order_status_history (order_id, created_at, id);

CREATE TABLE public.booking_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX booking_status_history_booking_created_idx
  ON public.booking_status_history (booking_id, created_at, id);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.order_status_history, public.booking_status_history TO authenticated;
GRANT ALL ON public.order_status_history, public.booking_status_history TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.order_status_history, public.booking_status_history
  FROM PUBLIC, anon, authenticated;

CREATE POLICY "Customers view own order status history"
  ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Members view tenant order status history"
  ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    private.is_tenant_member(auth.uid(), tenant_id, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Customers view own booking status history"
  ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
    )
  );

CREATE POLICY "Members view tenant booking status history"
  ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (
    private.is_tenant_member(auth.uid(), tenant_id, 'employee')
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.record_order_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.order_status_history (
    order_id, tenant_id, previous_status, status, changed_by
  ) VALUES (
    NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.booking_status_history (
    booking_id, tenant_id, previous_status, status, changed_by
  ) VALUES (
    NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_status_history ON public.orders;
CREATE TRIGGER orders_status_history
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_order_status_history();

DROP TRIGGER IF EXISTS bookings_status_history ON public.bookings;
CREATE TRIGGER bookings_status_history
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_history();

REVOKE ALL ON FUNCTION public.record_order_status_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_booking_status_history()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.order_status_history IS
  'Append-only status timeline written only by the authoritative order status trigger.';
COMMENT ON TABLE public.booking_status_history IS
  'Append-only status timeline written only by the authoritative booking status trigger.';

COMMIT;
