# Gate 36 — Sanadak isolated staging provisioning (NO production migration)

**Status:** planning only. Gate 31 (baseline inventory) and Gate 35 (RLS predicate and
grant audit) were reported by the operator from Lovable's read-only connection.
The complete raw Gate 35 TXT results are **not committed here**; conclusions
below are pending independent evidence review. Neither report authorizes a
production migration. Gate 19 PR #48 remains a draft based on older UI code.

## System boundaries

| Environment | Database | Purpose |
|---|---|---|
| Existing Sanadak Launchpad Lovable project `73945807-c2ad-410a-884c-2e061f1feaf2` | **Production/shared-preview:** Supabase ref `lkkxrdxdlkovphjlrcak` | **DO NOT ALTER** |
| New Sanadak Staging Lovable project | **New, different Supabase project ref + URL** | Run isolated tests after approval |
| Staging frontend | Separate deploy URL, separate Supabase *public* URL and publishable key | No production API access, no production login sharing |

**A duplicate Lovable UI/project is not proof of isolation.** Do not proceed
unless the backing Supabase **project reference** and URL differ from production
and the staging app/build environment points only at that new backend.

**Do not** change database in the original project, connect staging to
production Supabase, re-use production auth/service keys, link staging directly
to the production GitHub main branch for automatic writes, seed real customer
records, import Auth users or Storage files, or expose Staging publicly.
No changes to DNS or real payment recipients. No SQL migrations at this phase.

## Copy-ready Lovable operator request

> This is for Sanadak / سندك. Create or describe how to create a genuinely
> **independent, private Staging** environment; do not alter the existing
> Lovable project `73945807-c2ad-410a-884c-2e061f1feaf2` or its live
> Supabase ref `lkkxrdxdlkovphjlrcak`.
>
> First determine whether the currently available Lovable account capabilities
> allow creating a separate project with a **new separate Supabase database**.
> If that is not supported, STOP; report the exact blocker and an operator
> procedure using a newly created Supabase project, without sending any
> credentials or secrets in chat.
>
> If you can guarantee new backend isolation, create a new **private**
> `Sanadak Staging` Lovable project connected only to a **different/new**
> Supabase project. Use project code from GitHub
> `Ahmedmadni/sanadak-egy`, but do not change production `main` or attach
> staging to the production auto-sync path. Use a dedicated staging branch or
> safe read-only source snapshot.
>
> Provision **empty schema only** from the required baseline
> migrations, if the environment supports it, but do not run Gate 19A–19D or
> any application smoke tests or data modifications at this point. **Do not
> import production data, Auth users, storage objects, webhooks, payment
> integrations or email delivery settings.** If even baseline schema provisioning
> would be automatic, announce it first and require approval before proceeding.
>
> Report new Staging Lovable project ID, Staging Supabase project ref,
> Staging Supabase URL, private Staging preview URL, code branch/commit,
> DB schema status (empty/not provisioned/baseline), and proof the production
> project ref differs. Only publishable/non-secret URLs and IDs.
>
> Return an isolation checklist for DB, Auth, Storage, Edge Functions,
> third-party integrations, environment variables, webhooks, email and billing.
> Explicitly certify **zero production changes**, **zero Gate 19 migrations**
> and **zero real-data copies**. If identity cannot be proved, return BLOCKED.
> Stop and wait for the next instruction.

## Security findings to gate in staging

- **P0 / 19A:** owner-level direct UPDATE on `tenants` appears able to change
  protected lifecycle, subscription and verification fields. Verify the actual
  predicates, column grants and constraints from full Gate 35 output. Close
  direct UPDATE after approved `update_tenant_profile` RPC is tested.
- **P0 / 19C:** direct INSERT permits pending tenant records carrying
  operator-controlled privileged attributes. Install and validate
  `request_tenant_onboarding`, then close table INSERT.
- **P1 / 19D:** public base-table SELECT may expose private tenant owner
  and staff/review identity fields. Curated `storefront_*` views must
  be validated with real anonymous requests before broad policies/grants are
  replaced. Migration 19D wraps view creation and permission revocation in
  one SQL transaction; no external session sees half-committed DDL.
- **P1 / pre-19C:** anonymous `store_requests` insert is spam-prone and may
  accept non-pending status. Confirm intended feature use. Disable or validate
  server-side with `status = 'pending'`, length limits and rate-limiting.
- **P1 / grants:** operator reports anon has unneeded UPDATE, DELETE,
  TRUNCATE, TRIGGER, REFERENCES and MAINTAIN privileges on some tables.
  RLS cannot protect TRUNCATE. Independently check direct grants and revoke
  unnecessary rights in *staging* via a separately reviewed migration that
  does not break the intended API/trigger/function call model. Consider
  authenticated role grants as well.
- **P2:** review member role escalation, profile notification updates and
  unused role labels. Keep these scoped to separate audited changes, not a
  single unreviewed production SQL paste.

## Stage gates — do not skip

1. **S0 (this step):** independently prove new Lovable/Supabase Staging ref,
   URL and env isolation. Require clear owner approval to provision even
   baseline schema/data.
2. **S1:** apply verified baseline schema on Staging **only** using approved
   migrations and synthetic test users/tenants. Confirm baseline verification.
3. **S2:** review and selectively update SQL from draft Gate 19 PR #48 against
   **current** main; do not merge obsolete PR frontend. Prepare independent
   migration checks and dry-run rollback scripts.
4. **S3:** on Staging only, apply 19A → verify legitimate owner edits and
   blocked lifecycle edits; 19B → verify guest order/booking inventory and
   conflicts; 19C → verify onboarding/storage limits; 19D → verify public
   storefront/views and tenant isolation. Keep migrated and unmigrated client
   compatibility explicit and switch strict flags only on the Staging build.
5. **S4:** failure/rollback rehearsal, including restoring RLS policies in 19D
   and reconciling existing inventory/booking state in 19B. Keep separate
   scripts, backups and a reviewed downtime/lock plan.
6. **S5:** independent audit and explicit owner authorization for a later
   production deployment. No automatic or implicit promotion.

## Return schema before the next gate

```text
Staging Lovable project ID:
Staging Supabase ref:
Staging Supabase URL (public URL, no keys):
Staging private preview URL:
Staging Git branch and commit:
Original production Lovable project ID: 73945807-c2ad-410a-884c-2e061f1feaf2
Original production Supabase ref: lkkxrdxdlkovphjlrcak
Verified staging ref != production ref: YES/NO
Verified staging URL != production URL: YES/NO
Verified Staging build env points only to staging: YES/NO
Staging database status:
Production migrations executed: 0 (must be)
Gate 19 migrations executed anywhere: 0 (must be at S0)
Production data copied: NO (must be)
Blockers:
Decision: ISOLATED / BLOCKED
```
