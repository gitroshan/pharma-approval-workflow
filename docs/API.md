# API Reference

Base URL: `/api`. All responses are JSON. Authenticated endpoints require an
`Authorization: Bearer <token>` header obtained from `POST /api/auth/login`.

Errors use a consistent envelope:

```json
{ "error": { "code": "FORBIDDEN", "message": "…", "details": {} } }
```

| Status | Meaning |
| --- | --- |
| 400 | Validation error (see `details`) |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not permitted (RBAC or workflow rule) |
| 404 | Not found |
| 409 | Conflict |
| 502 | An external integration platform failed |

---

## Auth

### `POST /api/auth/login`
Body: `{ "email": string, "password": string }`

Response:
```json
{
  "token": "<jwt>",
  "user": { "id": "…", "email": "…", "fullName": "…", "roles": ["SUBMITTER"] }
}
```

### `GET /api/auth/me`
Returns the authenticated principal. Requires auth.

---

## Requests

### `POST /api/requests`  — create a draft
Permission: `request:create` (SUBMITTER).
Body:
```json
{
  "title": "string (3–200)",
  "description": "string",
  "category": "SOP | PROMOTIONAL_MATERIAL | BATCH_RECORD | …",
  "dmsDocumentId": "DOC-1001 (optional; validated against the DMS platform)"
}
```

### `GET /api/requests`  — list
Returns requests visible to the caller (own requests for a submitter; all
requests for oversight roles). Optional `?status=IN_REVIEW` filter.

### `GET /api/requests/:id`  — read one
Includes `availableActions` — the actions this caller may currently take, so the
UI renders only permitted controls.

### `POST /api/requests/:id/actions`  — drive the workflow
Body: `{ "action": WorkflowAction, "comment": "optional, recorded in audit" }`

`action` is one of:
`SUBMIT`, `WITHDRAW`, `START_REVIEW`, `REQUEST_CHANGES`, `RECOMMEND_APPROVAL`,
`RESUBMIT`, `APPROVE`, `REJECT`, `CANCEL`.

The transition is judged by the workflow engine. `APPROVE` additionally requires
that the Identity platform grants the caller approval authority for the request's
category, else `403`.

---

## Audit

Permission: `audit:read` (AUDITOR, ADMIN).

### `GET /api/audit`
Query: `requestId?`, `limit?` (1–200, default 50), `cursorSeq?` (pagination).
Returns audit events newest-first, each with `seq`, `action`, `fromStatus`,
`toStatus`, `actor`, `hash`, `prevHash`, `createdAt`.

### `GET /api/audit/verify`
Recomputes the hash chain and returns:
```json
{ "valid": true, "count": 42 }
```
or, if tampering is detected, `{ "valid": false, "count": 42, "brokenAtSeq": "17" }`.

---

## Integrations (proxied lookups)

Permission: `integration:read`.

### `GET /api/integrations/dms/documents/:id`
Fetches document metadata from the external DMS platform.

### `GET /api/integrations/identity/authorities/:email`
Fetches a person's approval authorities from the external Identity platform.

---

## Health

### `GET /health`
Unauthenticated liveness probe: `{ "status": "ok", "time": "…" }`.

---

## Example session (curl)

```bash
# Login as the author
TOKEN=$(curl -s localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"alice@demo.pharma","password":"Passw0rd!"}' | jq -r .token)

# Create and submit a request
RID=$(curl -s localhost:4000/api/requests -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title":"SOP-020 revision","description":"...","category":"SOP"}' | jq -r .id)

curl -s localhost:4000/api/requests/$RID/actions -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"action":"SUBMIT"}'
```
