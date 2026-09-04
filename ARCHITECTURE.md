# Architecture

This document explains the shape of the system and the reasoning behind the
main decisions. The guiding principle is that in a regulated environment the
rules that decide *who may do what, and when* must be small, explicit, and
independently verifiable.

## Layering

The backend is organised so that business rules do not depend on frameworks:

```
routes/         HTTP transport (Express). Thin: parse, authorise, delegate.
  └─ middleware/   authentication, permission checks, error mapping
services/       orchestration: transactions, audit writes, integrations
  └─ domain/       PURE rules — no Express, no Prisma, no I/O
```

The **domain layer** (`src/domain/`) contains only pure functions and data. It
has no imports from Express, Prisma, or the network. That is what makes the
workflow and RBAC rules exhaustively unit-testable and what keeps the single
source of truth for "what is allowed" in one place a reviewer can read in a
sitting.

The **services layer** composes those rules with persistence, the audit trail
and the external integrations, and owns transactional boundaries.

The **routes/middleware layer** is deliberately thin: authenticate the caller,
validate the payload (Zod), delegate to a service, and map errors to responses.

## The workflow engine

`domain/workflow.ts` is a declarative transition table. Each row states the
legal `(from-state, action) → to-state`, the role required, and the
separation-of-duties constraint. Nothing outside that table is a legal
transition, and a single function (`evaluateTransition`) is the only place a
transition is judged. Benefits:

- **Auditability** — the whole lifecycle policy is one readable array.
- **Testability** — the engine is pure, so tests can enumerate every state/action pair.
- **UI alignment** — the same function powers `availableActions`, so the UI can
  only ever offer actions the server will actually permit.

### Separation of duties

Reviewers and approvers are always segregated from the request owner: an author
cannot review or approve their own submission even if they also hold those
roles. Final approval is a second, independent stage from review, so no single
person carries an item from creation to sign-off. This is enforced in the pure
engine, not in the UI, so it cannot be bypassed by calling the API directly.

## Access control (RBAC)

`domain/rbac.ts` maps roles to a set of capabilities and unions them for a user
holding several roles. Resource-scoped reads (`canReadRequest`) additionally
restrict a plain submitter to their own requests while allowing oversight roles
(reviewer, approver, auditor, admin) to see everything. Keeping this as pure
policy — separate from the workflow engine — means the two concerns
(*may I see this?* vs *may I move this?*) stay independently testable.

## Audit trail

`services/audit.ts` implements an **append-only, hash-chained** log. Every
security- and lifecycle-relevant event is written with:

- the hash of the previous event, and
- a SHA-256 hash of its own canonical content.

Any later edit or deletion breaks the chain, and `verifyAuditChain()` recomputes
the whole chain to detect exactly where. The application never issues `UPDATE`
or `DELETE` against this table, and each state change plus its audit record are
written in a single database transaction so the trail can never drift out of
sync with the data it describes. This gives a tamper-evident record in the
spirit of GxP / 21 CFR Part 11 audit-trail expectations (see
[`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md)).

## Integration with internal platforms

The RFP scenario connects the app to two existing internal platforms via new
APIs. This is modelled with the **adapter pattern** (`services/integrations/`):
the application depends only on the `DmsAdapter` and `IdentityAdapter`
interfaces, never on how a platform is actually reached. The HTTP implementation
(`http.ts`) talks to the two mock services in `mock-platforms/`; swapping in a
client's real endpoint is a configuration and one-adapter change, with no impact
on business logic. The fetch helper adds timeouts and maps upstream failures to
a typed `IntegrationError` (surfaced as HTTP 502), so integration problems are
observable rather than silent.

Two integration touch-points are demonstrated:

1. **On create** — if a request references a DMS document, its existence is
   confirmed against the DMS platform.
2. **On approval** — the approver's authority for the item's category is
   confirmed against the Identity platform before the approval is allowed.

## Data model

See `backend/prisma/schema.prisma`. Three core entities: `User` (with an array
of roles), `Request` (the controlled item and its status), and `AuditEvent`
(the hash-chained trail). Enums mirror the domain types exactly.

## Security

JWT bearer authentication (short-lived tokens), bcrypt password hashing, Zod
validation on every input, Helmet security headers, CORS restricted to the
configured origin, and structured logging with credential redaction. See
[`SECURITY.md`](./SECURITY.md).

## Trade-offs made for a sample

- `prisma db push` + a seed script instead of versioned migrations, for a
  frictionless first run.
- A local JWT + user table instead of an external identity provider (OIDC/SAML),
  which a real deployment would use.
- Mock internal platforms instead of the client's real systems.
- The audit `prevHash` lookup is serialised per write; at very high write
  concurrency this would move to an append-only queue or a database sequence
  guard. Called out so the reasoning is visible.

These are conscious choices to keep the sample small and runnable while leaving
the production path obvious.
