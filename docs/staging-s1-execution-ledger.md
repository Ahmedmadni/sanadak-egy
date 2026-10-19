# Sanadak Staging — Gate S1 execution ledger

**Date:** 2026-10-19.
**Scope:** Staging only. No production database writes and no Gate 19A–19D migrations.

## Environment

- Staging Lovable project: `a5ba6f1c-a324-4761-a604-2936a1f8f5cf`
- Production Lovable project (DO NOT WRITE): `73945807-c2ad-410a-884c-2e061f1feaf2`
- Production Supabase project ref (DO NOT CONNECT): `lkkxrdxdlkovphjlrcak`
- Staging branch: `staging/sanadak-isolated-s0`
- Staging database has a distinct PostgreSQL server address from production;
  the staging database was independently created and originally contained
  neither `public.tenants` nor `public.profiles`.
- Public staging Supabase ref/URL is not yet independently display-verifiable
  through the current Lovable connector. The staging `supabase/config.toml`
  intentionally contains `STAGING_REF_UNVERIFIED_DO_NOT_RUN` as a fail-closed
  sentinel. **Do not run `supabase db push`, `supabase link` or other
  automatic migration tooling** until the staging ref/URL have been verified.

## Applied on Staging (manual, not in migration registry)

**Confirmed completed:** 13 baseline migration files in chronological order.
Each was submitted to the **Staging Lovable project ID only**, inside an
explicit transaction with a check of the independent Staging PostgreSQL server
address and baseline prerequisites. The tools returned success.

1. `20260528092343_2c036d49-5ea1-46da-9314-50f57f6f2fe5.sql`
2. `20260528092355_ca99ad4e-141c-48fc-9ebb-70aca2d2cace.sql`
3. `20260621042038_9b60d4e8-fc5a-4eb8-9324-daabadc10e65.sql`
4. `20260622042211_f12b3c85-279c-4860-a4ed-49e6c110338d.sql`
5. `20260701171755_b6f2f829-17dd-488c-a6ff-3b2e82965791.sql`
6. `20260701184446_fcf96731-4573-4597-8383-8179fbe1a8d0.sql` (Staging-only no-op: production admin identity)
7. `20260705050433_aa5f95a2-57ab-4a78-897f-712922552c4d.sql`
8. `20260707081859_8cba916d-4baa-4e09-9768-fbb520a669f6.sql`
9. `20260707081958_f5f37bd1-5a4e-4d24-8687-d5fcd3b8930b.sql`
10. `20260707225627_8374b495-552c-42cb-a3a5-108a529856cc.sql`
11. `20260711215914_f07cbe77-950b-472b-84cf-cfb44028e2b2.sql`
12. `20260713043610_3a9a95e5-4d83-4c25-8d7d-c0fc38db3e99.sql` (Staging-only no-op: production admin identity)
13. `20260713044233_fe8078a7-8bfe-4333-a1de-28c3da0d384b.sql` (Staging-only no-op: production admin identity)

Read-only confirmation after #4: `tenants`, `orders`, and `bookings`
existed, `plans` had three static templates, `auth.users` had zero users.
After #13 the SQL action limit prevented another verification query. **Treat
the later state as applied based on individual successful transactions, not
a completed independent full schema audit.**

**Version-locked manifest:** [`supabase/verification/staging-baseline-ledger.json`](../supabase/verification/staging-baseline-ledger.json) now pins
the Git blob SHA of all 30 Staging SQL files, with `applied-manually`
for #1–13 and `pending` for #14–30. GitHub Actions runs
`scripts/verify-staging-migration-ledger.mjs` and rejects changes to any
recorded migration until an explicitly reviewed ledger update. This check
validates repository file integrity only, not whether the database contains
the claimed migration effects.

**CRITICAL MIGRATION STATE:** executed via direct Lovable SQL query action,
not through Supabase migration CLI. The
`supabase_migrations.schema_migrations` registry was absent during
preflight. Do not run `supabase db push` or replay the previous files until
the execution ledger has been reconciled with the approved registry
management process. Do not mark all files applied just to suppress errors.

## Blocked / not applied

14. `20260728045306_be350871-ac57-46a4-8d5b-75556305157b.sql`:
   **NOT EXECUTED**, as Lovable reported free-plan MCP database action
   rate limit (retry approximately 56 minutes after the 2026-10-19 run,
   subject to actual plan limits). The **Staging branch** file has been
   converted to an intentional no-op disabling unsafe self-service
   first-admin promotion. It must be executed/recorded only after limits
   reset and Staging connection is reverified.
15. `20260906090000_reconcile_live_schema.sql` and all subsequent baseline
   migrations: **NOT EXECUTED**. Must be reviewed in order, especially
   its RLS, trigger and storage policy changes.
16. All Gate 19A–19D migrations: **NOT EXECUTED**.
17. No full Sanadak code import into Lovable Staging: blocked by **Lovable
   workspace out of agent credits**. The deployed/test page remains
   a separately generated `STAGING ONLY` holding app.

Lovable project AI agent source-import action was also **NOT EXECUTED**:
the connected workspace was out of credits. Staging remains a separately
generated `STAGING ONLY` holding app; GitHub branch source is ready but is
**NOT** imported/auto-synced into Staging.

## Staging branch-specific safeguards

- Dedicated `supabase/config.toml` placeholder, **not** production ref.
- Staging-only runtime guards in browser, server and auth middleware
  require an HTTPS Supabase URL matching the configured staging project ref
  and explicitly block the production ref.
- Four historical **admin bootstrap** SQL files were replaced
  with no-ops **on Staging branch only**:
  `20260701184446`, `20260713043610`, `20260713044233`, and
  `20260728045306` (the unsafe first-admin RLS self-claim).
  Do not grant a real production user platform administrator on Staging.
- CI validates staged source independently; no merge into production
  `main` is intended.

## Next approved work when Lovable limits permit

1. Verify Staging project and its public Supabase project ref/URL from its
   actual Lovable settings, confirm it differs from production and source
   build environment points to Staging only.
2. Do not link project code or run migration tooling that would auto-replay
   the thirteen manually applied migrations.
3. Review the next migration dependencies and apply only the intended
   remaining **baseline** migrations in chronological order to Staging
   with explicit safe identity checks and a per-file success ledger.
   Stop immediately on first error. The four historical admin bootstrap migrations
   are Staging no-ops.
4. Verify baseline schema/grants/RLS using read-only SQL and synthetic test
   tenants/users only. No production data.
5. Import code from `staging/sanadak-isolated-s0` after credits are available,
   preserving the Staging project cloud environment. Do not auto-sync main.
6. Only then schedule later separately-approved Gate 19 staging rollout
   (19A, 19B, 19C, 19D). Never apply Gate19 to production implicitly.

**Do not construe baseline DDL success or CI success as proof of auth,
RLS isolation, checkout or booking functionality.**
