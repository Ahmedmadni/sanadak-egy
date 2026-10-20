# Sanadak Staging — S1.5 Frontend import, smoke tests and order-RPC cutover

**Staging only**: Lovable project `a5ba6f1c-a324-4761-a604-2936a1f8f5cf`.
**Forbidden production backend:** `lkkxrdxdlkovphjlrcak`.
**Source branch:** `staging/sanadak-isolated-s0`.
**Database checkpoint:** manual migrations 1–17 succeeded; registry was not
populated. Do not replay those files and **do not enable auto-migration**.
**Production main stays unchanged.**

## Gate A — import source review (no writes to Lovable)

Lovable's planning agent reported it cannot connect an existing GitHub
repository to this already-created project using normal Git sync, and its
ZIP import path creates a new project. It proposed a **read-only checkout of
this public staging branch**, examination of every source file, then a
**selective code copy** into the existing Lovable Staging project in build mode.
Its plan awaits human approval, not an automatic assistant decision.

Before any copy, check:
1. The Lovable project ID is the **Staging** ID above. Confirm Staging
   Supabase ref/public URL from the Staging settings and that both differ from
   production. Do not guess project ref from the Lovable project UUID.
2. Read-only inspect the branch commit, source tree, `package.json`,
   `src/integrations/supabase/**`, and all auth/server routes.
3. Exclude `.env`, `.env.*`, private credentials and keys, Git metadata,
   `supabase/config.toml`, auto-generated environment settings, storage
   secrets, and any production Supabase reference or auth users.
4. Treat `supabase/migrations/**` as **reference only**. Do not execute them
   or mark their history applied when copying project source. The original
   Lovable Staging project's own database and secrets remain authoritative.
5. Preserve `assertStagingSupabaseUrl` guards in browser, server and
   authenticated middleware. Fail closed if actual Staging URL and ref
   cannot be configured accurately; never disable the guards to make UI work.
6. Confirm the project stays **unpublished**, with test email/payment/
   webhooks disabled until authorized. Do not link/sync GitHub `main`.
7. Produce diff/review report, list of files to copy, and confirm explicit
   second approval before any copy in Lovable build mode.

## Gate B — staging storefront order RPC actual journey

These are manual *integration/E2E* checks, not assertions derived from source:
- Set up synthetic Staging-only tenant, valid visibility/subscription,
  two catalog items, quantities and a dedicated test account **only in
  Staging**. No production customer identities or payment recipients.
- Use the **actual** `/store/:slug` route and cart checkout. Confirm
  an anonymous checkout with `create_order` (via browser network trace)
  succeeds and returns a server-created order ID, serial and receipt.
- Verify authoritative price, currency and order-item snapshots in Staging.
  Duplicate/invalid/out-of-stock/forged price/mixed-currency and disabled
  tenant scenarios must fail with no untrusted totals or cross-tenant writes.
- Confirm the checkout form handles RPC errors without clearing cart.
- Review grants/roles using
  `supabase/verification/staging-s1-order-rpc-readonly.sql`; current
  read-only baseline showed the RPC installed and executable by `anon` and
  `authenticated`, while direct `orders/order_items` INSERT **remains
  permitted by table grants** for both roles. Do not treat this as proof
  that row-level writes are possible; RLS is a separate check.
- Record exact Staging project ID, app build SHA, test accounts' *synthetic
  roles* (not IDs), test time, browser/network evidence, SQL verification and
  pass/fail results.

## Gate C — migrate #18 only after Gate B

Only after documented Gate B browser success, update
`supabase/verification/staging-baseline-ledger.json` with
`frontend_order_rpc_verified=true` and evidence link, and review CI.
Then stage/apply **only**
`20260909132000_close_direct_order_inserts.sql` on the verified
Staging database with a transaction and project/server identity guard.

After #18 test:
- `has_table_privilege('anon','public.orders','INSERT') = false`;
  likewise `authenticated` and `order_items` (subject to PG grant
  inheritance; inspect actual effective permissions).
- New legitimate order still succeeds via `create_order`, including
  authenticated and anonymous flows.
- Errors/denial for direct writes are enforced at DB layer, not only hidden
  by UI.

Only then update migration checkpoint to **18/30**.

## Gate D — booking RPC and #19/#20

In chronological order, install **#19**
`20260909133000_create_atomic_booking_rpc.sql`.
Use the real Staging booking dialog and synthetic provider schedule to
test availability and `create_booking`, including collision and tenant
authorization failures. Record browser/network evidence. Only after
`frontend_booking_rpc_verified=true` and approval, install **#20**
`20260909140000_close_direct_booking_inserts.sql`.
Verify direct INSERT denied while valid booking RPC succeeds.

## Legacy cart warning

`src/routes/store.$slug.tsx` uses the authoritative
`StoreCartCheckout` and `BookingDialog` RPC flows.
The **global** `CartSheet` in `src/routes/__root.tsx`, however, is
a *different legacy WhatsApp-only flow* and **does not create a backend
Sanadak order**. Staging code now avoids claiming success and erasing the
basket simply because a WhatsApp draft was opened. Do not count any
WhatsApp action as a successful order RPC E2E test.

## Release criteria

Until all dependencies are met, report:
**S1 baseline partially installed; UI import pending human plan approval;
Gate 19 not installed; production not approved.**
