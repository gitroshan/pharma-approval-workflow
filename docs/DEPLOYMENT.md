# Deployment

The sample is container-native so it can run unchanged locally and be promoted
into a client cloud environment.

## Local / demo

```bash
docker compose up --build
```

Brings up PostgreSQL, the two mock platforms, the API (which syncs the schema and
seeds demo data on start), and the web app on http://localhost:8080.

## Images

Both application images are multi-stage and run as the `node`/`nginx` runtime
only, keeping build tooling out of the final image.

- `backend/Dockerfile` — builds TypeScript, generates the Prisma client, and
  runs `docker-entrypoint.sh` (schema sync → seed → start).
- `frontend/Dockerfile` — builds the SPA and serves it via nginx, proxying
  `/api` to the API service.

## Promoting to a client cloud environment

The stack maps cleanly onto managed services:

| Compose service | Managed equivalent |
| --- | --- |
| `db` (PostgreSQL) | Managed PostgreSQL (e.g. RDS / Cloud SQL / Azure Database) |
| `api` | Container service (ECS/Fargate, Cloud Run, AKS/EKS, App Service) |
| `web` | Same container platform, or object storage + CDN for the static build |
| `dms`, `identity` | Replaced by the client's real internal platforms |

Recommended changes on the path to production:

1. **Migrations.** Replace `prisma db push` with versioned migrations
   (`prisma migrate deploy`) run as a pre-deploy job.
2. **Secrets.** Source `JWT_SECRET`, `DATABASE_URL` and integration API keys
   from the platform's secret manager rather than environment literals.
3. **Identity.** Front authentication with the client's IdP (OIDC/SAML + MFA).
4. **TLS & network.** Terminate TLS at the ingress; place the database and
   internal-platform calls on a private network.
5. **Observability.** Ship the structured (Pino) logs and add metrics/tracing;
   wire `/health` to the platform's liveness/readiness probes.
6. **Scaling.** The API is stateless (JWT), so it scales horizontally behind a
   load balancer.

## Configuration

All configuration is via environment variables, validated at startup
(`backend/src/config.ts`). See [`.env.example`](../.env.example) for the full
list. The process refuses to start on invalid configuration.
