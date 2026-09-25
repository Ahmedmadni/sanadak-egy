-- Gate 14B: in-app notifications for authenticated customers.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, tenant_id, kind, title, body, link)
  VALUES (
    NEW.customer_id,
    NEW.tenant_id,
    'order_status',
    'تم تحديث حالة طلبك',
    'الطلب رقم #' || NEW.serial_no || ' أصبح: ' || NEW.status,
    '/orders'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, tenant_id, kind, title, body, link)
  VALUES (
    NEW.customer_id,
    NEW.tenant_id,
    'booking_status',
    'تم تحديث حالة حجزك',
    'الحجز رقم #' || NEW.serial_no || ' أصبح: ' || NEW.status,
    '/bookings'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_status_notification ON public.orders;
CREATE TRIGGER orders_status_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

DROP TRIGGER IF EXISTS bookings_status_notification ON public.bookings;
CREATE TRIGGER bookings_status_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

REVOKE ALL ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_booking_status_change() FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
