# Gate 32 — storefront public-view transition (frontend first)

**Current state:** Gate 19 database migrations are not deployed or verified. This branch changes frontend reads only. It does not modify RLS, table privileges, schema or stored procedures.

The Gate 19D migration will revoke anonymous SELECT on `public.tenants`, `public.catalog_items`, `public.branches`, `public.staff`, and `public.reviews`, while granting access to curated `storefront_*` views. Until the real database schema is known, the frontend needs to operate on both the pre-migration and post-migration schemas.

## Updated user-facing surfaces

- Public business storefront: business profile, catalog items, approved reviews, branches and staff.
- Homepage: featured businesses and truthful public merchant/review counts.
- Authenticated customers: names/links shown alongside their own orders, bookings and review-eligible businesses. The order/booking record itself remains owned and RLS-filtered. Business metadata remains optional.

## Read path and security behavior

1. Try the corresponding curated `storefront_*` view first with the public column whitelist.
2. A successful query (including zero rows) is authoritative.
3. Only if PostgREST reports the **specific requested view** missing with `PGRST205` or `42P01`, allow a legacy-table query for pre-Gate-19 compatibility.
4. **Never** retry legacy base tables after permission/RLS errors (`42501`), network errors, arbitrary SQL errors, expired JWT, or a missing dependency *inside* a view.
5. Once Gate 19D is deployed and its five views verified, set `VITE_SANADAK_STOREFRONT_VIEWS_REQUIRED=true` in that frontend deployment **and rebuild**. Strict mode fails closed if a view is missing.
6. If storefront item/subquery errors occur, do not mix partial business profile results with private or stale information. Show a localized load error.
7. Missing public metadata for a user's past order or booking is shown as an unavailable business rather than leaking a hidden tenant's information.

## Staged rollout steps — operator only

**Do not run Gate 19 SQL migrations yet.** First request the Gate 31 preflight from the correct connected Lovable/Supabase project and verify project ref `lkkxrdxdlkovphjlrcak`.

In staging:

- Deploy frontend Gate 32 first. Ensure the public pages work while the old tables exist.
- Run and review the four draft Gate 19 migrations **only after** the actual schema and PR #48 frontend conflicts have been reconciled.
- Check the views, their RLS/ownership semantics, underlying privileges and the 19A–19D SQL verification scripts. Confirm inactive/suspended/expired businesses are excluded from all public views, and no tenant private fields are returned.
- Enable `VITE_SANADAK_STOREFRONT_VIEWS_REQUIRED=true` and redeploy the frontend. Test the storefront, homepage, customer orders/bookings/reviews as anon, customer, merchant A, merchant B and admin.
- Simulate a missing/broken public view and confirm strict mode shows a failed read instead of retrying a private underlying table.
- After an independently reviewed rollback plan and explicit production approval, sequence the production rollout.

**Risk:** This frontend compatibility is not server-side data protection. Public data security ultimately depends on actual Supabase RLS, function grants, view privileges and tests on the authorized database. The full, unmerged Gate 19 PR must NOT be force-merged over newer frontend code.
