# API Endpoints

> The route catalog for ConstructTrack's versioned REST API. Every endpoint listed here is documented with method, path, auth requirement, and a representative request/response. For request/response envelope shapes, see [standards.md](./standards.md); for auth mechanics, [authentication.md](./authentication.md).

Companion docs: [../architecture/backend.md](../architecture/backend.md), feature specs under [../features/](../features/), [../security/authorization.md](../security/authorization.md).

> **Status note:** Endpoints below are the *designed* API surface, to be implemented across [ROADMAP.md](../../ROADMAP.md) phases. Path/verb conventions are stable; field-level shapes may refine as features land. Each domain maps to its [feature spec](../features/) for behavior.

---

## Table of Contents

- [Conventions](#conventions)
- [Auth](#auth)
- [Organizations & Team](#organizations--team)
- [Invitations](#invitations)
- [Projects](#projects)
- [Tasks](#tasks)
- [Equipment](#equipment)
- [Inventory](#inventory)
- [Reports](#reports)
- [Dashboard](#dashboard)
- [Documents](#documents)
- [Notifications](#notifications)
- [AI Assistant](#ai-assistant)
- [Observability / Metrics](#observability--metrics)

---

## Conventions

- **Base path:** `/api/v1`. Bump the version on a breaking change.
- **Auth:** `Authorization: Bearer <access_token>` unless noted `Public`.
- **Standard params** on list endpoints: `page`, `pageSize`, `sort`, `search`, plus domain filters. See [standards.md → Pagination, Filtering, Sorting](./standards.md#pagination-filtering-sorting).
- **Status codes:** `200` OK, `201` Created, `204` No Content, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `422` Unprocessable Entity, `429` Too Many Requests, `500` Internal.
- All responses use the [standard envelope](./standards.md#response-envelope).

Legend: 🔒 authenticated · 🌐 public.

---

## Auth

See [authentication.md](./authentication.md) for full detail.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | 🌐 | Register a new user (creates initial tenant/membership; founder becomes `owner`) |
| `POST` | `/auth/login` | 🌐 | Obtain access + refresh token pair |
| `POST` | `/auth/refresh` | 🌐 | Rotate token pair |
| `POST` | `/auth/logout` | 🔒 | Revoke refresh token / end session |
| `POST` | `/auth/forgot-password` | 🌐 | Request a password reset email |
| `POST` | `/auth/reset-password` | 🌐 | Reset password with a token |
| `GET`  | `/auth/me` | 🔒 | Current user + membership/role |
| `PATCH` | `/auth/me` | 🔒 | Update profile (name) |
| `POST` | `/auth/me/avatar` | 🔒 | Upload avatar (`multipart`, field `avatar`, ≤2 MB, JPEG/PNG/WebP) |
| `DELETE` | `/auth/me/avatar` | 🔒 | Remove avatar |
| `GET` | `/auth/:userId/avatar` | 🌐 | Serve avatar image (ObjectId URLs unguessable; cacheable) |
| `GET`  | `/auth/sessions` | 🔒 | List active sessions |
| `DELETE` | `/auth/sessions/:id` | 🔒 | Revoke a specific session |

---

## Organizations & Team

Spec: [../features/organizations.md](../features/organizations.md). Tenancy model: an organization **is** a `Tenant`; membership is the `Membership` join entity. The server derives the active organization from the authenticated JWT + membership — a client-supplied `tenantId` is never trusted for authorization.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/organizations/me` | 🔒 | Active org context + full membership list (switcher data) |
| `POST` | `/organizations` | 🔒 | Create an organization (caller becomes `owner`, fresh token pair) |
| `POST` | `/organizations/switch` | 🔒 | Switch active org (server-verifies membership before re-issuing tokens) |
| `GET` | `/organizations/members` | 🔒 | List members (OWNER/ADMIN) |
| `GET` | `/organizations/directory` | 🔒 | Read-only member directory for project assignment (PROJECT_MANAGER+) |
| `PATCH` | `/organizations/members/:userId` | 🔒 | Change a member's role (OWNER/ADMIN; only OWNER grants OWNER) |
| `DELETE` | `/organizations/members/:userId` | 🔒 | Remove a member (OWNER/ADMIN; last owner/admin protected) |

**Example — switch organization**

```
POST /api/v1/organizations/switch
Authorization: Bearer <token>
Content-Type: application/json

{ "tenantId": "64f8c2d0e5a1b2c3d4e5f607" }

Response: 200 with a fresh `{ accessToken, refreshToken, user: { tenantId, role, ... } }` pair scoped to the target org. Switching to an org without a membership → `403 ORG_MEMBERSHIP_REQUIRED`.
```

---

## Invitations

Spec: [../features/organizations.md](../features/organizations.md). Invitations carry a cryptographically random 64-hex token, expire after 7 days, and can be `pending` / `accepted` / `revoked`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/organizations/invitations` | 🔒 | Invite a member by email + role (OWNER/ADMIN; OWNER role not invitable) |
| `GET` | `/organizations/invitations` | 🔒 | List invitations (OWNER/ADMIN) |
| `DELETE` | `/organizations/invitations/:id` | 🔒 | Revoke a pending invitation (OWNER/ADMIN) |
| `GET` | `/invitations/:token` | 🌐 | Resolve invitation info for the acceptance page (sanitized) |
| `POST` | `/invitations/:token/accept` | 🌐 | Accept an invitation (optional Bearer; new users pass `name` + `password`) |

**Accept rules:** an invitee who already has an account must be authenticated as the invited email; a new invitee creates their account inline. Success returns a token pair already scoped to the invited organization. Expired/revoked/already-accepted tokens are rejected (`410`/`409`).

---

## Projects

Spec: [../features/projects.md](../features/projects.md). Phase 2.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects` | 🔒 | List projects (paginated, filterable) |
| `POST` | `/projects` | 🔒 | Create a project (`manager`+) |
| `GET` | `/projects/:id` | 🔒 | Get a project |
| `GET` | `/projects/:id/activity` | 🔒 | List project activity (audit log) |
| `PATCH` | `/projects/:id` | 🔒 | Update a project |
| `DELETE` | `/projects/:id` | 🔒 | Archive/delete a project |
| `GET` | `/projects/:id/members` | 🔒 | List project members |
| `POST` | `/projects/:id/members` | 🔒 | Add a member (`manager`+) |
| `PATCH` | `/projects/:id/members/:userId` | 🔒 | Change a member's role |
| `DELETE` | `/projects/:id/members/:userId` | 🔒 | Remove a member |
| `GET` | `/projects/:id/phases` | 🔒 | List phases |
| `POST` | `/projects/:id/phases` | 🔒 | Create a phase |
| `GET` | `/projects/:id/milestones` | 🔒 | List milestones |

**Example — list projects**

```
GET /api/v1/projects?status=active&sort=-updatedAt&page=1&pageSize=20
Authorization: Bearer <token>
```

```json
{
  "data": [
    { "id": "uuid", "code": "RIV-01", "name": "Riverside Tower", "status": "active",
      "phase": "construction", "budgetCents": 1250000000, "updatedAt": "2026-07-01T..." }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 47 }
}
```

---

## Tasks

Spec: [../features/tasks.md](../features/tasks.md). Phase 2.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/tasks` | 🔒 | List tasks (filter by status, assignee, priority) |
| `POST` | `/projects/:projectId/tasks` | 🔒 | Create a task (supports `parentId` for subtasks) |
| `GET` | `/tasks/:id` | 🔒 | Get a task |
| `GET` | `/tasks/:id/activity` | 🔒 | List task activity (audit log) |
| `PATCH` | `/tasks/:id` | 🔒 | Update a task (status, assignee, dates…) |
| `DELETE` | `/tasks/:id` | 🔒 | Delete a task |
| `POST` | `/tasks/:id/dependencies` | 🔒 | Add a predecessor dependency |
| `DELETE` | `/tasks/:id/dependencies/:predecessorId` | 🔒 | Remove a dependency |
| `POST` | `/tasks/:id/comments` | 🔒 | Comment on a task |
| `GET` | `/tasks/:id/comments` | 🔒 | List comments |

| `POST` | `/:taskId/equipment-usage` | 🔒 | Record equipment usage against a task |
| `GET` | `/:taskId/equipment-usage` | 🔒 | List equipment usage for a task |
| `POST` | `/:taskId/material-consumption` | 🔒 | Record material consumption against a task |
| `GET` | `/:taskId/material-consumption` | 🔒 | List material consumption for a task |

**Example — create task**

```
POST /api/v1/projects/uuid/tasks
Content-Type: application/json

{
  "title": "Pour foundation slab",
  "description": "...",
  "assigneeId": "uuid",
  "priority": "high",
  "dueDate": "2026-08-15",
  "parentId": null
}

Response: `201 Created` with the created task in the envelope.

---

## Equipment

Spec: [../features/equipment.md](../features/equipment.md). Phase 3.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/equipment` | 🔒 | List equipment (filter by status, category) |
| `POST` | `/equipment` | 🔒 | Register equipment (`manager`+) |
| `GET` | `/equipment/:id` | 🔒 | Get equipment detail |
| `PATCH` | `/equipment/:id` | 🔒 | Update equipment |
| `POST` | `/equipment/:id/assignments` | 🔒 | Assign to a project (date range, operator) |
| `DELETE` | `/equipment/:id/assignments/:aid` | 🔒 | End an assignment |
| `POST` | `/equipment/:id/usage` | 🔒 | Log usage hours |
| `GET` | `/equipment/:id/maintenance` | 🔒 | List maintenance records |
| `POST` | `/equipment/:id/maintenance` | 🔒 | Schedule/record maintenance |
| `POST` | `/equipment/:id/downtime` | 🔒 | Log downtime |
| `GET` | `/equipment/:id/utilization?from=&to=` | 🔒 | Calculate usage, downtime, and utilization percentage for a date range |
| `GET` | `/equipment/maintenance/upcoming?days=30` | 🔒 | List overdue and upcoming fleet maintenance alerts |
| `GET` | `/equipment/:id/usage-timeline?from=&to=` | 🔒 | List paginated usage logs for a date range |
| `GET` | `/equipment/:id/maintenance-history` | 🔒 | List paginated maintenance history |
| `GET` | `/equipment/:id/downtime-history` | 🔒 | List paginated downtime history |

---

## Inventory

Spec: [../features/inventory.md](../features/inventory.md). Phase 3. Status: T-203 (catalog + stock) + T-204 (transactions + deliveries) implemented.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/materials` | 🔒 | List materials (catalog, with stock levels) |
| `POST` | `/materials` | 🔒 | Create a material (`manager`+) |
| `GET` | `/materials/low-stock` | 🔒 | Materials at/below reorder point |
| `GET` | `/materials/:id` | 🔒 | Get material detail with stock level |
| `PATCH` | `/materials/:id` | 🔒 | Update material (incl. reorder point) |
| `PATCH` | `/materials/:id/archive` | 🔒 | Archive a material (`manager`+) |
| `GET` | `/materials/:id/stock` | 🔒 | Current stock level |
| `GET` | `/materials/:id/transactions` | 🔒 | List transactions for a material |
| `POST` | `/inventory/transactions` | 🔒 | Record a movement (`receive`, `consume`, `adjust`, `transfer`) |
| `GET` | `/inventory/transactions` | 🔒 | Ledger (filter by material, project, type, date) |
| `POST` | `/deliveries` | 🔒 | Record a delivery receipt |
| `GET` | `/deliveries/:id` | 🔒 | Get a delivery receipt |

---

## Reports

Spec: [../features/reports.md](../features/reports.md). Status: T-301 implemented (sync generation).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/reports/templates` | 🔒 | List templates |
| `POST` | `/reports/templates` | 🔒 | Create a template (`manager`+) |
| `GET` | `/reports/templates/:id` | 🔒 | Get a template |
| `POST` | `/reports` | 🔒 | Generate a report run (returns run reference) |
| `GET` | `/reports` | 🔒 | List report runs (filter by templateId, status) |
| `GET` | `/reports/:id` | 🔒 | Get report run status + result |

**Example — generate report:**

```
POST /api/v1/reports
Content-Type: application/json

{ "templateId": "uuid", "params": { "projectId": "uuid", "from": "2026-06-01", "to": "2026-06-30" } }

Response: `201 Created` with `{ data: { id, status: "pending", ... } }`. Client polls `GET /reports/:id` until `status: "succeeded"`.

---

## Dashboard

Spec: [../features/dashboard.md](../features/dashboard.md). Phase 4.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/dashboard/overview` | 🔒 | Org-wide KPIs (active projects, overdue tasks, utilization, inventory health, open safety items) |
| `GET` | `/dashboard/projects/:id` | 🔒 | Single-project roll-up |
| `GET` | `/dashboard/equipment-utilization` | 🔒 | Utilization over a date range |
| `GET` | `/dashboard/inventory-health` | 🔒 | Stock health + reorder alerts |

Dashboard reads are cache-heavy (stale-while-revalidate); see [../architecture/system.md → Background Jobs](../architecture/system.md#background-jobs).

---

## Documents

Spec: [../features/documents.md](../features/documents.md). Phase 3.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/documents` | 🔒 | Upload a document (`multipart/form-data`, field `file`; optional `projectId`). Max 25 MB. Any role except `viewer` |
| `GET` | `/documents` | 🔒 | List documents (paginated; `projectId`, `search` filters) |
| `GET` | `/documents/:id` | 🔒 | Get a document record |
| `GET` | `/documents/:id/download` | 🔒 | Download the file (streamed, bypasses JSON envelope) |
| `DELETE` | `/documents/:id` | 🔒 | Delete a document (uploader or `admin` only) |

Files are stored content-addressed under `storage/uploads/<tenantId>`; see [../features/documents.md](../features/documents.md#storage) for the storage design.

---

## Notifications

Spec: [../features/notifications.md](../features/notifications.md). Phase 5.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/notifications` | 🔒 | List notifications (paginated; `unread=true` filter) |
| `POST` | `/notifications` | 🔒 | Create a notification (`manager`+) |
| `GET` | `/notifications/unread-count` | 🔒 | Count unread notifications |
| `PATCH` | `/notifications/:id/read` | 🔒 | Mark a notification as read |
| `PATCH` | `/notifications/read-all` | 🔒 | Mark all notifications as read |
| `GET` | `/notifications/subscriptions` | 🔒 | List user subscription preferences |
| `PUT` | `/notifications/subscriptions` | 🔒 | Bulk-upsert subscription preferences |

---

## AI Assistant

Spec: [../features/ai-assistant.md](../features/ai-assistant.md). Phase 5. Status: T-403/T-404 implemented with `NoneProvider` (graceful degradation when `AI_PROVIDER=none`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/ai/query` | 🔒 | Ask a natural-language question (sync) |
| `POST` | `/ai/summarize` | 🔒 | Start a summarization job (async) |
| `POST` | `/ai/draft-report` | 🔒 | Start a report draft job (async) |
| `GET` | `/ai/jobs` | 🔒 | List my AI jobs |
| `GET` | `/ai/jobs/:id` | 🔒 | Poll an async AI job |
| `POST` | `/ai/feedback` | 🔒 | Submit thumbs-up/down + comment on an answer |

AI requests are rate-limited and token-capped; see [../architecture/ai.md → Cost, Latency & Safety Bounds](../architecture/ai.md#cost-latency--safety-bounds).

---

## Observability / Metrics

Spec: [../features/observability.md](../features/observability.md). Phase 6. Status: T-501 implemented (in-memory metrics, no external deps).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/metrics` | 🌐 | Request metrics (count, errors, avg/max duration per endpoint) |

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | 🌐 | Health check (DB ping, metrics summary, version, uptime) |

*When you add or change an endpoint, update this catalog, the relevant feature spec, and [CHANGELOG.md](../../CHANGELOG.md) in the same PR ([PROJECT_RULES.md §7](../../PROJECT_RULES.md#7-api-rules)).*
