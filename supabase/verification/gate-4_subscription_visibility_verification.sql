-- SANAD Gate 4 — subscription visibility enforcement verification
-- READ ONLY.

select
  'tenant_is_visible_security_definer' as check_name,
  case when p.prosecdef then 'PASS' else 'FAIL' end as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='tenant_is_visible'
union all
select
  'tenant_is_visible_empty_search_path',
  case when coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%' then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='tenant_is_visible'
union all
select
  'anon_tenant_is_visible_execute',
  case when has_function_privilege('anon', 'public.tenant_is_visible(uuid)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'authenticated_tenant_is_visible_execute',
  case when has_function_privilege('authenticated', 'public.tenant_is_visible(uuid)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'public_tenant_is_visible_execute_absent',
  case when has_function_privilege('public', 'public.tenant_is_visible(uuid)', 'EXECUTE') then 'FAIL' else 'PASS' end
union all
select
  'no_legacy_no_subscription_bypass',
  case when position('NOT EXISTS' in upper(pg_get_functiondef(p.oid))) > 0 then 'FAIL' else 'PASS' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='tenant_is_visible'
union all
select
  'requires_active_subscription',
  case when upper(pg_get_functiondef(p.oid)) like '%S.STATUS = ''ACTIVE''%'
         and upper(pg_get_functiondef(p.oid)) like '%CURRENT_PERIOD_END%'
       then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='tenant_is_visible'
order by check_name;
