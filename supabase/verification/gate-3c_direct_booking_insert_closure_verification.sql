-- SANAD Gate 3C — direct booking INSERT closure verification
-- READ ONLY.

select
  'anon_bookings_insert_closed' as check_name,
  case when has_table_privilege('anon', 'public.bookings', 'INSERT') then 'FAIL' else 'PASS' end as result
union all
select
  'authenticated_bookings_insert_closed',
  case when has_table_privilege('authenticated', 'public.bookings', 'INSERT') then 'FAIL' else 'PASS' end
union all
select
  'legacy_booking_insert_policy_absent',
  case when exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='bookings'
      and policyname='Anyone can create booking' and cmd='INSERT'
  ) then 'FAIL' else 'PASS' end
union all
select
  'anon_create_booking_execute',
  case when has_function_privilege('anon', 'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'authenticated_create_booking_execute',
  case when has_function_privilege('authenticated', 'public.create_booking(uuid,uuid,timestamptz,text,text,uuid,uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
order by check_name;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='bookings'
order by policyname;
