# API Standards

> The rules every ConstructTrack endpoint follows: a consistent response envelope, predictable pagination/filtering/sorting, versioned paths, and uniform error handling. New endpoints must conform here; deviations require an [ADR](../decisions/).

Companion docs: [authentication.md](./authentication.md), [endpoints.md](./endpoints.md), [../architecture/backend.md](../architecture/backend.md), [PROJECT_RULES.md §7](../../PROJECT_RULES.md#7-api-rules).

---

## Table of Contents

- [Versioning](#versioning)
- [Response Envelope](#response-envelope)
- [Pagination, Filtering, Sorting](#pagination-filtering-sorting)
- [HTTP Status Codes](#http-status-codes)
- [Error Format](#error-format)
- [Idempotency](#idempotency)
- [Naming Conventions](#naming-conventions)
- [Request & Content Types](#request--content-types)
- [Headers & Correlation](#headers--correlation)
- [Rate Limiting & Quotas](#rate-limiting--quotas)

---

## Versioning

- **URI versioning:** all routes live under `/api/v1/...`.
- **Breaking changes** bump the major version (`/api/v2/...`), and the old version is supported for a documented deprecation window.
- **Non-breaking changes** (adding a field, an optional param, a new endpoint) require no version bump — clients must ignore unknown fields.
- A `Deprecation`/`Sunset` header signals the end of a version or endpoint.

---

## Response Envelope

Every response — success or error — uses the same top-level shape so the frontend has one parsing path.

### Success (single resource)

```json
{
  "data": { "id": "uuid", "name": "Riverside Tower", "status": "active" }
}
```

### Success (collection)

```json
{
  "data": [ { "id": "uuid", "..." }, { "..." } ],
  "meta": { "page": 1, "pageSize": 20, "total": 47 }
}
```

### Success (no content)

`204 No Content` — empty body (used for deletes and idempotent clears).

### Accepted (async)

```json
{ "data": { "id": "uuid", "status": "pending" } }
```

Returned with `202 Accepted` for async operations (report generation, AI jobs); the client polls the resource or a job endpoint.

---

## Pagination, Filtering, Sorting

Uniform query parameters on every list endpoint:

| Param | Example | Meaning |
| --- | --- | --- |
| `page` | `page=2` | 1-indexed page number |
| `pageSize` | `pageSize=50` | Items per page (capped, default 20, max 100) |
| `sort` | `sort=-updatedAt,name` | Comma-separated fields; `-` prefix = descending |
| `search` | `search=foundation` | Free-text search over the resource's searchable fields |
| `<field>` | `status=active` | Equality filter on an indexed field |
| `<field>__lt/gt/...` | `dueDate__lt=2026-08-01` | Range filters for date/numeric fields |

- `meta.total` is the count before pagination; for very large tables we may switch to cursor pagination and drop `total` (documented per endpoint).
- Filterable/sortable fields are explicitly allow-listed per endpoint (untrusted input is never passed straight to the DB).

---

## HTTP Status Codes

| Code | Used for |
| --- | --- |
| `200 OK` | Successful read or update |
| `201 Created` | Resource created |
| `202 Accepted` | Async job accepted |
| `204 No Content` | Delete / empty success |
| `400 Bad Request` | Malformed request / failed validation |
| `401 Unauthorized` | Missing/invalid token |
| `403 Forbidden` | Authenticated but not permitted (role/tenant/ownership) |
| `404 Not Found` | Resource doesn't exist or is outside the caller's tenant (same shape to avoid leaking existence) |
| `409 Conflict` | Duplicate or state conflict (e.g., unique violation) |
| `422 Unprocessable Entity` | Semantically invalid (e.g., cycle in task dependencies) |
| `429 Too Many Requests` | Rate limited |
| `500 Internal Server Error` | Unexpected failure (logged; correlation id returned) |
| `503 Service Unavailable` | Dependency down / maintenance |

---

## Error Format

Errors share the envelope so the frontend parses them uniformly. Every error has a stable `code`, a human-readable `message`, optional field-level `details`, and a `correlationId` for support.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request was invalid.",
    "details": [
      { "field": "email", "message": "Email is required." },
      { "field": "password", "message": "Password must be at least 8 characters." }
    ],
    "correlationId": "req_01H..."
  }
}
```

- **`code`** is a `SCREAMING_SNAKE` machine-readable identifier (e.g., `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `CYCLE_DETECTED`). The frontend switches on `code`, not `message`.
- **`message`** is safe to display to end users.
- **`details`** is present for field-level errors, enabling inline form feedback.
- **Unexpected errors** (5xx) return `code: "INTERNAL_ERROR"` with a `correlationId`; the stack trace stays server-side.

---

## Idempotency

Unsafe operations that clients may retry accept an **`Idempotency-Key`** header (a client-generated UUID). The server caches the first response for that key+request and replays it on retries, preventing duplicate side effects.

- Required on: async job creation (`POST /reports`, `/ai/*`).
- Recommended on: any create where a double-submit is possible.
- Keys are scoped to the user and endpoint, TTL ~24h, stored in Redis.

---

## Naming Conventions

- **Paths:** `kebab-case` segments (`/report-templates`, `/equipment/:id/assignments`).
- **JSON keys:** `camelCase` (`budgetCents`, `dueDate`, `createdAt`) — matches TypeScript conventions and the shared types in `packages/types`.
- **IDs:** UUID strings (`"id": "01H..."`).
- **Dates:** ISO 8601 UTC strings (`"2026-07-03T14:30:00.000Z"`); date-only fields use `"YYYY-MM-DD"`.
- **Money:** integer cents (`budgetCents: 1250000000`) — never floats.
- **Enums:** lowercase string values (`"status": "active"`, `"priority": "high"`).

---

## Request & Content Types

- **Request body:** `Content-Type: application/json`.
- **Response body:** `Content-Type: application/json` (except file downloads, which return the artifact's content type with `Content-Disposition`).
- **Multipart uploads** (`POST /attachments`) use `multipart/form-data`.
- **Encoding:** UTF-8 throughout.

---

## Headers & Correlation

Every response includes:

- `X-Request-Id` / `correlationId` — the id to quote in support tickets; logged with the request.
- `RateLimit-*` headers on rate-limited routes (per [Rate Limiting](#rate-limiting--quotas)).
- Standard security headers added by Nginx (`Strict-Transport-Security`, `X-Content-Type-Options`, etc.) — see [../security/data-protection.md](../security/data-protection.md).

---

## Rate Limiting & Quotas

- Rate limiting is per-IP + per-user, backed by Redis sliding-window counters.
- Limits are documented per endpoint group (auth limits in [authentication.md](./authentication.md#rate-limiting); AI limits in [../architecture/ai.md](../architecture/ai.md#cost-latency--safety-bounds)).
- When limited, the response is `429 Too Many Requests` with `Retry-After` and `RateLimit-Reset` headers.
- Beyond rate limits, the AI module enforces per-tenant **cost/token quotas** tracked server-side.

---

*Consistency is the API's most valuable feature. A frontend developer (or AI) should learn the conventions once and apply them to every endpoint without surprise.*
