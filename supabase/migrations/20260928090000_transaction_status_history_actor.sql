-- Gate 17A: capture the actor's display name with every status transition.

BEGIN;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

ALTER TABLE public.booking_status_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

CREATE OR REPLACE FUNCTION public.record_order_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(p.full_name), '')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = v_actor;

  INSERT INTO public.order_status_history (
    order_id, tenant_id, previous_status, status, changed_by, changed_by_name
  ) VALUES (
    NEW.id, NEW.tenant_id, OLD.status, NEW.status, v_actor, v_actor_name
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
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(p.full_name), '')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = v_actor;

  INSERT INTO public.booking_status_history (
    booking_id, tenant_id, previous_status, status, changed_by, changed_by_name
  ) VALUES (
    NEW.id, NEW.tenant_id, OLD.status, NEW.status, v_actor, v_actor_name
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_order_status_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_booking_status_history()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON COLUMN public.order_status_history.changed_by_name IS
  'Optional immutable display-name snapshot of the authenticated actor at the time of transition.';
COMMENT ON COLUMN public.booking_status_history.changed_by_name IS
  'Optional immutable display-name snapshot of the authenticated actor at the time of transition.';

COMMIT;
