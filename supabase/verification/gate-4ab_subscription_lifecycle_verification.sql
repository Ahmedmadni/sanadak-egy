-- SANAD Gate 4A/B — tenant/subscription lifecycle verification
-- READ ONLY.

select
  'tenant_is_visible_security_definer' as check_name,
  case when p.prosecdef then 'PASS' else 'FAIL' end as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'tenant_is_visible'
union all
select
  'tenant_is_visible_empty_search_path',
  case when coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%' then 'PASS' else 'FAIL' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'tenant_is_visible'
union all
select
  'approve_rpc_authenticated_execute',
  case when has_function_privilege('authenticated', 'public.approve_tenant_onboarding(uuid)', 'EXECUTE') then 'PASS' else 'FAIL' end
union all
select
  'approve_rpc_public_execute_absent',
  case when has_function_privilege('public', 'public.approve_tenant_onboarding(uuid)', 'EXECUTE') then 'FAIL' else 'PASS' end
union all
select
  'admin_create_rpc_authenticated_execute',
  case when has_function_privilege(
    'authenticated',
    'public.admin_create_tenant(text,text,uuid,text,text,text,text,text,text,boolean)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end
union all
select
  'admin_status_rpc_authenticated_execute',
  case when has_function_privilege('authenticated', 'public.admin_set_tenant_status(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end
order by check_name;

-- These rows should be zero before rollout acceptance.
select
  'active_tenants_without_active_subscription' as finding,
  count(*) as row_count
from public.tenants t
where t.status = 'active'
  and not exists (
    select 1
    from public.subscriptions s
    where s.tenant_id = t.id
      and s.status = 'active'
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
union all
select
  'pending_tenants_with_unverified_active_subscription',
  count(*)
from public.tenants t
join public.subscriptions s on s.tenant_id = t.id
where t.status = 'pending'
  and s.status = 'active'
  and s.payment_verified_at is null;

-- Inspect pending onboarding lifecycle state.
select
  t.id as tenant_id,
  t.name,
  t.status as tenant_status,
  t.plan_id,
  s.id as subscription_id,
  s.status as subscription_status,
  s.payment_verified_at,
  s.current_period_start,
  s.current_period_end
from public.tenants t
left join public.subscriptions s on s.tenant_id = t.id
where t.status = 'pending'
order by t.created_at desc;
