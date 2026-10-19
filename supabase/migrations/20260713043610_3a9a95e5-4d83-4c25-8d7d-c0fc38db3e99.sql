-- STAGING ONLY: historically granted platform admin to a specific
-- PRODUCTION identity. This must never be replayed in Staging.
-- Synthetic staging-only admin will be provisioned separately after
-- a real staging Auth user is created and approved in the S2 smoke-test plan.
SELECT 1 AS staging_production_identity_bootstrap_skipped;
