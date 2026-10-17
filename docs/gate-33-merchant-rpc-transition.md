# Gate 33 — Merchant lifecycle RPC transition

**Frontend only. No database migrations performed or verified.**

Gate 19A revokes authenticated direct `UPDATE` on `public.tenants`
and installs `update_tenant_profile`. Gate 19C revokes direct
`INSERT` on `public.tenants` and installs
`request_tenant_onboarding`.

The original merchant forms used direct table writes and would fail after
these database changes. Gate 33 makes both forms RPC-first and provides a
carefully restricted pre-migration fallback:

- If the relevant RPC succeeds, return success; never attempt a table write.
- If that exact RPC is **absent** (`PGRST202` or `42883` explicitly mentioning
  the requested procedure), a legacy table write is allowed **only before
  migration**.
- If the RPC is installed but returns an authorization, RLS, validation,
  network, tenant mismatch, or any other error, **never** retry via the
  legacy `tenants` table.
- When 19A and 19C are actually deployed, verified and audited, set
  `VITE_SANADAK_TENANT_RPCS_REQUIRED=true` and rebuild. This makes
  missing RPCs fail closed too.
- Merchant users can no longer change business category through the
  public profile form. Gate 19A requires platform admin authority for
  category changes; separate controlled admin tooling must be reviewed.
- Profile forms now remount when switching tenants, preventing stale
  business information being carried into another tenant's form.
- Obsolete "Claim first admin" self-promotion UI has been removed.
  Admin account provisioning must be performed through an authorized
  operational path and verified server-side RLS.
- Admin access screens now wait for role resolution before showing a
  restriction or privileged dashboard. Frontend guards are not a
  substitute for database authorization.

## Required Lovable/Supabase checks before enabling strict RPC mode

1. Execute the Gate 31 metadata-only preflight against **only the correct**
   Sanadak Supabase reference `lkkxrdxdlkovphjlrcak`.
2. Reconcile Gate19A/19C migrations with the live schema, backup and
   stage a test copy; do not run them from this frontend PR.
3. Test legitimate manager/owner profile edits; employees and cross-tenant
   users must fail. Verify no owner/plan/status/verified_at changes are
   possible through the profile RPC.
4. Verify `request_tenant_onboarding` uses `auth.uid()`, validates
   activities and plans, allows only one pending request per user and
   creates the expected owner membership/subscription records.
5. Test document upload and `submit_payment_info` after onboarding. Paid
   registration stays paused until real payment recipients are verified.
6. Set `VITE_SANADAK_TENANT_RPCS_REQUIRED=true` **only after** verifying
   both RPCs work on the deployed backend; rebuild/redeploy and repeat.
7. Validate admin account setup and role restrictions on an actual session.
   Never restore a public first-admin bootstrap policy.

The compatibility code does not modify any data itself; **browser actions**
do write data when merchant users submit the forms. CI only tests the
presence and safe fallback of the frontend logic, not database integrity.
