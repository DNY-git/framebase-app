# Feature Spec: Projects

> The Projects domain is the container for everything ConstructTrack tracks — phases, tasks, equipment assignments, inventory allocations, reports. Every other domain hangs off a project. This is the spine.

Companion docs: [tasks.md](./tasks.md), [../api/endpoints.md → Projects](../api/endpoints.md#projects), [../database/schema.md → Projects Domain](../database/schema.md#projects-domain), [../architecture/system.md](../architecture/system.md). Roadmap: Phase 2 ([ROADMAP.md](../../ROADMAP.md)).

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Lifecycle & States](#lifecycle--states)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

A **Project** represents a real construction effort — a building, a road, a renovation — with a lifecycle from planning through completion and archival. A project owns its phases, milestones, members, and serves as the scope anchor for tasks, equipment, inventory, and reports.

The first user to register becomes the **first project's admin** in a new tenant; subsequent projects are created by managers/admins. Projects are tenant-scoped: a user never sees another tenant's projects.

## User Stories

- **As a PM**, I create a project with a code, name, budget, and schedule so the team has a shared container.
- **As a PM**, I break a project into phases and milestones to structure delivery and reporting.
- **As a site engineer**, I see the projects I'm a member of and drill into their current state.
- **As an executive**, I see a roll-up of all active projects from the dashboard.
- **As an admin**, I assign and reassign project-level roles to control who can edit vs. view.

## Data Model

See [../database/schema.md → Projects Domain](../database/schema.md#projects-domain). Core entities:

- **`project`** — `id`, `tenantId`, `code` (unique within tenant), `name`, `description`, `status`, `phase`, `startDate`, `endDate`, `budgetCents`, `location`.
- **`project_member`** — links a `membership` to a `project` with a project-scoped role.
- **`phase`** — a sub-division of a project (`name`, `order`, `startDate`, `endDate`).
- **`milestone`** — a key date/boundary within a project (`name`, `date`, `status`).

A project's `phase` field tracks its current phase; the `phase` table holds the full planned phase breakdown.

## Permissions & Roles

Project access is governed by the tenant-level role ([../security/authorization.md](../security/authorization.md)) **and** an optional project-level role:

| Role | Can view | Can edit | Can manage members | Can delete |
| --- | --- | --- | --- | --- |
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `crew` | ✅ | own tasks only | ❌ | ❌ |
| `engineer` | ✅ | ✅ | ❌ | ❌ |
| `manager` | ✅ | ✅ | ✅ | archive |
| `admin` | ✅ | ✅ | ✅ | ✅ (delete) |

Users who are **not** a member of a project cannot see it (404, not 403, to avoid leaking existence). Membership is verified in the service layer on every request, not just the controller ([PROJECT_RULES.md §5](../../PROJECT_RULES.md#5-backend-rules)).

## Lifecycle & States

Project `status` transitions:

```
planning ──▶ active ──▶ on_hold ──▶ active (resume)
                 │
                 └──▶ completed ──▶ archived
```

- **`planning`** — created but not yet started; limited field reporting.
- **`active`** — the normal working state; tasks, equipment, inventory flow freely.
- **`on_hold`** — paused; a reason is recorded; new work is blocked (tasks can't be set `in_progress`).
- **`completed`** — finished; becomes read-only except for reports/comments.
- **`archived`** — hidden from default lists; data retained for history/audit.

Transitions are validated — e.g., you cannot move `completed` back to `active` without a documented change-order reason (audit-logged).

## API Surface

See [../api/endpoints.md → Projects](../api/endpoints.md#projects) for the full route table. Key flows:

- `POST /projects` (manager+) → create.
- `GET /projects?status=active&...` → list (paginated, filtered, sorted per [../api/standards.md](../api/standards.md)).
- `GET /projects/:id` → detail (includes phase, milestone, and member summary).
- `PATCH /projects/:id` → update; status transitions validated.
- Member management: `GET/POST/PATCH/DELETE /projects/:id/members`.

## UI / UX

- **Projects list** — `ResourceTable` with columns (code, name, status, phase, progress, due), filterable by status; mobile collapses to cards.
- **Project detail** — tabbed: Overview, Tasks, Equipment, Inventory, Reports, Activity. Tabs render lazily.
- **Create/edit** — `Form` with validation; budget entered in currency, stored in cents; phase is a select.
- **Status changes** — destructive/terminal transitions (complete, archive) go through `ConfirmDialog`.
- Mobile-first: the detail page leads with the current phase and overdue/at-risk tasks.

## Edge Cases & Rules

- **Unique `code` within a tenant** — enforced by DB constraint; the API returns `409 CONFLICT` with `code: PROJECT_CODE_TAKEN`.
- **Soft delete** — projects use `status: archived`, not hard delete, to preserve history. Hard delete is admin-only and audit-logged.
- **Budget in cents** — never floats; the UI formats to currency.
- **Holding a project** blocks new task creation and task status advancement; an explanatory message is shown.
- **Membership changes** are audit-logged (actor, before/after role).
- **Tenancy:** every query is scoped by `tenantId`; cross-tenant access returns 404 and is covered by an isolation test.

## Non-Functional Requirements

- **Performance:** project list loads < 500ms (p95) for a tenant with 100 projects.
- **Caching:** the project detail's read-heavy aggregates (counts) are cache-friendly; invalidation on task/equipment changes via domain events.
- **Audit:** every mutation writes an audit record in the same transaction.
- **Accessibility:** the projects UI meets [../ui/accessibility.md](../ui/accessibility.md) AA.

## Open Questions

- **Templates:** should new projects be creatable from a phase/milestone template? (Likely yes — deferred to a post-v1 iteration.)
- **Change orders:** do we model formal change orders as first-class entities, or track them via comments + status transitions for v1? (Leaning toward the latter initially.)
- **Multi-site:** a single project spanning multiple physical sites — model via `location` string for v1, revisit if demand grows.
