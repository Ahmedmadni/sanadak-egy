# Gate 18C — Preview framing compatibility

Production responses keep `X-Frame-Options: DENY` to reduce clickjacking risk.

The header is intentionally omitted only when the request host belongs to the existing trusted preview host families already used by the Lovable preview authentication broker:

- `lovableproject.com`
- `lovableproject-dev.com`
- `lovable.app`
- `gpt-eng.com`
- `gptengineer.run`

This prevents the production hardening added in Gate 18A from breaking the project's existing framed preview workflow.

The exception is based on the request hostname, not on a user-controlled query parameter or request header. Production/custom domains therefore remain non-frameable by default.
