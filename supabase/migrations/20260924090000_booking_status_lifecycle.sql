-- Gate 12A: authoritative booking-status lifecycle.
-- Direct browser updates are closed; status transitions now pass through one RPC.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_allowed;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_allowed
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) NOT VALID;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancellation_reason_length;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_reason_length
  CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500) NOT VALID;

DROP POLICY IF EXISTS "Members manage tenant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members delete tenant bookings" ON public.bookings;
REVOKE UPDATE, DELETE ON TABLE public.bookings FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_booking_status(
  _booking uuid,
  _status text,
  _cancellation_reason text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  status text,
  cancelled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_status text := lower(btrim(COALESCE(_status, '')));
  v_reason text := NULLIF(btrim(COALESCE(_cancellation_reason, '')), '');
  v_is_staff boolean := false;
  v_cancelled_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _booking IS NULL OR v_status NOT IN ('confirmed', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'invalid booking status';
  END IF;

  IF char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'cancellation reason is too long';
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = _booking
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  v_is_staff := private.is_tenant_member(v_actor, v_booking.tenant_id, 'employee')
    OR private.has_role(v_actor, 'admin'::public.app_role);

  IF v_is_staff THEN
    IF (v_booking.status = 'pending' AND v_status NOT IN ('confirmed', 'cancelled'))
      OR (v_booking.status = 'confirmed' AND v_status NOT IN ('completed', 'cancelled', 'no_show'))
      OR v_booking.status IN ('completed', 'cancelled', 'no_show') THEN
      RAISE EXCEPTION 'invalid booking status transition';
    END IF;
  ELSIF v_booking.customer_id = v_actor
    AND v_status = 'cancelled'
    AND v_booking.status IN ('pending', 'confirmed')
    AND v_booking.slot_start > clock_timestamp() THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'booking status access denied';
  END IF;

  IF v_status = 'cancelled' THEN
    v_cancelled_at := clock_timestamp();
    UPDATE public.bookings b
    SET status = 'cancelled',
        cancelled_at = v_cancelled_at,
        cancelled_by = v_actor,
        cancellation_reason = v_reason
    WHERE b.id = _booking;
  ELSE
    UPDATE public.bookings b
    SET status = v_status
    WHERE b.id = _booking;
  END IF;

  RETURN QUERY SELECT _booking, v_status, v_cancelled_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_booking_status(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.set_booking_status(uuid, text, text) IS
'Applies the permitted booking lifecycle transitions. Customers may only cancel their own future pending or confirmed bookings.';

COMMIT;
