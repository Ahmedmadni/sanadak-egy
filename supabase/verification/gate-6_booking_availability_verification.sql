-- Gate 6 — booking availability contract checks.

select
  'availability_rpc_exists' as check_name,
  case when to_regprocedure(
    'public.get_booking_availability(uuid,uuid,date,uuid,uuid)'
  ) is not null then 'PASS' else 'FAIL' end as result

union all

select
  'availability_rpc_anon_execute',
  case when has_function_privilege(
    'anon',
    'public.get_booking_availability(uuid,uuid,date,uuid,uuid)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end

union all

select
  'availability_rpc_authenticated_execute',
  case when has_function_privilege(
    'authenticated',
    'public.get_booking_availability(uuid,uuid,date,uuid,uuid)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end

union all

select
  'availability_rpc_public_execute_absent',
  case when has_function_privilege(
    'public',
    'public.get_booking_availability(uuid,uuid,date,uuid,uuid)',
    'EXECUTE'
  ) then 'FAIL' else 'PASS' end

union all

select
  'availability_rpc_security_definer',
  case when p.prosecdef then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_booking_availability'

union all

select
  'availability_rpc_empty_search_path',
  case when coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%'
    then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_booking_availability';
