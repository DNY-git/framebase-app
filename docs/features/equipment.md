# Feature Spec: Equipment

> The Equipment domain manages a tenant's fleet: registry, project assignment, utilization hours, maintenance scheduling, and downtime. It answers "where is the excavator," "is the crane due for service," and "what's our utilization this month."

Companion docs: [inventory.md](./inventory.md), [../api/endpoints.md → Equipment](../api/endpoints.md#equipment), [../database/schema.md → Equipment Domain](../database/schema.md#equipment-domain). Roadmap: Phase 3.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Lifecycle & States](#lifecycle--states)
- [Utilization & Downtime](#utilization--downtime)
- [Maintenance](#maintenance)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

An **Equipment** record represents a physical machine or vehicle a tenant owns or leases — an excavator, a tower crane, a concrete mixer. The domain tracks its identity, where it's assigned, how much it's being used, when it needs maintenance, and when it's down. Equipment can be allocated to projects over date ranges, and its usage hours feed cost and utilization reporting.

Equipment is tenant-scoped. A machine belongs to exactly one tenant; assignments tie it to one project at a time (per asset).

## User Stories

- **As a fleet manager**, I maintain a registry of all equipment with serial numbers and costs so the fleet is accounted for.
- **As a PM**, I assign available equipment to my project's date range so it's reserved and visible to others.
- **As a site engineer**, I log daily usage hours so utilization and cost are accurate.
- **As a fleet manager**, I see upcoming maintenance and get alerted before it's overdue.
- **As a PM**, I see when assigned equipment goes down so I can reschedule dependent tasks.

## Data Model

See [../database/schema.md → Equipment Domain](../database/schema.md#equipment-domain).

- **`equipment`** — `id`, `tenantId`, `name`, `serialNumber` (unique within tenant), `category`, `status`, `purchaseDate`, `purchaseCostCents`.
- **`equipment_assignment`** — `equipmentId`, `projectId`, `operatorId?`, `startDate`, `endDate`.
- **`equipment_usage_log`** — per-day hours/meter readings.
- **`maintenance_record`** — scheduled/completed maintenance, `nextDueAt`.
- **`downtime_log`** — unavailability periods with reason.

Indexes: `(tenantId, status)`, `(tenantId, category)`, `equipment_assignment(equipmentId, active)`.

## Permissions & Roles

| Role | View | Assign/Log | Manage registry | Delete |
| --- | --- | --- | --- | --- |
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `crew` | assigned | own usage logs | ❌ | ❌ |
| `engineer` | ✅ | ✅ | ❌ | ❌ |
| `manager`+ | ✅ | ✅ | ✅ | ✅ (retire) |

Assignment and registry management are manager+; logging usage is broad (engineer + crew on assigned equipment). All mutations are tenant-scoped and audit-logged.

## Lifecycle & States

Equipment `status` (`EquipmentStatus`):

```
available ──assigned──▶ assigned ──released──▶ available
   │                       │
   ├──maintenance──────────┼──▶ maintenance ──▶ available
   │                       │
   └──retired              └──retired
```

- **`available`** — idle, ready to assign.
- **`assigned`** — currently on a project (active assignment).
- **`maintenance`** — out for service; cannot be assigned.
- **`retired`** — removed from the active fleet; retained for history.

Status is derived from assignments/downtime but stored for fast filtering; transitions are validated (can't assign equipment that's in maintenance or retired).

## Utilization & Downtime

- **Utilization** = logged usage hours ÷ available hours over a period. Computed from `equipment_usage_log` minus `downtime_log`.
- **Usage logging** is per-day per-equipment; the crew/engineer enters hours (or a meter reading that delta-computes hours).
- **Downtime** records periods the equipment was unavailable outside scheduled maintenance (breakdown, weather). Each has a reason and feeds cost reports.
- Aggregates power the dashboard's "equipment utilization" KPI and reports.

## Maintenance

- **`maintenance_record`** holds both scheduled and completed service: type, date, `nextDueAt`, cost, notes.
- **Scheduling:** maintenance can be time-based (`nextDueAt` = +90 days) or meter-based (next service at N hours); the upcoming-due query drives alerts.
- **Alerts:** equipment due for maintenance within a configurable window surfaces on the dashboard and notifies the fleet manager ([notifications.md](./notifications.md)).
- Going into maintenance sets status accordingly and blocks new assignments during the window.

## API Surface

See [../api/endpoints.md → Equipment](../api/endpoints.md#equipment). Key flows:

- `GET /equipment?status=&category=` → list (filterable, paginated).
- `POST /equipment` (manager+) → register.
- `POST /equipment/:id/assignments` → reserve for a project range; `DELETE` to release early.
- `POST /equipment/:id/usage` → log hours.
- `GET/POST /equipment/:id/maintenance` → view/schedule service.
- `POST /equipment/:id/downtime` → log downtime.
- `GET /equipment/:id/utilization`, `/equipment/:id/usage-timeline`, `/equipment/maintenance/upcoming` → utilization and maintenance reporting reads.

## UI / UX

- **Fleet list** — `ResourceTable` of equipment with status badge, current project, next-maintenance date; filter by status/category.
- **Equipment detail** — tabs: Overview, Assignments, Usage, Maintenance, Downtime.
- **Assignment calendar** — a timeline/Gantt-style view showing where each asset is allocated (desktop); stacked list on mobile.
- **Quick log** — large "log hours" action for field users; supports meter-reading or hours entry.
- Status uses semantic color + label + icon (never color alone) per the [design system](../ui/design-system.md).

## Edge Cases & Rules

- **No overlapping active assignments** for the same equipment — enforced by a service check + DB constraint on date ranges.
- **Serial number unique within tenant** — `409 CONFLICT` on duplicate.
- **Assignment during maintenance** is blocked with a clear error.
- **Releasing an assignment early** is audit-logged; usage logged up to the release date remains.
- **Retiring** equipment requires no active assignments; history is retained.
- **Tenancy:** all queries scoped by `tenantId`; cross-tenant access returns 404 and is tested.

## Non-Functional Requirements

- **Performance:** fleet list and utilization aggregates cache-friendly; utilization report < 1s (p95).
- **Notifications:** upcoming-maintenance, assignment-change, and downtime events emitted.
- **Audit:** assignments, releases, maintenance, and downtime edits audit-logged.

## Open Questions

- **Telemetry:** automated hour-meter ingestion (IoT) is a future direction ([BIBLE.md §19](../../BIBLE.md#19-future-vision)) — for v1, hours are entered manually.
- **External rentals:** do we model rented/leased equipment differently from owned? (Likely a flag on the record for v1.)
- **Cost rates:** per-hour cost rates for billing/recovery — defer until reports need them.
