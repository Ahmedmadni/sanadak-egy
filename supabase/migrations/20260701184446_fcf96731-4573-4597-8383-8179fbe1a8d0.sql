
-- =========================================================
-- Bootstrap the first platform admin.
--
-- The "admin" role can only ever be granted by an existing admin
-- (see "Admins insert roles" policy on public.user_roles), which means
-- nobody could ever become the first admin through the app itself.
-- This migration grants the admin role to the platform owner's account
-- (matched by email) if that account already exists. It is safe to
-- re-run: it's a no-op if the account doesn't exist yet, or if the
-- role was already granted.
-- =========================================================
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'elmadnim@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
