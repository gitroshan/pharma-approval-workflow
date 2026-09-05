# Secure Role-Based Approval Workflow

> Secure, role-based approval workflow for regulated pharma/healthcare — RBAC with separation of duties, a tamper-evident hash-chained audit trail, and API integration with internal platforms. TypeScript · React · PostgreSQL · Docker.

A reference implementation of a **secure, role-based approval workflow** for a
regulated (pharmaceutical / healthcare) environment. It demonstrates the
capabilities an enterprise workflow platform in this sector requires:
role-based access control with **separation of duties**, a multi-stage
review-and-approval lifecycle, a **tamper-evident audit trail**, and
**integration with existing internal platforms through new APIs**.

> This repository is a compact, self-contained sample built to illustrate
> architecture, engineering practices and delivery approach. It is deliberately
> readable end to end rather than feature-exhaustive.

---

## Why this repository exists

The scenario mirrors a common pharma requirement: a controlled item (an SOP, a
piece of promotional material, a batch record) must move through drafting,
independent review and a final authorised sign-off, with every step recorded in
a way that stands up to audit — and the application must plug into systems that
already exist inside the client's estate rather than replacing them.

The sample models exactly that, and keeps the business rules in a small, pure,
fully-tested core so the behaviour is easy to inspect and trust.

## What it demonstrates

| Capability the sector needs | Where it lives in this repo |
| --- | --- |
| Role-based access control (RBAC) | `backend/src/domain/rbac.ts` |
| Multi-stage workflow with separation of duties | `backend/src/domain/workflow.ts` |
| Tamper-evident, append-only audit trail | `backend/src/services/audit.ts` |
| Integration with internal platforms via new APIs | `backend/src/services/integrations/`, `mock-platforms/` |
| Cross-platform authority check on approval | `backend/src/services/requests.ts` |
| Secure API design (JWT, validation, security headers) | `backend/src/middleware/`, `backend/src/routes/` |
| Deployable to a client cloud environment | `docker-compose.yml`, `*/Dockerfile` |
| Automated tests of the critical logic | `backend/tests/` |
| Clear technical documentation | `README.md`, `ARCHITECTURE.md`, `docs/` |

## The workflow

```
DRAFT ──submit──▶ SUBMITTED ──start review──▶ IN_REVIEW ──recommend──▶ PENDING_APPROVAL ──approve──▶ APPROVED
  │                   │                            │                          │
  │                   └──withdraw──▶ DRAFT         ├──request changes─▶ CHANGES_REQUESTED ──resubmit──▶ SUBMITTED
  │                                                │                          │
  └──cancel──▶ CANCELLED                           │                          └──reject──▶ REJECTED
```

The person who authors a request can never review or approve it — reviewers and
approvers are always segregated from the owner. Final approval additionally
checks, against the external Identity platform, that the approver is authorised
for that category of item.

## Architecture at a glance

```
┌──────────────┐      ┌──────────────────────────────────────┐      ┌─────────────┐
│  Web (React) │─────▶│  API (Express + TypeScript)          │─────▶│ PostgreSQL  │
│  SPA / nginx │ HTTP │  ├─ auth (JWT)                        │      │ (Prisma)    │
└──────────────┘      │  ├─ RBAC + workflow (pure domain)     │      └─────────────┘
                      │  ├─ audit trail (hash-chained)        │
                      │  └─ integration adapters              │
                      └───────────────┬──────────────────────┘
                            new APIs   │
                        ┌──────────────┴───────────────┐
                        ▼                               ▼
                ┌───────────────┐             ┌──────────────────┐
                │ DMS (platform │             │ Identity /       │
                │ A, mock)      │             │ Authority (B)    │
                └───────────────┘             └──────────────────┘
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the reasoning behind these choices.

## Tech stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Zod, JWT, Helmet, Pino.
- **Frontend:** React, TypeScript, Vite.
- **Integrations:** adapter pattern over HTTP; two mock internal platforms.
- **Testing:** Vitest (unit tests of the workflow, RBAC and audit-hash logic).
- **Delivery:** Docker + Docker Compose; multi-stage images; health checks.

## Quick start (Docker — recommended)

Requires Docker and Docker Compose.

```bash
docker compose up --build
```

Then open **http://localhost:8080** and sign in with any demo account below
(password `Passw0rd!`):

| Account | Role | Can do |
| --- | --- | --- |
| `alice@demo.pharma` | Submitter | create, submit, resubmit, withdraw, cancel |
| `bob@demo.pharma` | Reviewer | start review, request changes, recommend approval |
| `carol@demo.pharma` | Approver | approve / reject (authorised via Identity platform) |
| `dave@demo.pharma` | Auditor | read everything + the audit trail |
| `admin@demo.pharma` | Admin | oversight + cancel override |

A good five-minute tour: sign in as **alice** and create then submit a request;
sign in as **bob** and move it through review; sign in as **carol** and approve
it; sign in as **dave** and open **Audit** to see the hash-chained trail and its
integrity check.

## Quick start (local, without Docker)

```bash
# 1. Start PostgreSQL and the two mock platforms however you prefer
#    (or just run `docker compose up db dms identity`).

# 2. Backend
cd backend
cp ../.env.example .env        # adjust DATABASE_URL if needed
npm install
npm run prisma:generate
npx prisma db push             # create the schema
npm run seed                   # demo users + sample data
npm run dev                    # API on http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                    # SPA on http://localhost:5173 (proxies /api)
```

## Running the tests

```bash
cd backend
npm install
npm test
```

The tests cover the parts where correctness matters most: every legal and
illegal workflow transition, separation-of-duties enforcement, the RBAC policy,
and the audit hash chain.

## Project structure

```
.
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── domain/         # PURE business rules (workflow, rbac, types)
│   │   ├── services/       # audit trail, requests orchestration, integrations
│   │   ├── middleware/     # auth, rbac, error handling
│   │   ├── routes/         # HTTP endpoints
│   │   └── seed.ts         # demo data
│   ├── prisma/schema.prisma
│   └── tests/              # vitest unit tests
├── frontend/               # React + Vite SPA
├── mock-platforms/         # two mock "internal platforms" (DMS, Identity)
├── docs/                   # API, compliance and deployment docs
└── docker-compose.yml      # one-command local stack
```

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — design decisions and rationale.
- [`docs/API.md`](./docs/API.md) — REST API reference.
- [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md) — how the design maps to GxP / 21 CFR Part 11 expectations.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — deploying into a client cloud environment.
- [`SECURITY.md`](./SECURITY.md) — security posture and hardening notes.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — local workflow and conventions.

## Scope and honesty about the sample

This is a demonstration codebase. It intentionally uses `prisma db push` and a
seed script for a frictionless first run; a production system would use
versioned migrations, an external identity provider, secrets from a managed
vault, and the client's real internal platforms in place of the mocks. Those
trade-offs are called out where they occur. The intent is to show how the team
thinks and builds, not to ship a finished product.

## License

MIT — see [`LICENSE`](./LICENSE).
