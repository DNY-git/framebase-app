# Feature Spec: Audit Logging

> The Audit domain provides an immutable, append-only record of every stateful mutation across the platform. It is the compliance backbone — if it wasn't audited, it didn't happen.

Companion docs: [../database/schema.md → Tenancy Primitives](../database/schema.md#tenancy-primitives), [../security/data-protection.md](../security/data-protection.md), [../architecture/backend.md → Cross-Cutting Services](../architecture/backend.md#cross-cutting-services), [PROJECT_RULES.md §31](../../PROJECT_RULES.md#31-audit-rules). Roadmap: Phase 2 ([ROADMAP.md](../../ROADMAP.md)).

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [API Surface](#api-surface)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)

---

## Overview

Every mutating operation on tenant-scoped data writes an audit-log entry capturing who did what, to which entity, and the before/after state. Audit records are append-only — no updates, no deletes through the application. The audit system is global: any module can inject `AuditService` without importing `AuditModule` explicitly.

## User Stories

- **As an admin**, I can view the audit log filtered by entity type, action, or user to investigate changes.
- **As a project manager**, I can see the history of changes to a specific project or task.
- **As a compliance officer**, I can verify that all mutations are tracked and tamper-evident.
- **As a security analyst**, I can detect suspicious patterns (e.g., repeated failed logins, bulk deletions).

## Data Model

See [../database/schema.md → Tenancy Primitives](../database/schema.md#tenancy-primitives). Core entity:

### `audit_log` (append-only, never deleted)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | ObjectId | PK |
| `tenantId` | String | FK → tenant, indexed |
| `actorId` | String | FK → user; null for system actions |
| `action` | String | e.g., `user.registered`, `task.create`, `inventory.adjust` |
| `entityType` | String | e.g., `User`, `Task`, `Equipment`, `Material` |
| `entityId` | String | the affected record's ID |
| `before` | Object? | state prior to change (null on create) |
| `after` | Object? | state after change (null on delete) |
| `correlationId` | String | request ID for tracing |
| `createdAt` | Date | auto-generated timestamp |

Indexes: `{ tenantId: 1, createdAt: -1 }` (primary query path), `{ tenantId: 1, entityType: 1, entityId: 1 }` (entity history).

## Permissions & Roles

| Role | Access |
| --- | --- |
| `admin` | Full access to all audit logs |
| `project_manager` | Full access to all audit logs |
| `engineer` | No access (audit endpoint returns 403) |
| `crew` | No access |
| `viewer` | No access |

## API Surface

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/audit` | Admin, PM | List audit logs with pagination, filter by `entityType` and `action` |

Query parameters:
- `page` (default: 1)
- `perPage` (default: 20)
- `entityType` (optional) — filter by entity type (e.g., `Task`, `Equipment`)
- `action` (optional) — filter by action (e.g., `task.create`)

Response follows the standard paginated envelope:
```json
{
  "items": [...],
  "page": 1,
  "perPage": 20,
  "totalItems": 150,
  "totalPages": 8
}
```

## Edge Cases & Rules

- **Append-only** — audit records are never updated or deleted through the application.
- **Fire-and-forget** — a failed audit write must not break the user's operation. Errors are logged but not thrown.
- **Audit survives deletion** — when a business entity is deleted, its audit history remains.
- **Before/after snapshots** — captures the full state before and after the mutation for change tracking.
- **Correlation ID** — every audit entry includes the request's correlation ID for end-to-end tracing.
- **System actions** — `actorId` is null for automated/system-initiated actions (e.g., scheduled report generation).

## Non-Functional Requirements

- Audit writes are asynchronous (fire-and-forget) to avoid blocking user operations.
- The `audit_log` collection has a `{ tenantId: 1, createdAt: -1 }` index for efficient tenant-scoped queries.
- Audit records are tenant-scoped — a user never sees another tenant's audit history.
- The `AuditModule` is `@Global()` — any module can inject `AuditService` without explicit import.
- Future: hash-chaining or append-only storage for tamper-evidence (Phase 6+ hardening).
