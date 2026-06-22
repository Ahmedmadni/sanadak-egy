# Sanad → Multi-Tenant SaaS Marketplace

This is a 6–10 week scope. I'll deliver it in phases so you can review after each. Below is the architecture + phase plan. I'll start coding Phase 1 once you approve.

## 1. Architecture overview

```
Customers (web/mobile)
        │
        ▼
┌──────────────────────────────┐
│  Sanad Public Marketplace    │  browse / book / order / pay
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  Tenant API (RLS-scoped)     │
└──────────────────────────────┘
        │
   ┌────┴─────┬─────────────┐
   ▼          ▼             ▼
Business   AI Studio   Super Admin
Dashboard  (quotas)    Console
```

Multi-tenancy = row-level `tenant_id` on every business table, enforced by Supabase RLS. One Postgres, isolated per tenant via policies + `has_role(user, tenant, role)`.

## 2. Database (new tables, all RLS + GRANTs)

- `tenants` (business workspace: slug, category, status, plan_id, verified_at)
- `tenant_members` (user_id, tenant_id, role: owner/manager/staff)
- `branches` (tenant_id, name, address, hours)
- `staff` (branch_id, name, role, schedule)
- `catalog_items` (tenant_id, kind: product|service|package, name, price, variants jsonb, stock)
- `bookings` (tenant_id, customer_id, item_id, slot_start, slot_end, status)
- `orders` + `order_items` (tenant_id, customer_id, totals, delivery_type, status)
- `reviews` (tenant_id, customer_id, rating, body)
- `plans` (free/pro/premium: limits jsonb, price)
- `subscriptions` (tenant_id, plan_id, status, current_period_end)
- `ai_usage` (tenant_id, feature, tokens, cost, month)
- `support_tickets`, `audit_log`, `notifications`
- Extend `app_role` enum: super_admin, platform_admin, moderator, business_owner, store_manager, employee, customer

Keep current `stores` / `store_requests` as legacy; migrate into `tenants`.

## 3. Phase plan

**Phase 1 — Foundation (this approval)**
- DB migration: tenants, members, plans, subscriptions, extended roles, RLS + GRANTs
- Seed 3 plans (Free / Pro / Premium)
- Migrate existing `stores` rows → `tenants`
- New role helpers: `is_tenant_member(uid, tid, role)`, `tenant_has_feature(tid, key)`

**Phase 2 — Super Admin Console** (`/admin`)
Sidebar layout: Tenants · Requests · Users & Roles · Plans · Subscriptions · Revenue · AI Usage · Tickets · Moderation · Audit log

**Phase 3 — Business Dashboard** (`/business/$slug`)
Sidebar w/ dynamic modules by category:
- Common: Profile, Branches, Staff, Orders, Bookings, Reviews, Reports, Billing
- Restaurant: Menu + variants, delivery/pickup, kitchen view
- Clinic: Calendar, doctors, slots, queue
- Hall: Event calendar, packages, availability
- Salon: Staff scheduling, service booking
- Shop: Catalog, inventory, discounts, fulfillment

Feature loader reads `category` + plan limits → renders only allowed modules.

**Phase 4 — Subscription & Billing**
- Plan gating UI (locked features show upgrade CTA)
- Expiry → tenant `status=hidden`, public routes filter it out
- Owner notifications 7d / 1d / on-expiry
- (Payments: I'll recommend Paddle/Stripe and wire when you're ready)

**Phase 5 — AI Studio**
Inside business dashboard. Uses Lovable AI Gateway (no key needed):
- Background remove, upscale, enhance, AI product photo, AI bg
- Description / SEO / marketing / social copy generators
- Monthly quotas in `ai_usage`, enforced server-side per plan

**Phase 6 — Customer Marketplace redesign**
- Bigger hero: search bar + category chips + live stats + featured + popular
- Per-category pages (already exist) upgraded with live data from `tenants`
- Booking & order flows, payment, order tracking, favorites, reviews
- Bigger header w/ entry points: Admin · My Business · Login · Register Business

**Phase 7 — Mobile + API + Scale roadmap**
Document only (PWA-first, then RN; public API w/ tenant API keys; Redis cache; CDN; read replicas).

## 4. UI direction

Arabic-first RTL, soft glassmorphism over deep navy + ember/emerald accents (your existing tokens). Apple-minimal spacing, Stripe-dense data tables in dashboards, Airbnb-style cards in marketplace. Keep your current Logo + sound/motion system.

## 5. What I need from you before Phase 1

1. **Approve the DB migration** in Phase 1 (creates ~12 tables, extends roles, migrates `stores`→`tenants`). Existing data is preserved.
2. **Plan pricing** — should I seed placeholder prices (Free 0 / Pro 299 EGP/mo / Premium 799 EGP/mo) or your numbers?
3. **Payments** — defer to Phase 4, or enable Paddle/Stripe now so checkout is ready?
4. **AI quotas** — OK with: Free 0, Pro 100 ops/mo, Premium 1000 ops/mo?

Reply "go" with answers to 2–4 and I'll start Phase 1 (migration + role/plan foundation) immediately.
