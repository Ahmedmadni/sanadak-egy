-- STAGING ONLY: the historical migration grants admin to a named
-- production-owner email account if it exists. Do not copy that identity
-- mapping into the isolated staging baseline. No-op by design.
-- Set up synthetic staging-only test admin later through an approved,
-- auditable procedure after staging Auth and authorization are verified.
SELECT 1 AS staging_historical_admin_bootstrap_skipped;
