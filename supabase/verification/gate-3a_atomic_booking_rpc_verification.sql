-- SANAD Gate 3A — atomic booking RPC verification
-- READ ONLY.

select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_booking';

select
  'create_booking_anon_execute' as check_name,
  case when has_function_privilege(
    'anon',
    'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end as result
union all
select
  'create_booking_authenticated_execute',
  case when has_function_privilege(
    'authenticated',
    'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end
union all
select
  'create_booking_public_execute_absent',
  case when has_function_privilege(
    'public',
    'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)',
    'EXECUTE'
  ) then 'FAIL' else 'PASS' end
union all
select
  'legacy_bookings_insert_still_open_stage_3a',
  case when
    has_table_privilege('anon', 'public.bookings', 'INSERT')
    or has_table_privilege('authenticated', 'public.bookings', 'INSERT')
  then 'PASS_STAGE_3A' else 'CHECK' end
order by check_name;

-- Inspect the current direct INSERT policies during the staged rollout.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'bookings'
  and cmd = 'INSERT'
order by policyname;
