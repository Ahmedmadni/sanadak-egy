
-- Grant admin directly by user_id instead of matching on email. The two
-- previous email-based bootstrap attempts (20260701184446, 20260713043610)
-- didn't take effect — Google sign-in for this project goes through
-- Lovable's own auth broker (@lovable.dev/cloud-auth-js) rather than
-- Supabase's native OAuth, so the email stored on auth.users may not be
-- what's expected. This user_id was read directly from the live session
-- via the app's own "Restricted" screen (User ID: ...), so it's exact.
INSERT INTO public.user_roles (user_id, role)
VALUES ('6b644c22-dd4c-41a2-aa43-98be26d4ae84', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
