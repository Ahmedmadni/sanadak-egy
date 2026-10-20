# Sanadak Staging — S1 execution ledger (updated 2026-10-20)

## Environment and safety boundaries

- **Staging Lovable project:** `a5ba6f1c-a324-4761-a604-2936a1f8f5cf`, unpublished.
- **Production Lovable project, read-only/no writes:** `73945807-c2ad-410a-884c-2e061f1feaf2`.
- **Production Supabase ref, forbidden target:** `lkkxrdxdlkovphjlrcak`.
- **Staging branch:** `staging/sanadak-isolated-s0`, separate from GitHub `main`.
- Staging database identity was verified by its independently observed
  PostgreSQL server address and expected schema. The production server
  address differs; the Staging Supabase project ref and public URL
  **still require an independently inspectable verification**.
- `supabase/config.toml` is a deliberately unusable Staging sentinel.
  **Never run** `supabase link`, `supabase db push` or automatic migrations.
- There are no real Auth users in Staging. No production data copied.
  No Gate 19 migrations applied.

## Manual baseline: 17/30 returned success

Each listed SQL file was submitted solely to the independent **Staging**
Lovable project's database action, in chronological order and inside a
transaction with a staging database identity/prerequisite guard.
Execution success is **not** a production readiness/functional E2E claim.

1. `20260528092343_2c036d49-5ea1-46da-9314-50f57f6f2fe5.sql`
2. `20260528092355_ca99ad4e-141c-48fc-9ebb-70aca2d2cace.sql`
3. `20260621042038_9b60d4e8-fc5a-4eb8-9324-daabadc10e65.sql`
4. `20260622042211_f12b3c85-279c-4860-a4ed-49e6c110338d.sql`
5. `20260701171755_b6f2f829-17dd-488c-a6ff-3b2e82965791.sql`
6. `20260701184446_fcf96731-4573-4597-8383-8179fbe1a8d0.sql` — staging-specific intentional no-op blocking legacy admin bootstrap
7. `20260705050433_aa5f95a2-57ab-4a78-897f-712922552c4d.sql`
8. `20260707081859_8cba916d-4baa-4e09-9768-fbb520a669f6.sql`
9. `20260707081958_f5f37bd1-5a4e-4d24-8687-d5fcd3b8930b.sql`
10. `20260707225627_8374b495-552c-42cb-a3a5-108a529856cc.sql`
11. `20260711215914_f07cbe77-950b-472b-84cf-cfb44028e2b2.sql`
12. `20260713043610_3a9a95e5-4d83-4c25-8d7d-c0fc38db3e99.sql` — staging-specific intentional no-op blocking legacy admin bootstrap
13. `20260713044233_fe8078a7-8bfe-4333-a1de-28c3da0d384b.sql` — staging-specific intentional no-op blocking legacy admin bootstrap
14. `20260728045306_be350871-ac57-46a4-8d5b-75556305157b.sql` — staging-specific intentional no-op blocking legacy admin bootstrap
15. `20260906090000_reconcile_live_schema.sql` — staging-specific reconciliation that does not recreate first-admin promotion
16. `20260906090100_remove_unsafe_first_admin_bootstrap.sql`
17. `20260906100000_create_atomic_order_rpc.sql`

After #15, a read-only verification confirmed 8 activity types, no Auth
users, 68 public RLS policies, installed tenant visibility/payment RPCs,
and **no** `"First admin bootstrap"` policy. #17 installed
`public.create_order(uuid,jsonb,text,text,text,text,text)`.
No order/booking browser journey is yet verified on Staging.

### Pending — next migration #18 is blocked by UI verification

- **#18** `20260909132000_close_direct_order_inserts.sql` would revoke
  direct `INSERT` on `orders` and `order_items`. Its own SQL says to
  apply **only after the deployed Staging frontend is confirmed to use**
  `public.create_order`. The source frontend does call the RPC, but that
  is **not** equivalent to a verified browser test on Staging.
- **#19** `20260909133000_create_atomic_booking_rpc.sql` and
  **#20** `20260909140000_close_direct_booking_inserts.sql` remain
  pending. #20 separately requires a Staging booking RPC browser test.
- **#21–30** remain pending in chronological order.
- **Gate 19A–19D** remain entirely uninstalled.
- Full Sanadak UI has not been imported to the Lovable Staging project;
  the project still hosts its separate `STAGING ONLY` landing page.

**Migration registry warning:** Staging baseline SQL was applied via a
manual Lovable query tool, **not** Supabase CLI migrations.
`supabase_migrations.schema_migrations` was absent during checks.
No one should replay the first 17 files or assume a registry entry exists.
Do not create fake registry history merely to bypass migration errors.

### Integrity manifest and safe resume

- `supabase/verification/staging-baseline-ledger.json` records each
  migration's Git blob SHA and whether it was manually applied.
- `scripts/verify-staging-migration-ledger.mjs` CI-verifies the 30 files
  and their exact applied/pending boundary.
- `scripts/validate-staging-isolation.mjs` blocks introduction of
  production linkage, owner-account admin bootstrap or self-claim policy.
- `scripts/prepare-next-staging-migration.mjs --check` checks the
  next pending file without executing anything. The non-check mode
  **refuses to prepare #18** until the Staging order browser journey is
  genuinely verified and the ledger explicitly records that fact.
- `supabase/verification/staging-s1-resume-readonly.sql` supplies
  independent preflight checks (read-only).

### Source import investigation

Lovable's Staging agent confirmed that standard GitHub sync cannot
link an existing GitHub repository directly into this existing project;
its Import Project flow creates a **new project**, so avoid it.
A separate, review-first **source-copy** approach may be feasible:
read-only checkout of the dedicated Staging branch, exclude `.env`,
Git metadata, production URLs, `supabase/config.toml`, keys, project
configuration and migration execution, then copy only validated frontend
source into the existing Lovable Staging project. This needs an explicit
operator review/approval before any code copying and still requires
independently verified Staging runtime environment variables.

Lovable agent's plan is paused for approval; do not silently approve
a tool action on the user's behalf. **No source import has occurred.**

## Next steps in order

1. Obtain an independently verifiable Staging Supabase project ref and
   URL, confirm against the production ref, and keep Staging unpublished.
2. Review the agent's proposed read-only source check. After explicit
   human approval, inspect the staging branch import surface and exclude
   DB configuration and credentials. Before source copy, get the
   additional approval the agent requested.
3. Configure/import only the frontend code into existing Lovable
   Staging project. Do not run migrations, link production or sync main.
4. Test a synthetic Staging tenant/catalog/order using actual
   `create_order` from the browser. Confirm receipt, item snapshots,
   currency and totals, negative tests and no cross-tenant access.
5. Update the ledger with **evidence** for `frontend_order_rpc_verified`;
   only then apply #18 on Staging, and verify anonymous direct INSERT
   denied while RPC still works.
6. Apply #19 next, exercise real Staging booking RPC flow, then apply
   #20 only when its separate browser verification is documented.
7. Continue #21–30 sequentially with individual verified changes and
   cumulative schema checks. Keep Gate 19 production rollout separate.
8. Test credentials/RLS/storage/onboarding on synthetic Staging data,
   rehearse rollback; seek separate approval for any production changes.

This ledger represents the actual Staging development checkpoint, not
a statement that the platform is production-ready.
