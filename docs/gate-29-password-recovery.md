# Gate 29 — Password recovery setup and smoke checklist

## Frontend routes

- `/auth`: sign in / register and **Forgot your password?**.
- `/forgot-password`: calls Supabase `resetPasswordForEmail` and always displays a neutral success message after Supabase accepts a request.
- `/reset-password`: handles standard Supabase PKCE/implicit recovery callbacks and explicitly calls `verifyOtp({type: 'recovery', token_hash})` for customized token-hash templates; requires an authenticated recovery session, validates a new passphrase (12–72 characters), calls `updateUser({ password })`, then signs out.

No email, password, token or provider secret is embedded in source code. The app does not send recovery emails itself.

## One-time Supabase Auth configuration (operator action)

1. Confirm the **correct Sanadak Supabase project**, not another connected project.
2. In **Authentication → URL Configuration**, register the exact HTTPS frontend URL under Redirect URLs:
   `https://YOUR_DEPLOYED_DOMAIN/reset-password`
3. Optionally add the staging domain with its corresponding `/reset-password` path.
4. Verify that the Supabase Auth email provider/template can deliver **Recovery** links to actual test inboxes. Confirm Supabase outbound-email rate limits.
5. Do not approve a domain you do not own. Do not add wildcards for unrelated domains.
6. Do not provide service-role keys to the browser. Frontend requests use the existing publishable Supabase client.

## Required manual smoke tests

- Request reset for a known user: receive an email, click link, reach `/reset-password`, update passphrase, then sign in with the **new** password.
- Request reset for an unknown email: UI does not reveal whether an account exists.
- Open `/reset-password` with no token: show invalid/expired link and a route back to `/forgot-password`.
- Open an expired/reused token and try to reset: no privileged update succeeds.
- Try mismatched, fewer than 12, and over 72 character new passwords.
- Confirm a recovery link generated on a staging deployment opens staging, not production.
- On desktop and phone, confirm that the reset link survives the OAuth/client proxy and session-code exchange.
- Verify an ordinary login still accepts older valid passwords (sign-up now recommends at least 12 characters).
- Verify password-reset links are not logged by application analytics. Supabase handles callback tokens and session exchange.

## Launch gating

Automated tests, lint, TypeScript and production builds do **not** prove email delivery, Auth Redirect URL allowlisting or real callback/session operation. Record a successful inbox-to-login smoke on the deployed environment before marking password recovery production-ready.


## Gate 30: recovery-session authorization regression

A normal signed-in session is **not** sufficient to change a password via the
`/reset-password` page. Reset UI is unlocked **only** by one of the following:

- Supabase's `PASSWORD_RECOVERY` auth event after a valid callback.
- Successful `verifyOtp({ type: 'recovery', token_hash })` with a returned session.

A `SIGNED_IN` or `INITIAL_SESSION` event, `getSession()` result or fake
`?code=...` URL must never grant recovery access. The current user ID must
still equal the recovered user when `updateUser({password})` is invoked.

Additional operator-only smoke checks:
1. Sign into account A, then visit `/reset-password?code=invalid`: verify the form stays locked.
2. Sign into account A, then visit `/reset-password?token_hash=invalid&type=recovery`: verify it stays locked.
3. With a valid reset email for account B, ensure only account B can be reset, even if account A was previously signed in.
4. Verify real Supabase recovery links using both the default and (if applicable) customized template. If the redirect event occurs before the route's subscription, the UI should fail closed and offer a fresh email, not use a generic session to bypass verification.

The browser-only checks cannot replace live Supabase Auth integration testing.
