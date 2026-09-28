# Gate 18B — Runtime production readiness

## Runtime readiness endpoint

`GET /api/health`

Expected responses:

- `200 {"status":"ok","service":"sanadak"}` when the public Supabase URL and publishable key are available to the runtime/build.
- `503 {"status":"not_ready","service":"sanadak"}` when required public Supabase configuration is missing.

The endpoint does not query Supabase and does not expose environment values. It is intended for deployment smoke checks and uptime/readiness monitors.

## Pre-deploy checklist

1. GitHub Quality gate is green on the release commit.
2. Required public Supabase variables are configured in the deployment environment.
3. Privileged keys, if any server-only workflow needs them, exist only in deployment secret storage and never in client-visible `VITE_*` variables.
4. All required database migrations for the release have been applied manually and their verification SQL has passed.
5. Confirm the target deployment points at the intended Supabase project before promoting traffic.

## Post-deploy smoke

1. Request `/api/health` and require HTTP 200.
2. Load the public home page and search/discovery.
3. Open one visible tenant storefront.
4. Confirm authentication sign-in/sign-out.
5. Smoke one transactional flow in a designated test tenant only:
   - order, or
   - booking.
6. Check browser console and server logs for new errors.
7. Verify security headers are present on HTTPS responses.

## Rollback triggers

Rollback the application release when any of these occur after deployment:

- `/api/health` returns 503 after environment configuration is confirmed.
- authentication fails broadly,
- public discovery or storefront rendering returns systemic 5xx responses,
- order/booking RPC calls fail across known-good fixtures,
- a migration verification reports a broken invariant.

Database rollback must be handled separately from application rollback. Do not reverse a production migration automatically unless an explicit rollback migration has been prepared and verified.
