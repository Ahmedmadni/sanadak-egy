# Gate 11 — Release readiness

## Delivered in this gate

- A mandatory pull-request quality workflow runs TypeScript validation and the production build.
- Dependency installation is locked to `bun.lock`, so CI uses the same dependency graph as the project.
- The workflow has read-only repository permissions and cancels superseded runs for the same branch.

## Deliberately outside this gate

End-to-end tests that create orders, bookings, or reviews require an isolated Supabase project with disposable credentials. They must not be pointed at the live project from CI. Once that environment exists, add browser tests there as a separate gate.

## Local release check

Run:

```bash
bun run typecheck
bun run build
```
