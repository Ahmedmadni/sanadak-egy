-- Gate 1B security follow-up: do not install the historical self-service first-admin bootstrap policy.
--
-- The historical policy checks NOT EXISTS (SELECT ... FROM public.user_roles) inside an
-- authenticated RLS policy. A non-admin caller may not be able to see another user's admin
-- row through SELECT RLS, so that check is not a reliable global "no admin exists" test.
-- Gate 1A/1B preflight confirms the live environment already has one admin, so bootstrap is
-- no longer required for this deployment. Keep the live state closed rather than replaying
-- an obsolete privilege-escalation path.

DROP POLICY IF EXISTS "First admin bootstrap" ON public.user_roles;
