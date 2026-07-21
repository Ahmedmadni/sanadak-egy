# سندك (Sanadak) — Project Instructions

Multi-tenant marketplace/SaaS platform (TanStack Start + React 19 + Tailwind + Supabase), Arabic-first RTL. Aggregates local businesses (restaurants, cafés, shops, clinics, wedding halls, salons, pharmacies, supermarkets...) with a self-service business dashboard, a Super Admin console, and a public marketplace.

## Stack

- **Framework**: TanStack Start (file-based routing in `src/routes`, regenerated into `src/routeTree.gen.ts` on `vite build` / `vite dev` — don't hand-edit that file)
- **Backend**: Supabase (Postgres + RLS, Storage, Edge Functions). Migrations live in `supabase/migrations`, Edge Functions in `supabase/functions`.
- **Styling**: Tailwind v4 + custom design tokens in `src/styles.css` (glassmorphism, `--emerald`/`--ember` accents, `font-arabic` for Arabic text)
- **State**: `SanadakProvider` (`src/lib/sanadak-context.tsx`) for cart/lang/theme; `useAuth` for session/admin state
- **Package manager**: `bun` is canonical (`bun.lock`); a local `npm install` may be needed in sandboxes without access to the private registry — never commit the resulting `package-lock.json` changes

## Working conventions

- New DB changes go in a timestamped `supabase/migrations/*.sql` file (`YYYYMMDDHHMMSS_<uuid>.sql`), never edit past migrations.
- New tables get RLS enabled with explicit policies — no table should be left open. Use the `private.has_role()` / `private.is_tenant_member()` helpers (security-definer, in the `private` schema) inside policies rather than reinventing role checks.
- Business-dashboard code lives in `src/components/business/`; category-specific behavior (which modules a business type gets — orders vs. bookings, stock vs. duration, etc.) is driven by `activity_types` (DB-backed, admin-editable) via `categoryConfig()` in `src/components/business/types.ts` — extend that config/table rather than hardcoding per-category branches elsewhere.
- Before finishing a change: `npx tsc --noEmit -p tsconfig.json` and `npx vite build` must both pass clean.
- Keep unrelated fixes on isolated branches/PRs from `main` rather than bundling them with in-progress feature branches, so urgent fixes can merge independently.

## Adopted skills

Two skills are adopted as standing conventions for this project (`.claude/skills/`):

- **`cinematic-spatial-editorial`** — the default visual/motion direction for any new or redesigned page, section, or component. Applies to the public marketplace, the business dashboard, and the admin console alike: visually simple, premium, motion with purpose (not decoration), strong hierarchy, no generic "AI website" clichés (glowing blobs, excessive glassmorphism, everything fading in independently). Read it before touching layout, animation, or new UI surfaces.
- **`model-orchestration`** — how to scope and sequence work efficiently: classify task complexity before diving in, prefer the smallest correct diff over rewrites, separate root-cause analysis from execution on complex/architectural work, and avoid re-deriving context that's already been established in the conversation.
