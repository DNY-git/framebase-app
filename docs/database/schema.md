# Database Schema

> The human-readable entity reference for ConstructTrack's data model. The authoritative source is `prisma/schema.prisma` (generated client + migrations); this document explains intent, relationships, and per-table decisions.

Companion docs: [../architecture/database.md](../architecture/database.md) (modeling philosophy), [migrations.md](./migrations.md), [security.md](./security.md), feature specs under [../features/](../features/).

> **Status note:** The model below is the *designed* schema, to be materialized in `prisma/schema.prisma` during Phase 1–2. Field-level specifics may evolve as features land; relationships and tenancy rules are stable.

---

## Table of Contents

- [Conventions](#conventions)
- [Tenancy Primitives](#tenancy-primitives)
- [Identity & Access](#identity--access)
- [Projects Domain](#projects-domain)
- [Tasks Domain](#tasks-domain)
- [Equipment Domain](#equipment-domain)
- [Inventory Domain](#inventory-domain)
- [Reports Domain](#reports-domain)
- [Notifications Domain](#notifications-domain)
- [Cross-Domain Tables](#cross-domain-tables)

---

## Conventions

- **Primary keys:** `id UUID` (or `cuid`), opaque and URL-safe.
- **Timestamps:** every table has `createdAt` and `updatedAt` (Prisma `@updatedAt`).
- **Tenant scope:** every tenant-scoped table has `tenantId UUID NOT NULL` referencing `tenant`, plus a covering composite index leading with `tenantId`.
- **Money/quantities:** integers in the smallest unit, or `Decimal` where exactness matters — never floats.
- **Enums:** Postgres enums for status/type fields (`TaskStatus`, `ProjectStatus`, `EquipmentStatus`).
- **Soft delete:** `deletedAt Timestamp?` only where history is required; documented per table.
- **Naming:** `snake_case` tables/columns in the database (e.g., `tenant_id`, `created_at`); join tables as `a_b` (`project_member`). **Note:** field names shown in the tables below use **Prisma model camelCase** (`tenantId`, `createdAt`) — Prisma maps these to `snake_case` columns automatically. When writing raw SQL or migrations, always use the database `snake_case` form.

---

## Tenancy Primitives

### `tenant`
The organization boundary. All tenant-scoped data hangs off this.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `name` | String | Display name |
| `slug` | String | Unique, URL-friendly identifier |
| `status` | Enum(`active`, `suspended`) | |
| `createdAt` / `updatedAt` | Timestamp | |

### `audit_log` (append-only, never deleted)
Durable history of every mutating operation, written inside the same transaction as the change it records.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `tenantId` | UUID | FK → tenant (indexed) |
| `actorId` | UUID? | FK → user; null for system actions |
| `action` | String | e.g., `task.create`, `inventory.adjust` |
| `entityType` | String | e.g., `task`, `equipment` |
| `entityId` | UUID | the affected record |
| `before` | Json? | state prior to change |
| `after` | Json? | state after change |
| `correlationId` | String | request/trace id |
| `createdAt` | Timestamp | |

---

## Identity & Access

### `user`
A person who can authenticate. Belongs to a tenant via `membership`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `email` | String | unique |
| `passwordHash` | String | bcrypt + pepper |
| `name` | String | |
| `status` | Enum(`active`, `disabled`) | |
| `lastLoginAt` | Timestamp? | |
| `createdAt` / `updatedAt` | Timestamp | |

### `membership` (join: user ↔ tenant ↔ role)
A user may belong to multiple tenants; the role is per-tenant.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `userId` | UUID | FK → user |
| `tenantId` | UUID | FK → tenant |
| `role` | Enum(`admin`, `manager`, `engineer`, `crew`, `viewer`) | per [security/authorization.md](../security/authorization.md) |
| `createdAt` / `updatedAt` | Timestamp | |
| unique | `(userId, tenantId)` | one role per user per tenant |

### `session` / `refresh_token`
Active sessions and refresh tokens; stored in/revoked via Redis with a DB mirror.

---

## Projects Domain

### `project`
| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `tenantId` | UUID | FK, indexed |
| `name`, `description`, `code` | String | `code` unique within tenant |
| `status` | Enum(`planning`, `active`, `on_hold`, `completed`, `archived`) | |
| `phase` | Enum | current phase |
| `startDate`, `endDate` | Date? | |
| `budgetCents` | Integer | budget in cents |
| `location` | String? | site address |
| `createdAt` / `updatedAt` | Timestamp | |

### `project_member` (join: project ↔ user)
Assigns users to a project with a project-level role.

### `phase` / `milestone`
Phases subdivide a project; milestones mark key dates. Both carry `projectId`, `tenantId`, ordering, and dates.

---

## Tasks Domain

### `task`
Hierarchical work breakdown. Self-referential for subtasks via `parentId`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `tenantId` | UUID | FK, indexed |
| `projectId` | UUID | FK → project |
| `phaseId` | UUID? | FK → phase |
| `parentId` | UUID? | self-FK → task (subtask) |
| `assigneeId` | UUID? | FK → membership |
| `title`, `description` | String | |
| `status` | Enum(`todo`, `in_progress`, `blocked`, `done`, `cancelled`) | |
| `priority` | Enum(`low`, `medium`, `high`, `critical`) | |
| `dueDate` | Date? | |
| `order` | Integer | ordering within parent |
| `createdAt` / `updatedAt` | Timestamp | |

### `task_dependency` (join: task → task)
Predecessor relationships. `(predecessorId, successorId)` unique; cycle detection enforced in the service.

---

## Equipment Domain

### `equipment`
| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `tenantId` | UUID | FK, indexed |
| `name`, `serialNumber`, `category` | String | `serialNumber` unique within tenant |
| `status` | Enum(`available`, `assigned`, `maintenance`, `retired`) | |
| `purchaseDate`, `purchaseCostCents` | | |
| `createdAt` / `updatedAt` | Timestamp | |

### `equipment_assignment`
Assigns equipment to a project with a date range and operator. Enforces no overlapping active assignment for the same equipment (via service check + constraint).

### `equipment_usage_log`
Hours/hours-meter readings per equipment per day; feeds utilization KPIs.

### `maintenance_record`
Scheduled and completed maintenance; `nextDueAt` drives alerts.

### `downtime_log`
Periods of unavailability with reason; feeds utilization and cost KPIs.

---

## Inventory Domain

### `material`
The catalog: a type of material/consumable.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `tenantId` | UUID | FK, indexed |
| `sku`, `name`, `unit` | String | `sku` unique within tenant |
| `reorderPoint` | Decimal | trigger threshold |
| `createdAt` / `updatedAt` | Timestamp | |

### `stock_level`
Current on-hand quantity per material (single row per material, updated transactionally).

### `inventory_transaction`
Append-only ledger of stock movements: `type` (`receive`, `consume`, `adjust`, `transfer`), `quantity`, `projectId?`, `taskId?`, `costCents?`, `note`, `createdAt`, `actorId`. The `stock_level` is the projection of this ledger.

### `delivery_receipt`
Records incoming deliveries against materials with supplier, quantity, and attachments.

---

## Reports Domain

### `report_template`
Defines a reusable report: type (`daily_log`, `weekly_summary`, `safety`, `custom`), parameters (`Json`), owner, schedule (`cron`).

### `report_run`
A materialized run of a template: `status` (`pending`, `running`, `succeeded`, `failed`), `generatedAt`, `format` (`pdf`, `csv`), storage reference, `idempotencyKey`. Produced by the `reports` queue.

---

## Notifications Domain

### `notification_subscription`
User preferences: which events and which channels (`in_app`, `email`, `push`).

### `notification`
An individual notification record: `userId`, `type`, `payload` (`Json`), `readAt`, `createdAt`. Delivery state for email/push tracked separately.

---

## Cross-Domain Tables

- **`attachment`** — polymorphic-ish file storage (`entityType`, `entityId`, `tenantId`, storage key, mime, size). Used by tasks, equipment, delivery receipts, reports.
- **`comment`** — `tenantId`, `entityType`, `entityId`, `authorId`, `body`, `createdAt`. Threaded comments on tasks, equipment, etc.
- **`tag` / `entity_tag`** — flexible labeling across entities, scoped to tenant.

---

*Relationships are enforced by foreign keys; tenant isolation by the row-level `tenantId` model described in [../architecture/database.md](../architecture/database.md) and [security.md](./security.md).*
