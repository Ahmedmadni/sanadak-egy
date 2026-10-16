# Gate 31 — Supabase Gate 19 preflight via Lovable

**Status:** read-only assessment only. No SQL migrations have been approved
or deployed by this document.

**Expected project:** Sanadak Supabase project reference
`lkkxrdxdlkovphjlrcak` (to be verified against Lovable's active project
configuration). The app's Lovable project ID is
`73945807-c2ad-410a-884c-2e061f1feaf2`.

## 1. Run metadata-only preflight first

File: [gate-31_read_only_preflight.sql](../supabase/verification/gate-31_read_only_preflight.sql)

The preflight contains six SELECT result sets:

1. **01_environment**: PostgreSQL identity and whether the migration registry is present.
2. **02_relations**: 24 expected tables/views, RLS settings and anon/authenticated privileges.
3. **03_columns**: prerequisites expected by migrations 19A–19D.
4. **04_functions**: actual RPC signatures, SECURITY DEFINER flags, function search_path settings and executable grants.
5. **05_rls_policies**: policy names, roles and commands for sensitive tables.
6. **06_storage_buckets**: bucket privacy, MIME whitelist and upload size limits.

The preflight reads only catalog metadata and storage bucket configuration.
**It must not return emails, phone numbers, payment account numbers,
customers, file names, object paths, or authentication credentials.**

Missing `gate19a`, `gate19c`, or `gate19d` objects may be normal before
deployment. Do not treat every missing planned view/RPC as permission to
automatically install migrations. Conversely, a missing **baseline** table,
column, RLS policy, or function is a **blocker** to assess first.

## 2. Copy this Lovable prompt

> We are working on the existing Sanadak project only, GitHub
> `Ahmedmadni/sanadak-egy`, Lovable project
> `73945807-c2ad-410a-884c-2e061f1feaf2`.
>
> **Do not modify application code or database schema, do not execute any
> migration, and do not create/seed/delete/update any records.** This task is
> only a read-only predeployment security assessment.
>
> Verify the currently connected Supabase project's **reference ID**.
> The expected reference is `lkkxrdxdlkovphjlrcak`.
> If it differs, **stop** and report the mismatch.
>
> Open the following exact file from the GitHub repository's **main**
> branch:
> `supabase/verification/gate-31_read_only_preflight.sql`
>
> Run its six SELECT statements **read-only** against the connected
> database, using only the database inspection functionality you have
> access to. Do not use a migration/apply-changes action.
>
> Return the complete six result sets labeled `01_environment`,
> `02_relations`, `03_columns`, `04_functions`, `05_rls_policies`
> and `06_storage_buckets`. Do not truncate results; if necessary,
> provide separate CSV/text reports. Do not include any customer/user
> data, document paths, passwords, access tokens or secret keys.
>
> Then assess whether the four **unmerged** Gate 19 migrations
> (`19a_tenant_authorization`, `19b_guest_abuse_hardening`,
> `19c_onboarding_storage_hardening`, `19d_public_data_minimization`)
> are compatible with the current schema. List blockers, required
> compatibility fixes and a safe staged rollback plan. A proposed
> rollback is **not authorization to execute it**.
>
> Pay particular attention to migrating public page queries to
> `storefront_*` views, post-Gate-19 customer orders/bookings reads,
> member/owner onboarding, tenant document storage rules, and legacy
> anonymous booking/stock reservations. Gate 19 PR #48 is based on
> older frontend code; newer changes must be preserved during rebase.
>
> If your current Lovable access cannot execute read-only SELECTs,
> explicitly say so and provide a compatible, safe manual route
> through Supabase SQL Editor. **Do not claim successful checks without
> actual query results.**
>
> End your report with `SAFE TO PLAN STAGING` or `BLOCKED` and why.
> Do not proceed to staging or production migrations on your own.

## 3. Review before any migration

The unmerged [Gate 19 PR #48](https://github.com/Ahmedmadni/sanadak-egy/pull/48)
changes four important surfaces:

- **19A tenant lifecycle**: closes direct tenant UPDATE; profile and
  subscription approval must go through vetted RPCs.
- **19B guest orders/bookings**: changes when stock/appointment slots
  become reserved. Existing anonymous pending records must be checked.
- **19C onboarding/storage**: closes direct tenant INSERT, validates
  onboarding through RPC, and locks down document upload types.
- **19D public views**: removes anonymous base-table SELECT and switches
  discovery/storefront to curated `storefront_*` views.

**Current integration risk:** PR #48 predates Gates 20–30 on main and
contains edits to routes and auth/onboarding components that have changed
since. Do not merge its frontend changes wholesale or force a branch
merge. Rebase selectively, preserve new customer order and booking
tracking, and run authenticated and anonymous browser smoke tests.
No live project permission was available at the time of authoring.

## 4. Completion criteria

Before marking Gate 19 ready to deploy: review each preflight finding,
inventory and back up schema plus affected data, stage migrations in
19A→19B→19C→19D order on an authorized **staging** copy, run the four
existing `supabase/verification/gate-19*.sql` verification scripts,
test cross-tenant isolation and anon/authenticated queries, rehearse
rollback from a tested backup, then obtain explicit production approval.
Do **not** copy personally identifiable information from a production
database into a public ticket or chat.
