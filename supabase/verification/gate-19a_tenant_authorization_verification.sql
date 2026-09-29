-- Gate 19A read-only verification.
-- Expected: every check PASS and both findings = 0.

SELECT 'authenticated_direct_tenant_update_revoked' AS check_name,
       CASE
         WHEN has_table_privilege('authenticated', 'public.tenants', 'UPDATE')
           THEN 'FAIL'
         ELSE 'PASS'
       END AS result
UNION ALL
SELECT 'update_profile_authenticated_execute',
       CASE
         WHEN has_function_privilege(
           'authenticated',
           'public.update_tenant_profile(uuid,text,text,text,text,text,text,text,text)',
           'EXECUTE'
         ) THEN 'PASS' ELSE 'FAIL'
       END
UNION ALL
SELECT 'update_profile_public_execute_absent',
       CASE
         WHEN has_function_privilege(
           'public',
           'public.update_tenant_profile(uuid,text,text,text,text,text,text,text,text)',
           'EXECUTE'
         ) THEN 'FAIL' ELSE 'PASS'
       END
UNION ALL
SELECT 'verify_payment_public_execute_absent',
       CASE
         WHEN has_function_privilege(
           'public',
           'public.admin_verify_tenant_payment(uuid)',
           'EXECUTE'
         ) THEN 'FAIL' ELSE 'PASS'
       END
UNION ALL
SELECT 'reject_onboarding_public_execute_absent',
       CASE
         WHEN has_function_privilege(
           'public',
           'public.reject_tenant_onboarding(uuid,text)',
           'EXECUTE'
         ) THEN 'FAIL' ELSE 'PASS'
       END
ORDER BY check_name;

SELECT
  'active_tenants_without_active_subscription' AS finding,
  count(*) AS row_count
FROM public.tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.tenant_id = t.id
      AND s.status = 'active'
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end > now()
  )
UNION ALL
SELECT
  'tenant_plan_differs_from_latest_active_subscription',
  count(*)
FROM public.tenants t
JOIN LATERAL (
  SELECT s.plan_id
  FROM public.subscriptions s
  WHERE s.tenant_id = t.id
    AND s.status = 'active'
    AND s.current_period_end > now()
  ORDER BY s.created_at DESC
  LIMIT 1
) s ON true
WHERE t.status = 'active'
  AND t.plan_id IS DISTINCT FROM s.plan_id;
