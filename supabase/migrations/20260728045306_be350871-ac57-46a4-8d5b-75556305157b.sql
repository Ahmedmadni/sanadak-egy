
-- Self-service "claim first admin" — three prior migration-based grants
-- (by email twice, then by the exact user_id read from the live session)
-- still didn't result in admin access, which points at the migration
-- pipeline rather than the grant logic itself. This adds an RLS policy
-- that lets ANY signed-in user insert their own 'admin' role ONLY while
-- zero admins exist yet. The door closes the instant one admin exists
-- (NOT EXISTS becomes false for everyone), so it's a one-time bootstrap,
-- not an open door. Paired with a "Claim admin" button on the Restricted
-- screen (see admin.tsx) so this can be triggered directly from the site
-- without needing SQL access.
CREATE POLICY "First admin bootstrap" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    role = 'admin'::app_role
    AND user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
  );
