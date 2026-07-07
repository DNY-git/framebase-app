# Feature Spec: Tasks

> The Tasks domain is where work actually gets tracked: a hierarchical work breakdown structure, assignments, statuses, priorities, and dependencies. Tasks are the day-to-day heartbeat of a construction project and the data source for most dashboards and reports.

Companion docs: [projects.md](./projects.md), [../api/endpoints.md → Tasks](../api/endpoints.md#tasks), [../database/schema.md → Tasks Domain](../database/schema.md#tasks-domain), [../architecture/system.md](../architecture/system.md). Roadmap: Phase 2.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Work Breakdown Structure](#work-breakdown-structure)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Status & Priority](#status--priority)
- [Dependencies](#dependencies)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

A **Task** is a unit of work within a project. Tasks form a tree (project → phase → task → subtask) so a PM can model work at the level of "Pour foundation slab" down to "Order rebar." Tasks are assigned, tracked, and completed — and their status, dates, and assignments feed dashboards, reports, and the AI assistant.

Tasks are tenant- and project-scoped: every task belongs to exactly one project, and access follows project membership.

## User Stories

- **As a PM**, I break a project into phases and tasks so the team knows what to do and when.
- **As a site engineer**, I see today's tasks for my crew and update their status as work progresses.
- **As a field crew member**, I quickly mark a task done or blocked from my phone with minimal typing.
- **As a PM**, I set dependencies so "Pour slab" can't start until "Formwork" is done.
- **As a PM**, I see which tasks are overdue or at risk, surfaced on the dashboard and in reports.

## Work Breakdown Structure

Tasks are hierarchical via a self-referential `parentId`:

```
Project
└── Phase (optional container)
    └── Task  ("Structural work")
        ├── Subtask  ("Formwork")
        ├── Subtask  ("Rebar")
        └── Subtask  ("Pour slab")
            └── Sub-subtask ("Cure")
```

- Depth is intentionally **unbounded** but UI-warned beyond ~4 levels (deeper trees hurt scannability).
- A parent's progress/roll-up is computed from its children (sum/done counts) — cached, invalidated on child change.
- Moving a task (changing parent or phase) is supported and audit-logged.

## Data Model

See [../database/schema.md → Tasks Domain](../database/schema.md#tasks-domain).

- **`task`** — `id`, `tenantId`, `projectId`, `phaseId?`, `parentId?`, `assigneeId?`, `title`, `description`, `status`, `priority`, `dueDate?`, `order`.
- **`task_dependency`** — `predecessorId` → `successorId` (a task can't start until its predecessor is done).
- **`comment`** — threaded discussion on a task.

Indexes: `(tenantId, projectId)`, `(tenantId, assigneeId, status)` for "my tasks" queries, `(parentId)` for tree roll-ups.

## Permissions & Roles

| Role | View | Create/Edit | Assign | Delete |
| --- | --- | --- | --- | --- |
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `crew` | ✅ | own tasks (status, comment) | ❌ | own drafts |
| `engineer` | ✅ | ✅ | ✅ | ✅ |
| `manager`+ | ✅ | ✅ | ✅ | ✅ |

A `crew` member can update **status** and **comment** on tasks assigned to them, but not reassign or change scope. Authorization is checked in the service layer on every mutation, scoped to the task's `tenantId` and `projectId`.

## Status & Priority

**Status** (`TaskStatus`):

```
todo ──▶ in_progress ──▶ done
            │
            └──▶ blocked ──▶ in_progress (unblock)
todo/in_progress ──▶ cancelled
```

- `done`/`cancelled` are terminal; reopening (`done → in_progress`) is allowed but audit-logged.
- `blocked` requires a reason (comment or blocker field); feeds "open blockers" KPIs.

**Priority** (`TaskPriority`): `low`, `medium`, `high`, `critical`. Drives sort order and risk surfacing (overdue + high/critical = "at risk").

A task can't be advanced to `in_progress` while its parent project is `on_hold` (see [projects.md → Lifecycle](./projects.md#lifecycle--states)).

## Dependencies

`task_dependency` records predecessor relationships. Rules enforced by the service:

- **No cycles** — adding a dependency that would create a cycle returns `422 CYCLE_DETECTED`. Cycle detection runs on the dependency graph before insert.
- **No self-dependency.**
- A successor can't move to `in_progress` while any incomplete predecessor blocks it (soft warning by default; configurable to hard block).
- Completing a predecessor emits a `task.completed` event the notifications module can act on.

## API Surface

See [../api/endpoints.md → Tasks](../api/endpoints.md#tasks). Key flows:

- `GET /projects/:projectId/tasks?status=&assigneeId=&priority=` → list (paginated, filtered, sorted).
- `POST /projects/:projectId/tasks` → create (with optional `parentId` for subtasks).
- `PATCH /tasks/:id` → update status, assignee, dates, priority.
- `POST/DELETE /tasks/:id/dependencies/:predecessorId` → manage dependencies.
- `POST/GET /tasks/:id/comments` → threaded discussion.

## UI / UX

- **Task board** — Kanban columns by status, drag to advance (desktop/tablet); swipe actions on mobile.
- **Task list** — `ResourceTable` with filters (assignee, status, priority, due date), sortable; "My tasks" preset.
- **Task detail** — split-pane: list + detail; description, assignee, dates, dependencies, comments, activity timeline.
- **Quick status** — large touch targets for crew to mark done/blocked with one tap; status changes are optimistic with rollback.
- **Mobile-first:** the "my tasks today" view is the default landing for crew role; minimal typing, pickers over free text.

## Edge Cases & Rules

- **Assignee must be a project member** — assigning a task to a non-member returns `422`.
- **Reassigning** a task is audit-logged; the new assignee is notified.
- **Deleting a parent** offers to re-parent children or cascade (confirm dialog); cascade is audit-logged.
- **Dependencies across phases** are allowed; the graph is project-scoped.
- **Overdue** is computed from `dueDate < today AND status NOT IN (done, cancelled)`.
- **Tenancy:** all queries scoped by `tenantId`; cross-tenant access returns 404 and is tested.

## Non-Functional Requirements

- **Performance:** "my tasks" query < 300ms (p95); tree roll-ups served from cache.
- **Optimistic UI:** status changes feel instant; rollback on error with a clear toast.
- **Notifications:** assignment, due-soon, blocked, and dependency-completed events are emitted.
- **Audit:** status changes, reassignments, and dependency edits are audit-logged.

## Open Questions

- **Time tracking:** do we add estimated/actual hours per task for v1, or defer to a dedicated effort log? (Leaning defer — tasks track scope/status, not hours.)
- **Checklists:** subtasks vs. a lightweight per-task checklist — pick one model to avoid duplication. (Currently: subtasks.)
- **Recurring tasks:** out of scope for v1.
