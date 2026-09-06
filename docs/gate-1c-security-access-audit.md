# SANAD — Gate 1C Security & Access Audit

## Status

Gate 1B live reconciliation is complete and post-apply verification passed. This Gate 1C audit records the remaining access-control and runtime risks before moving into transactional commerce hardening.

## Confirmed good state

- Live schema contains the reconciled tables, columns, functions, triggers, and storage buckets.
- `tenant_is_visible(uuid)` is now the public visibility gate for tenants, branches, staff, and catalog.
- New orders and bookings are gated by `tenant_is_visible()`.
- `check_subscription_expiry(uuid)` is restricted to authenticated callers and internally checks tenant membership/admin access.
- `submit_payment_info(uuid,text,text)` is restricted to authenticated callers and enforces owner membership plus the current payment-method contract.
- `on_auth_user_created` is restored and profile backfill reduced users-without-profile to zero.
- The historical `First admin bootstrap` policy is removed from live.

## Finding 1 — Generated Supabase types are stale

Severity: Medium / developer-safety issue.

`src/integrations/supabase/types.ts` still reflects the pre-reconciliation schema. It does not yet include at least:

- `activity_types`
- `tenant_documents`
- `catalog_items.barcode`
- `catalog_items.unit_label`
- `plans.commission_rate`
- `subscriptions.payment_verified_at`
- `subscriptions.payment_verified_by`
- `subscriptions.payment_method`
- `subscriptions.payment_reference`
- the new/restored RPC signatures

The file must be regenerated from the authoritative live schema. Do not hand-edit it as a substitute for generation.

## Finding 2 — Dead first-admin UI remains

Severity: Low / UX-security consistency.

`src/routes/admin.tsx` still exposes the historical `Claim first admin` button to non-admin users. The RLS policy that made this path work was intentionally removed because live already has an admin and the bootstrap path is no longer required.

Result: the button is now a dead action and should be removed in a later code cleanup pass.

## Finding 3 — Client-controlled order creation remains non-atomic

Severity: High.

`src/routes/store.$slug.tsx` creates `orders` directly from the browser, then creates `order_items` in a separate client call. The browser supplies business-sensitive values such as:

- `subtotal`
- `total`
- `item_id`
- copied item name
- `unit_price`
- line total

The database does not currently compute these values from authoritative catalog data in one transaction.

Impact:

- price/totals are client-controlled;
- an order can be created without its item if the second call fails;
- validation is split between RLS and UI code instead of one transaction boundary.

This is the main Gate 2 transactional-commerce blocker.

## Finding 4 — `order_items` anonymous insert binding is insufficient

Severity: High.

Current intended RLS permits anonymous/authenticated insert into `order_items` when the parent order exists and its tenant is visible. This does not cryptographically or relationally bind the inserting guest to the order being modified.

For authenticated orders, `orders.customer_id` provides a possible ownership anchor. For anonymous orders, `customer_id` is null, so direct client-side item insertion cannot be strongly attributed to the creator.

Do not attempt to solve this by simply denying anonymous order-item inserts while keeping the current two-call checkout flow; that would break guest checkout. The correct fix is to move order creation + authoritative line calculation into one server/RPC transaction.

## Finding 5 — Booking conflict prevention is still absent

Severity: High for booking-oriented activities.

The current client creates a booking directly with `slot_start` / `slot_end`. There is no confirmed atomic availability/conflict guard preventing overlapping bookings for the same staff/resource/time window.

This belongs to the booking-integrity gate after commerce transaction hardening.

## Gate 1C conclusion

### PASS

- Gate 1B schema/access reconciliation itself is verified.
- Subscription-derived visibility and restored auth/tenant lifecycle hooks are in place.

### OPEN CONDITIONS

1. Regenerate Supabase types from live.
2. Remove the obsolete first-admin claim UI.
3. Do not treat the existing browser checkout as production-integrity-safe.
4. Gate 2 must replace direct browser order/order-item writes with a single authoritative transaction/RPC.
5. Booking conflict enforcement remains a subsequent blocker.

## Recommended next gate

Proceed to **Gate 2 — Transactional Commerce Hardening** after the type-generation prerequisite is satisfied or explicitly tracked as an environment limitation.
