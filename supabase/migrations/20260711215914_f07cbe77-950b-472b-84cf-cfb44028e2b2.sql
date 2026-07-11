
-- =========================================================
-- Fix: the "Fixed security findings" migration ran
--   DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- to move it to private.handle_new_user(), but CASCADE also silently
-- dropped the on_auth_user_created trigger on auth.users that depended
-- on it — and the trigger was never recreated. Every sign-up since that
-- migration applied has had no public.profiles row created for them,
-- which breaks anything that looks a user up by profile (e.g. the Super
-- Admin "Users & roles" panel, which only lists users with a profile).
-- =========================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Backfill profiles for any accounts that signed up while the trigger
-- was missing.
INSERT INTO public.profiles (id, full_name, phone)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
