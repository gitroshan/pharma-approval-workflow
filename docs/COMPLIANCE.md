# Compliance Notes (GxP / 21 CFR Part 11)

This sample is not a validated system, but it is built with the controls a
regulated pharmaceutical workflow is expected to demonstrate. This document maps
the design to the relevant expectations so a reviewer can see the intent, and is
explicit about what a real validated deployment would add.

## Mapping to 21 CFR Part 11 themes

| Expectation | How the sample addresses it | What production adds |
| --- | --- | --- |
| **Limiting access to authorised individuals** | JWT authentication; RBAC policy (`domain/rbac.ts`) gates every operation; resource-scoped reads. | Enterprise IdP (OIDC/SAML), SSO, MFA, periodic access review. |
| **Audit trail — secure, computer-generated, time-stamped** | Append-only, hash-chained `AuditEvent` log; timestamps on every event; the app never updates/deletes it. | Write-once storage (WORM) or DB-level append-only guarantees; retention policy. |
| **Audit trail records operator entries and actions** | Every create and every state transition records actor, action, from/to state and an optional comment. | Reason-for-change capture on defined actions; e-signature meaning. |
| **Ability to detect record alteration** | `verifyAuditChain()` recomputes the SHA-256 chain and reports the first broken link. | Periodic automated integrity jobs + alerting; external notarisation. |
| **Operational system checks — enforce sequencing of steps** | The workflow engine permits only legal transitions; sequencing is enforced server-side. | Formal requirements traceability and IQ/OQ/PQ evidence. |
| **Authority checks** | Role required per transition, **separation of duties** (author ≠ reviewer ≠ approver), and a cross-platform authority check on final approval. | Delegation rules, quorum/co-signing where required. |
| **Electronic signatures** | Approval captures actor identity, timestamp and the state change in the audit trail. | Signature manifestation (name, date/time, meaning) bound to the record per §11.50, and signature/record linking per §11.70. |

## Separation of duties

The pure workflow engine guarantees that the person who owns a request cannot
review or approve it, and that review and approval are distinct stages performed
by distinct roles. Because this is enforced in the domain layer rather than the
UI, it holds regardless of how the API is called.

## Data integrity (ALCOA+)

- **Attributable** — every event carries the acting user id.
- **Legible / Enduring** — events are structured rows retained in the database.
- **Contemporaneous** — events are written in the same transaction as the change.
- **Original / Accurate** — the hash chain makes any post-hoc edit detectable.

## Validation posture

A production deployment in this sector would be delivered under a documented SDLC
with requirements traceability, risk assessment, and IQ/OQ/PQ qualification,
plus data-retention, backup/restore and disaster-recovery procedures. This
repository shows the technical foundations those activities would build on; it
does not itself constitute validation evidence.
