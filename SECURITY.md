# Security

## Posture in this sample

- **Authentication** — JWT bearer tokens (HS256), short-lived (`JWT_EXPIRES_IN`,
  default 8h). Passwords are hashed with bcrypt (configurable work factor).
- **Authorisation** — every endpoint is gated by the RBAC policy; workflow
  transitions are additionally gated by the pure workflow engine, including
  separation-of-duties constraints that the UI cannot bypass.
- **Input validation** — all request bodies and query parameters are validated
  with Zod; validation failures return a structured 400.
- **Transport & headers** — Helmet sets secure HTTP headers; CORS is restricted
  to the configured origin(s).
- **Logging** — structured logging via Pino, with `authorization` headers and
  any `password`/`passwordHash` fields redacted.
- **Audit** — a tamper-evident, hash-chained trail (see
  [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md)).
- **Least privilege** — a plain submitter can only see their own requests.

## Known limitations (by design, for a sample)

- Local user store and self-issued JWTs instead of an enterprise IdP with MFA.
- Secrets provided via environment variables rather than a managed vault.
- No rate limiting or account-lockout on the login endpoint.
- No refresh-token rotation or token revocation list.

These are the first items a production hardening pass would address; see
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Reporting

This is a demonstration repository. For a real engagement, security issues would
be reported through a private channel agreed with the client and handled under a
documented disclosure and remediation process.
