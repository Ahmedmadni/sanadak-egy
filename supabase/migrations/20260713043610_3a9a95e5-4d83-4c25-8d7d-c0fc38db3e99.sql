
-- Re-run the platform-owner admin bootstrap. The original bootstrap
-- migration (20260701184446) was an INSERT ... SELECT that only grants
-- the role if a matching auth.users row already exists at the moment the
-- migration runs — if the account didn't exist yet (or that migration
-- never actually applied), nothing was inserted and nothing failed
-- loudly. Confirmed the account is now live; re-running is a safe no-op
-- if the role was already granted.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'elmadnim@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
