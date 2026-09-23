-- Gate 10A: verified review lifecycle and narrow moderation boundaries.

BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Preserve legacy reviews while bringing invalid legacy values into the new contract.
UPDATE public.reviews
SET rating = greatest(1, least(5, rating))
WHERE rating NOT BETWEEN 1 AND 5;

UPDATE public.reviews
SET body = left(body, 1000)
WHERE char_length(body) > 1000;

ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT false;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_range,
  DROP CONSTRAINT IF EXISTS reviews_body_length;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_body_length CHECK (body IS NULL OR char_length(body) <= 1000);

DROP TRIGGER IF EXISTS reviews_updated ON public.reviews;
CREATE TRIGGER reviews_updated
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Public reads approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authed users create review" ON public.reviews;
DROP POLICY IF EXISTS "Customers edit own review" ON public.reviews;
DROP POLICY IF EXISTS "Customers delete own review" ON public.reviews;
DROP POLICY IF EXISTS "Members moderate reviews" ON public.reviews;

CREATE POLICY "Public reads approved visible reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  is_approved = true
  AND public.tenant_is_visible(tenant_id)
);

CREATE POLICY "Customers read own reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Members read tenant reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  private.is_tenant_member(auth.uid(), tenant_id, 'employee')
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.reviews FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_review(
  _tenant uuid,
  _rating integer,
  _body text DEFAULT NULL
)
RETURNS TABLE (
  review_id uuid,
  is_approved boolean,
  updated_existing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_customer uuid := auth.uid();
  v_body text := NULLIF(btrim(_body), '');
  v_review uuid;
  v_updated boolean := false;
BEGIN
  IF v_customer IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _tenant IS NULL OR NOT public.tenant_is_visible(_tenant) THEN
    RAISE EXCEPTION 'business is not available for reviews';
  END IF;

  IF _rating IS NULL OR _rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;

  IF char_length(v_body) > 1000 THEN
    RAISE EXCEPTION 'review body is too long';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.tenant_id = _tenant
      AND o.customer_id = v_customer
      AND o.status = 'delivered'
    UNION ALL
    SELECT 1
    FROM public.bookings b
    WHERE b.tenant_id = _tenant
      AND b.customer_id = v_customer
      AND b.status = 'completed'
  ) THEN
    RAISE EXCEPTION 'a completed order or booking is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_customer::text || ':' || _tenant::text, 0)
  );

  SELECT r.id
  INTO v_review
  FROM public.reviews r
  WHERE r.tenant_id = _tenant
    AND r.customer_id = v_customer
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.reviews r
    SET rating = _rating,
        body = v_body,
        is_approved = false,
        verified_at = COALESCE(r.verified_at, clock_timestamp()),
        moderated_at = NULL,
        moderated_by = NULL
    WHERE r.id = v_review;
    v_updated := true;
  ELSE
    INSERT INTO public.reviews (
      tenant_id,
      customer_id,
      rating,
      body,
      is_approved,
      verified_at
    )
    VALUES (
      _tenant,
      v_customer,
      _rating,
      v_body,
      false,
      clock_timestamp()
    )
    RETURNING id INTO v_review;
  END IF;

  RETURN QUERY SELECT v_review, false, v_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.moderate_review(
  _review uuid,
  _approved boolean
)
RETURNS TABLE (
  review_id uuid,
  is_approved boolean,
  moderated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant uuid;
  v_moderated_at timestamptz := clock_timestamp();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _review IS NULL OR _approved IS NULL THEN
    RAISE EXCEPTION 'review and moderation decision are required';
  END IF;

  SELECT r.tenant_id
  INTO v_tenant
  FROM public.reviews r
  WHERE r.id = _review
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'review not found';
  END IF;

  IF NOT (
    private.is_tenant_member(v_actor, v_tenant, 'manager')
    OR private.has_role(v_actor, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'review moderation access required';
  END IF;

  UPDATE public.reviews r
  SET is_approved = _approved,
      moderated_at = v_moderated_at,
      moderated_by = v_actor
  WHERE r.id = _review;

  RETURN QUERY SELECT _review, _approved, v_moderated_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_own_review(_review uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_customer uuid := auth.uid();
BEGIN
  IF v_customer IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  DELETE FROM public.reviews r
  WHERE r.id = _review
    AND r.customer_id = v_customer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'review not found';
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_review(uuid, integer, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.moderate_review(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_own_review(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.submit_review(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_review(uuid) TO authenticated;

COMMENT ON FUNCTION public.submit_review(uuid, integer, text)
IS 'Creates or revises one pending verified review per customer and tenant after a completed order or booking.';
COMMENT ON FUNCTION public.moderate_review(uuid, boolean)
IS 'Allows tenant managers or admins to change only the publication state of a review.';
COMMENT ON FUNCTION public.delete_own_review(uuid)
IS 'Deletes a review only when it belongs to the authenticated customer.';

COMMIT;
