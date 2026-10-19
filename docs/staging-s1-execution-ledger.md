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

## Applied (via direct Lovable database action, each within a transaction)

These four files returned success from the Staging project action:

1. `20260528092343_2c036d49-5ea1-46da-9314-50f57f6f2fe5.sql`
2. `20260528092355_ca99ad4e-141c-48fc-9ebb-70aca2d2cace.sql`
3. `20260621042038_9b60d4e8-fc5a-4eb8-9324-daabadc10e65.sql`
4. `20260622042211_f12b3c85-279c-4860-a4ed-49e6c110338d.sql`

Independent Staging read-only verification after #4 confirmed `tenants`,
`orders`, `bookings` exist; `public.plans` contained three static plan
templates; and `auth.users` contained zero users.

**CRITICAL:** These files were run by the Lovable **SQL query action**, not by
the Supabase migration CLI. The `supabase_migrations.schema_migrations`
registry was **absent** during the checks. Do not assume the four migrations
are registered as applied; importing all migration files or running an
automatic migration push could reapply them and fail. First reconcile the
migration registry using a safe approved migration management workflow or
continue deliberately with individually journaled manual migrations. Never
silently replay these four SQL files.

## Blocked / not applied

5. `20260701171755_b6f2f829-17dd-488c-a6ff-3b2e82965791.sql`:
   **NOT EXECUTED**. Lovable rejected the action with free-plan database
   action limit; tool explicitly reported the query was not executed.
6. All subsequent baseline migrations: **NOT EXECUTED**.
7. All Gate 19A–19D migrations: **NOT EXECUTED**.

Lovable project AI agent source-import action was also **NOT EXECUTED**:
the connected workspace was out of credits. Staging remains a separately
generated `STAGING ONLY` holding app; GitHub branch source is ready but is
**NOT** imported/auto-synced into Staging.

## Staging branch-specific safeguards

- Dedicated `supabase/config.toml` placeholder, **not** production ref.
- Staging-only runtime guards in browser, server and auth middleware
  require an HTTPS Supabase URL matching the configured staging project ref
  and explicitly block the production ref.
- Three historical **production-admin bootstrap** SQL files were replaced
  with no-ops **on Staging branch only**:
  `20260701184446`, `20260713043610`, and `20260713044233`.
  Do not grant a real production user platform administrator on Staging.
- CI validates staged source independently; no merge into production
  `main` is intended.

## Next approved work when Lovable limits permit

1. Verify Staging project and its public Supabase project ref/URL from its
   actual Lovable settings, confirm it differs from production and source
   build environment points to Staging only.
2. Do not link project code or run migration tooling that would auto-replay
   the first four manually applied migrations.
3. Review the next migration dependencies and apply only the intended
   remaining **baseline** migrations in chronological order to Staging
   with explicit safe identity checks and a per-file success ledger.
   Stop immediately on first error. The three historical admin bootstraps
   are Staging no-ops.
4. Verify baseline schema/grants/RLS using read-only SQL and synthetic test
   tenants/users only. No production data.
5. Import code from `staging/sanadak-isolated-s0` after credits are available,
   preserving the Staging project cloud environment. Do not auto-sync main.
6. Only then schedule later separately-approved Gate 19 staging rollout
   (19A, 19B, 19C, 19D). Never apply Gate19 to production implicitly.

**Do not construe baseline DDL success or CI success as proof of auth,
RLS isolation, checkout or booking functionality.**
