# Contributing

## Prerequisites

- Node.js 22+
- Docker + Docker Compose (for the full stack and PostgreSQL)

## Local development

```bash
# Full stack
docker compose up --build

# Backend only (needs a Postgres + the mock platforms running)
cd backend && npm install && npm run dev

# Frontend only
cd frontend && npm install && npm run dev
```

## Conventions

- **Business rules live in `backend/src/domain/` and stay pure** — no Express,
  Prisma or network imports there. If a rule can be expressed as a pure
  function, it belongs in the domain layer with a unit test.
- **Every workflow or RBAC change ships with a test.** The domain is where
  correctness matters most.
- **Validate at the edge.** All external input is parsed with Zod in the route
  layer before it reaches a service.
- **Type-only imports** use `import type` so the code is compatible with strict
  `isolatedModules` builds.

## Testing

```bash
cd backend
npm test          # run once
npm run test:watch
```

## Commit hygiene

Small, focused commits with imperative subjects (e.g. "Add resubmit transition").
Keep the domain tests green.
