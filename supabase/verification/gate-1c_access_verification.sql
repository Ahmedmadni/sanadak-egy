-- SANAD Gate 1C — post-reconciliation access verification
-- READ ONLY: this script does not mutate application data.

-- 1. Reconciled objects remain present
select 'activity_types_table' as check_name,
       case when to_regclass('public.activity_types') is null then 'FAIL' else 'PASS' end as result
union all
select 'tenant_documents_table',
       case when to_regclass('public.tenant_documents') is null then 'FAIL' else 'PASS' end
union all
select 'tenant_media_bucket',
       case when exists (select 1 from storage.buckets where id = 'tenant-media') then 'PASS' else 'FAIL' end
union all
select 'tenant_documents_bucket',
       case when exists (select 1 from storage.buckets where id = 'tenant-documents') then 'PASS' else 'FAIL' end
union all
select 'on_auth_user_created_trigger',
       case when exists (select 1 from information_schema.triggers where trigger_name = 'on_auth_user_created') then 'PASS' else 'FAIL' end
union all
select 'on_tenant_created_trigger',
       case when exists (select 1 from information_schema.triggers where trigger_name = 'on_tenant_created') then 'PASS' else 'FAIL' end
union all
select 'tenant_is_visible_function',
       case when to_regprocedure('public.tenant_is_visible(uuid)') is null then 'FAIL' else 'PASS' end
union all
select 'check_subscription_expiry_function',
       case when to_regprocedure('public.check_subscription_expiry(uuid)') is null then 'FAIL' else 'PASS' end
union all
select 'submit_payment_info_function',
       case when to_regprocedure('public.submit_payment_info(uuid,text,text)') is null then 'FAIL' else 'PASS' end
order by check_name;

-- 2. Data-integrity repairs remain clean
select
  'users_without_profile' as check_name,
  count(*)::text as value,
  case when count(*) = 0 then 'PASS' else 'FAIL' end as result
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null

union all

select
  'tenants_missing_owner_membership',
  count(*)::text,
  case when count(*) = 0 then 'PASS' else 'FAIL' end
from public.tenants t
left join public.tenant_members tm
  on tm.tenant_id = t.id
 and tm.user_id = t.owner_id
where t.owner_id is not null
  and tm.id is null;

-- 3. Bootstrap path must remain closed
select
  'first_admin_bootstrap_absent' as check_name,
  case when exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'First admin bootstrap'
  ) then 'FAIL' else 'PASS' end as result;

-- 4. Verify final visibility / commerce policy expressions
select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and policyname in (
    'Public sees active tenants',
    'Public sees branches of active tenants',
    'Public sees staff of active tenants',
    'Public sees catalog of active tenants',
    'Anyone can create booking',
    'Anyone can create order',
    'Anyone insert order items',
    'Users create own pending tenant'
  )
order by tablename, policyname;

-- 5. Function privilege surface
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'tenant_is_visible',
    'check_subscription_expiry',
    'submit_payment_info',
    'handle_new_tenant'
  )
order by routine_name, grantee;
