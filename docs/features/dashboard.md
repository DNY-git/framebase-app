# Feature Spec: Dashboard

> The Dashboard is the at-a-glance view of a tenant's construction world: roll-up KPIs across projects, tasks, equipment, inventory, and safety. It's the executive's landing page and the PM's first look each morning. It reads across all domains; it owns none.

Companion docs: [../api/endpoints.md → Dashboard](../api/endpoints.md#dashboard), [../architecture/system.md → Caching Boundary](../architecture/system.md#cross-cutting-concerns), [reports.md](./reports.md). Roadmap: Phase 4 (stub in Phase 2).

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [KPIs & Widgets](#kpis--widgets)
- [Permissions & Scoping](#permissions--scoping)
- [Data Aggregation & Caching](#data-aggregation--caching)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

The Dashboard aggregates data produced by the other domains into a single, fast, role-aware view. It exists to surface **what needs attention now** — overdues, low stock, upcoming maintenance, safety items — and to give executives and PMs a trustworthy roll-up without making them open individual projects.

A minimal stub (project/task counts) ships in Phase 2 to validate the plumbing; full KPIs land in Phase 4 once equipment, inventory, and reports exist.

## User Stories

- **As an executive**, I open the app and immediately see the health of all projects without drilling in.
- **As a PM**, my morning view highlights what's overdue or at risk across my projects.
- **As a fleet manager**, I see utilization and upcoming maintenance at a glance.
- **As an inventory manager**, I see how many materials are low and need reordering.
- **As any user**, I can click a KPI to drill into the underlying list.

## KPIs & Widgets

| Widget | Metric | Source domain | Drill-down |
| --- | --- | --- | --- |
| **Projects overview** | active / on-hold / completing-soon counts | projects | project list filtered |
| **Tasks at risk** | overdue + high/critical count | tasks | task list filtered |
| **My tasks today** | assigned-to-me, due today/incoming | tasks | my-tasks view |
| **Equipment utilization** | avg utilization %, units in maintenance | equipment | equipment list |
| **Upcoming maintenance** | count due within N days | equipment | maintenance schedule |
| **Inventory health** | low-stock material count, total value | inventory | low-stock board |
| **Open safety items** | count of unresolved safety observations | tasks/reports | safety report list |
| **Recent activity** | latest audit events (creates/updates) | audit | activity timeline |
| **Project activity heatmap** | daily audit-event counts (last 16 weeks) | audit | activity timeline |

Widgets are composable; the layout adapts by role (an exec sees roll-ups; a crew member sees "my tasks today" prominently).

## Permissions & Scoping

- The dashboard is **always tenant-scoped** — a user sees only their tenant's aggregates.
- Within a tenant, the view is **role-aware**: crew members see personal task widgets; managers/admins see org-wide KPIs; fleet/inventory widgets are visible to relevant roles.
- "My" widgets are scoped to the caller's `userId`; org widgets aggregate across the tenant.

Authorization for drill-downs follows each source domain's rules (e.g., a crew member drilling into "tasks at risk" sees only tasks they can access).

## Data Aggregation & Caching

Dashboard aggregates are the platform's hottest reads, so they're **cache-heavy**:

- **Stale-while-revalidate:** widgets are served from Redis cache; a background refresh updates them on a short TTL or on domain events.
- **Materialized views** for expensive aggregates (utilization over time, inventory valuation) — refreshed on a schedule and on write events.
- **Event-driven invalidation:** a `task.completed` or `inventory.below-reorder` event invalidates the relevant widget's cache entry, keeping data fresh without heavy polling.
- **Cache is disposable:** the dashboard degrades to live (slower) queries if Redis is unavailable — never wrong, just slower.

## API Surface

See [../api/endpoints.md → Dashboard](../api/endpoints.md#dashboard).

- `GET /dashboard/overview` → the full widget set for the caller's role.
- `GET /dashboard/projects/:id` → a single-project roll-up.
- `GET /dashboard/equipment-utilization?from=&to=` → utilization series.
- `GET /dashboard/inventory-health` → low-stock + valuation.

Responses follow the [standard envelope](../api/standards.md); widgets are independently cacheable.

## UI / UX

- **Responsive grid** of `StatCard`s and small charts; reflows to a single column on mobile.
- **Charts use the Bklit UI chart components** (`@bklitui/ui/charts`): the "Spending vs Budget" area chart is `AreaChart` (grey `Budget` / blue `Spent`), and the "Project Activity" calendar is `HeatmapChart` (5-step grey scale). Both are rendered in a neutral grey/blue palette to match the rest of the UI.
- **Role-aware default layout** — crew lands on "my tasks today"; managers on the org overview.
- **Drill-down** — every KPI is a link to the filtered list/board in its domain.
- **Time-range selectors** where relevant (utilization, activity) defaulting to a sensible window.
- **Loading skeletons** (not spinners) while widgets resolve; widgets load independently so one slow widget doesn't block the page.
- Meets [accessibility.md](../ui/accessibility.md) AA — charts have text/table alternatives; numbers have labels.

## Edge Cases & Rules

- **Empty tenant** — a new tenant with no projects shows actionable empty states ("Create your first project"), not zeros with no context.
- **Permissions vs. counts** — an org-wide count never leaks the existence of a project a user can't see (the count is computed over what they can see, or is gated by role).
- **Stale data affordance** — widgets show a "last updated" timestamp so users trust the freshness.
- **Large tenants** — aggregates must remain fast at 100+ projects and 10k+ tasks (caching + materialized views).

## Non-Functional Requirements

- **Performance:** overview loads < 2s (p95) for a 100-project tenant ([ROADMAP.md](../../ROADMAP.md) Phase 6 target).
- **Freshness:** widget data at most N minutes stale (configurable per widget); event-driven invalidation for critical changes.
- **Resilience:** a failing source domain degrades its widget gracefully (error card) rather than failing the whole dashboard.

## Open Questions

- **Customization:** do we let users pin/reorder widgets, or keep a fixed role-based layout for v1? (Leaning fixed for v1, customizable later.)
- **Trend charts:** how much chart richness in v1 vs. relying on [reports.md](./reports.md) for deep analysis?
- **Per-project dashboard vs. project detail tab** — likely a dedicated `/projects/:id` dashboard tab to avoid duplication.
