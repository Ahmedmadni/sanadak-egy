-- STAGING ONLY: never permit self-service first-admin claims, even transiently.
-- The original migration introduces a policy that promotes the first signed-in
-- user to platform admin. This is not appropriate for the isolated test DB.
-- Approved test admin roles, if needed, must be provisioned separately.
SELECT 1 AS staging_unsafe_admin_self_bootstrap_skipped;
