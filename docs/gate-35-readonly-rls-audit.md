# Gate 35 — Read-only RLS predicate and direct-grant audit

Gate 31 confirms baseline schema compatibility but **does not attest effective
row-level authorization**: its policy report omits the `USING` and `WITH CHECK`
expressions, and its table grant booleans do not explain the source of grants.

Run [`gate-35_read_only_rls_predicate_audit.sql`](../supabase/verification/gate-35_read_only_rls_predicate_audit.sql)
**only** on the existing authorized Sanadak project, after Lovable verifies
the project reference `lkkxrdxdlkovphjlrcak`.

## Copy-ready Lovable request

> In the existing Sanadak Launchpad project, confirm the connected Supabase
> project reference is `lkkxrdxdlkovphjlrcak`. If it differs, stop.
> On GitHub `Ahmedmadni/sanadak-egy` `main`, open
> `supabase/verification/gate-35_read_only_rls_predicate_audit.sql`.
> Execute its three SELECT-only statements using the read-only database
> connection. Return all rows for `01_policy_predicates`,
> `02_direct_table_grants`, and `03_api_role_security`; include
> `USING` / `WITH CHECK` expressions and roles/commands for every policy.
> Report policy predicates that admit other tenants' rows, use unconditional
> true, allow unauthenticated writes, or reference sensitive user data.
> Do not return application records, customer identities, keys or tokens.
> **Do not alter database/schema/policies, run a migration, deploy, or
> create any staging environment.** End with findings and read-only verdict.

## Before applying Gate 19 on staging

1. Obtain the full Gate 31 and Gate 35 outputs and review direct and inherited
   grants as well as actual policy predicates, not just names and counts.
2. Confirm **separate Staging database project ref**, access rights, and
   independent deployment variables; do not run migrations on production.
   Do not clone personal production data without explicit approval.
3. Review Gate 19A–D SQL against latest `main` (the PR #48 frontend is stale).
   In Gate 19D the view creation and revoke operations are already in a
   single transaction, so other sessions do not see the uncommitted partial
   change. The actual risks are unmet frontend/view contract, wrong grants,
   and post-commit permissions or policy mistakes.
4. Back up and rehearse rollback. Gate 19D rollback must also restore
   the intended SELECT RLS policies; simply re-granting SELECT and dropping
   storefront views **cannot restore public visibility**. Gate 19B rollback
   must account for modified inventory and booking reservation semantics.
5. On the isolated staging environment, verify migrations sequentially
   (19A then 19B then 19C then 19D), followed by the relevant verification
   scripts, authenticated/anonymous browser journeys and tenant isolation.
6. Only after staging proves good, plan a separate, expressly approved
   production rollout, flag flip and frontend rebuild; do not infer
   production approval from this report.

**Status:** planning and read-only security review; no permission to migrate.
