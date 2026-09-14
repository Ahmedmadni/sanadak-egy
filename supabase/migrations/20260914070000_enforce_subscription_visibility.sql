-- Gate 4: enforce the platform subscription contract at the visibility boundary.
--
-- Previous legacy behavior intentionally allowed an active tenant with no
-- subscription row to remain public. The product contract now requires every
-- public tenant to have an active, unexpired subscription (including free-plan
-- subscriptions). This single helper is already used by public tenant/catalog/
-- branch/staff visibility and by order/booking creation RPCs, so hardening it
-- closes the gap consistently without duplicating policy logic.

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
      AND EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.tenant_id = t.id
          AND s.status = 'active'
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end > now()
      )
  )
$$;

REVOKE ALL ON FUNCTION public.tenant_is_visible(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_is_visible(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.tenant_is_visible(uuid) IS
'Returns true only when the tenant is active and has an active, unexpired subscription. Tenants without a subscription are intentionally not public.';
