# API Endpoints

> The route catalog for ConstructTrack's versioned REST API. Every endpoint listed here is documented with method, path, auth requirement, and a representative request/response. For request/response envelope shapes, see [standards.md](./standards.md); for auth mechanics, [authentication.md](./authentication.md).

Companion docs: [../architecture/backend.md](../architecture/backend.md), feature specs under [../features/](../features/), [../security/authorization.md](../security/authorization.md).

> **Status note:** Endpoints below are the *designed* API surface, to be implemented across [ROADMAP.md](../../ROADMAP.md) phases. Path/verb conventions are stable; field-level shapes may refine as features land. Each domain maps to its [feature spec](../features/) for behavior.

---

## Table of Contents

- [Conventions](#conventions)
- [Auth](#auth)
- [Projects](#projects)
- [Tasks](#tasks)
- [Equipment](#equipment)
- [Inventory](#inventory)
- [Reports](#reports)
- [Dashboard](#dashboard)
- [Notifications](#notifications)
- [AI Assistant](#ai-assistant)

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
| `POST` | `/auth/register` | 🌐 | Register a new user (creates initial tenant/membership) |
| `POST` | `/auth/login` | 🌐 | Obtain access + refresh token pair |
| `POST` | `/auth/refresh` | 🌐 | Rotate token pair |
| `POST` | `/auth/logout` | 🔒 | Revoke refresh token / end session |
| `POST` | `/auth/forgot-password` | 🌐 | Request a password reset email |
| `POST` | `/auth/reset-password` | 🌐 | Reset password with a token |
| `GET`  | `/auth/me` | 🔒 | Current user + membership/role |
| `GET`  | `/auth/sessions` | 🔒 | List active sessions |
| `DELETE` | `/auth/sessions/:id` | 🔒 | Revoke a specific session |

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
```

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

---

## Inventory

Spec: [../features/inventory.md](../features/inventory.md). Phase 3.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/materials` | 🔒 | List materials (catalog) |
| `POST` | `/materials` | 🔒 | Create a material (`manager`+) |
| `PATCH` | `/materials/:id` | 🔒 | Update material (incl. reorder point) |
| `GET` | `/materials/:id/stock` | 🔒 | Current stock level |
| `GET` | `/materials/low-stock` | 🔒 | Materials at/below reorder point |
| `POST` | `/inventory/transactions` | 🔒 | Record a movement (`receive`, `consume`, `adjust`, `transfer`) |
| `GET` | `/inventory/transactions` | 🔒 | Ledger (filter by material, project, type, date) |
| `POST` | `/deliveries` | 🔒 | Record a delivery receipt |
| `GET` | `/deliveries/:id` | 🔒 | Get a delivery receipt |

---

## Reports

Spec: [../features/reports.md](../features/reports.md). Phase 4.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/report-templates` | 🔒 | List templates |
| `POST` | `/report-templates` | 🔒 | Create a template (`manager`+) |
| `POST` | `/reports` | 🔒 | Generate a report run (async; returns job reference) |
| `GET` | `/reports/:id` | 🔒 | Get report run status + download link |
| `GET` | `/reports/:id/download` | 🔒 | Download generated artifact (PDF/CSV) |

**Example — generate report (async, idempotent):**

```
POST /api/v1/reports
Idempotency-Key: <uuid>
Content-Type: application/json

{ "templateId": "uuid", "params": { "projectId": "uuid", "from": "2026-06-01", "to": "2026-06-30" } }
```

Response: `202 Accepted` with `{ data: { id, status: "pending" } }`. Client polls `GET /reports/:id` until `status: "succeeded"`, then downloads.

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

## Notifications

Spec: [../features/notifications.md](../features/notifications.md). Phase 5.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/notifications` | 🔒 | List notifications (paginated; `unread=true` filter) |
| `POST` | `/notifications/read` | 🔒 | Mark notifications read (by id or all) |
| `GET` | `/notifications/subscriptions` | 🔒 | List user subscriptions |
| `PUT` | `/notifications/subscriptions` | 🔒 | Update subscriptions/preferences |

---

## AI Assistant

Spec: [../features/ai-assistant.md](../features/ai-assistant.md). Phase 5.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/ai/query` | 🔒 | Ask a natural-language question (grounded; sync for short, async for long) |
| `POST` | `/ai/summarize` | 🔒 | Generate a summary (project/week/etc.) — async |
| `POST` | `/ai/draft-report` | 🔒 | Draft a report from parameters — async |
| `GET` | `/ai/jobs/:id` | 🔒 | Poll an async AI job |
| `POST` | `/ai/feedback` | 🔒 | Submit thumbs-up/down + comment on an answer |

AI requests are rate-limited and token-capped; see [../architecture/ai.md → Cost, Latency & Safety Bounds](../architecture/ai.md#cost-latency--safety-bounds).

---

*When you add or change an endpoint, update this catalog, the relevant feature spec, and [CHANGELOG.md](../../CHANGELOG.md) in the same PR ([PROJECT_RULES.md §7](../../PROJECT_RULES.md#7-api-rules)).*
