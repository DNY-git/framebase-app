# TASKS.md — Task Board

> The live, Kanban-style view of what's happening on ConstructTrack. Updated as work progresses. For the *plan*, see [ROADMAP.md](./ROADMAP.md); for *continuity*, see [HANDOFF.md](./HANDOFF.md).

Status legend: `📋 Backlog` · `🔄 In Progress` · `👀 In Review` · `🚫 Blocked` · `✅ Completed` · `💡 Idea`

Each task carries an ID (`T-###`), an owner, and a phase from the roadmap. Branches/PRs reference the ID.

---

## Current Sprint — Phase 1 (Platform Skeleton) — ✅ COMPLETE

> Focus: **Scaffold the monorepo, wire MongoDB Atlas, establish CI, and verify the platform runs.**
> **Exit criteria met:** `npm run dev` starts API + web; health check reports DB status; typecheck/build/test all pass.

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-001 | Complete documentation foundation | ✅ Completed | Docs | All files in repo root + `docs/` + `.cline/` |
| T-002 | Internal consistency & broken-link review | ✅ Completed | Docs | Cross-references, terminology verified |
| T-003 | Human approval to begin implementation | ✅ Completed | Stakeholder | Approved; Phase 1 begins |
| T-004 | Scaffold monorepo (`apps/`, `packages/`) | ✅ Completed | Backend | npm workspaces; no Docker; see ADR-002 |
| T-005 | Shared TS/ESLint/Prettier config in `packages/config` | ✅ Completed | Backend | `strict: true` |
| T-006 | npm scripts + environment configuration (MongoDB Atlas) | ✅ Completed | DevOps | No Docker; `npm run dev` starts API + web |
| T-007 | Mongoose baseline schemas (tenancy primitives) + seed script | ✅ Completed | Backend | Repository interface pattern; see [ADR-002](./docs/decisions/ADR-002-database-and-infra.md) |
| T-008 | GitHub Actions CI (lint → type-check → test → build) | ✅ Completed | DevOps | [docs/deployment/ci-cd.md](./docs/deployment/ci-cd.md) |
| T-009 | Health check + structured logging + error envelope | ✅ Completed | Backend | [docs/api/standards.md](./docs/api/standards.md) |

---

## Current Sprint — Phase 2 (The Spine)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-101 | Auth: registration, login, refresh tokens | ✅ Completed | Backend | Auth spine: JWT pair, bcryptjs+pepper, session rotation, audit. 25 tests pass. |
| T-102 | Role & permission model implementation | ✅ Completed | Backend | RolesGuard + @Roles decorator implemented and tested. |
| T-103 | Tenant isolation enforcement + cross-tenant tests | ✅ Completed | Backend | Cross-tenant isolation tested at BaseRepository. |
| T-104 | Projects module (CRUD, phases, milestones, members) | ✅ Completed | Full-stack | [docs/features/projects.md](./docs/features/projects.md) |
| T-105 | Tasks module (WBS, assignment, status, dependencies) | ✅ Completed | Full-stack | [docs/features/tasks.md](./docs/features/tasks.md) |
| T-106 | Dashboard stub (project/task counts) | ✅ Completed | Full-stack | Full KPIs deferred to Phase 4 |
| T-107 | Audit log for all mutations | ✅ Completed | Backend | Project and Task mutations audited and fetchable via API. |

---

## Current Sprint — Phase 3 (Field Operations)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-201 | Equipment registry + assignment | ✅ Completed | Full-stack | [docs/features/equipment.md](./docs/features/equipment.md) |
| T-202 | Equipment utilization + maintenance schedule | ✅ Completed | Full-stack | Backend `EquipmentReportService` (utilization, maintenance alerts, history reads) + 5 API endpoints + `EquipmentDetail` frontend with KPI cards, maintenance timeline, usage timeline, downtime history. |
| T-203 | Inventory catalog + stock levels + reorder points | ✅ Completed | Full-stack | [docs/features/inventory.md](./docs/features/inventory.md). Material CRUD, stock levels, low-stock detection, MaterialList frontend, 18 service tests. |
| T-204 | Inventory transactions + delivery receipts | ✅ Completed | Full-stack | Append-only ledger with stock updates, delivery receipts, TransactionLedger + DeliveryForm frontend, 24 service tests. |
| T-205 | Link tasks ↔ equipment/material consumption | ✅ Completed | Full-stack | Equipment usage + material consumption tracking on tasks. 5 new service tests. TaskConsumption frontend component. |
| T-206 | Figma wireframe implementation (7 screens) | ✅ Completed | Frontend | All 7 wireframe screens implemented from `figma/img.json` + `figma/prompt.txt` (2026-08-06): Documents (new screen, own nav entry, `/documents` route, empty state — no backend yet), Equipment + Inventory as distinct real-data tables, Reports summary stat cards, AI assistant restyled to spec pill input bar. Constraint honored: no mock data, no fake endpoints. Typecheck/lint/build green. |

---

## Backlog — Phase 4 (Insight)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-301 | Report builder (templates, scheduling, export) | ✅ Completed | Full-stack | [docs/features/reports.md](./docs/features/reports.md). Report templates CRUD + report run creation. |
| T-302 | Dashboard KPIs (org-wide) | ✅ Completed | Full-stack | [docs/features/dashboard.md](./docs/features/dashboard.md). Equipment fleet + inventory health + maintenance alerts added to overview. |
| T-303 | Report generation via background jobs | ✅ Completed | Full-stack | Lightweight InMemoryJobQueue (synchronous, no Redis). IJobQueue interface for future BullMQ swap. 18 tests pass. |

---

## Completed — Phase 5 (Engagement)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-401 | Notification service (in-app, email, push) | ✅ Completed | Full-stack | [docs/features/notifications.md](./docs/features/notifications.md). Notification CRUD, mark-read, unread-count, inbox UI with badge. |
| T-402 | Notification subscriptions/preferences | ✅ Completed | Full-stack | Per-type channel preferences (in_app/email/push) with upsert API and UI toggles. |
| T-403 | AI Assistant MVP — Q&A over tenant data | ✅ Completed | Full-stack | [docs/features/ai-assistant.md](./docs/features/ai-assistant.md). Query, summarize, draft-report endpoints + chat UI. |
| T-404 | Provider-agnostic AI service abstraction | ✅ Completed | Backend | [docs/architecture/ai.md](./docs/architecture/ai.md). IAIProvider interface + NoneProvider default. |

---

## Completed — Phase 6 (Hardening)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-501 | Observability (metrics, tracing, alerting) | ✅ Completed | DevOps | Correlation IDs, structured logging, in-memory metrics, deep-ping health check. 11 tests. |
| T-502 | Error classification & standardized error codes | ✅ Completed | Full-stack | `ErrorCode` enum (40+ codes), `DomainException`, all 12 services refactored. 171 tests pass. |
| T-503 | API Rate Limiting | ✅ Completed | Full-stack | In-memory sliding-window rate limiter, per-route @RateLimit decorator, global guard with authenticated (100/min) / public (20/min) defaults. 12 tests. |
| T-504 | Backup & restore drill | ✅ Completed | DevOps | Full runbook, verification script, npm scripts, MongoDB Atlas doc updates. |

---

## Backlog — Phase 6 (Hardening)

*All Phase 6 hardening tasks are complete.*

---

## In Progress

*No tasks currently in progress.*

---

## Blocked

*No tasks currently blocked.*

---

## Completed

| ID | Task | Owner | Completed | Notes |
| --- | --- | --- | --- | --- |
| T-001 | Complete documentation foundation | Docs | 2026-07-03 | Root, `docs/`, `.cline/` created |
| T-002 | Documentation consistency & broken-link review | Docs | 2026-07-03 | Final pass before approval |
| T-003 | Human approval to begin implementation | Stakeholder | 2026-07-03 | Approved; Phase 1 begins |
| T-004 | Scaffold monorepo (`apps/`, `packages/`) | Backend | 2026-07-03 | npm workspaces; ADR-002 |
| T-005 | Shared TS/ESLint/Prettier config | Backend | 2026-07-03 | `packages/config` |
| T-006 | npm scripts + MongoDB Atlas config | DevOps | 2026-07-03 | No Docker; `npm run dev` |
| T-007 | Mongoose schemas + seed script | Backend | 2026-07-03 | Tenancy primitives + repository pattern |
| T-008 | GitHub Actions CI | DevOps | 2026-07-03 | lint → typecheck → test → build |
| T-009 | Health check + logging + error envelope | Backend | 2026-07-03 | Standard envelope per api/standards.md |
| T-101 | Auth: registration, login, refresh tokens | Backend | 2026-07-06 | JWT pair, bcryptjs+pepper, session rotation, reuse-theft detection, audit logging. 25 unit tests. |
| T-102 | Role & permission model implementation | Backend | 2026-07-07 | RolesGuard + @Roles decorator implemented and tested. |
| T-103 | Tenant isolation enforcement + cross-tenant tests | Backend | 2026-07-07 | Verified Mongoose BaseRepository automatic tenant scoping. |
| T-104 | Projects module (CRUD, phases, milestones, members) | Full-stack | 2026-07-07 | Implemented in backend. |
| T-105 | Tasks module (WBS, assignment, status, dependencies) | Full-stack | 2026-07-07 | Implemented DAG logic. |
| T-106 | Dashboard stub (project/task counts) | Full-stack | 2026-07-07 | Implemented dashboard stub. |
| T-107 | Audit log for all mutations | Backend | 2026-07-07 | Exposed project and task activity via API and verified mutation tracking. |
| T-201 | Equipment registry + assignment | Full-stack | 2026-07-07 | Basic Mongoose CRUD, assignments schema, minimal React stub. |
| T-202 | Equipment utilization + maintenance schedule | Full-stack | 2026-07-09 | Backend `EquipmentReportService` + 5 API endpoints + `EquipmentDetail` frontend with KPI cards, timelines. 116/116 tests pass. |
| T-301 | Report builder (templates, scheduling, export) | Full-stack | 2026-07-09 | Report templates CRUD + report run creation. |
| T-302 | Dashboard KPIs (org-wide) | Full-stack | 2026-07-09 | Equipment fleet + inventory health + maintenance alerts added to overview. |
| T-401 | Notification service + subscriptions | Full-stack | 2026-07-10 | 7 API endpoints, notification inbox UI, subscription preferences, 13 tests. |
| T-402 | Notification subscriptions/preferences | Full-stack | 2026-07-10 | Bundled with T-401. |
| T-403 | AI Assistant backend + frontend | Full-stack | 2026-07-10 | 6 API endpoints, IAIProvider abstraction, NoneProvider, chat UI, 8 tests. |
| T-404 | Provider-agnostic AI service abstraction | Backend | 2026-07-10 | Bundled with T-403. |
| T-501 | Observability (metrics, tracing, alerting) | DevOps | 2026-07-10 | Correlation IDs, structured logging, in-memory metrics, deep-ping health check, 11 tests. |
| T-502 | Error classification & standardized error codes | Full-stack | 2026-07-10 | `ErrorCode` enum (40+ codes), `DomainException`, all services refactored. 171 tests pass. |
| T-503 | API Rate Limiting | Full-stack | 2026-07-10 | In-memory sliding-window rate limiter, @RateLimit() decorator, global guard, 12 tests. |
| T-504 | Backup & restore drill | DevOps | 2026-07-10 | Runbook, verification script, npm scripts, production.md/security.md/ci-cd.md updated for MongoDB Atlas. |
| T-303 | Report generation via lightweight job queue | Full-stack | 2026-07-11 | InMemoryJobQueue (synchronous, no Redis), IJobQueue interface, ReportProcessor with abstract interfaces, 18 tests. |
| T-206 | Figma wireframe implementation (7 screens) | Frontend | 2026-08-06 | Documents screen + nav entry/route; Equipment + Inventory spec tables (real fields); Reports stat cards; AI assistant token restyle + spec input bar. No mock data / fake endpoints. |

---

## Ideas (not yet committed)

- 💡 Offline-first field capture (CRDT sync) — [BIBLE.md §19](./BIBLE.md#19-future-vision).
- 💡 IoT/telemetry ingestion for equipment hours & site sensors.
- 💡 OCR auto-population of daily logs & delivery receipts.
- 💡 Predictive schedule + budget-burn forecasting via AI.
- 💡 Native mobile apps (after responsive web proves out).
- 💡 Public report-template/workflow marketplace.
- 💡 In-app onboarding tour + interactive walkthroughs.
- 💡 Two-factor authentication (TOTP) and SSO (SAML/OIDC) for enterprise tenants.

---

*Board hygiene: move tasks between sections as they progress; close IDs only when [Definition of Done](./PROJECT_RULES.md#13-definition-of-done-checklist) is met. Never silently delete a task — move it to Ideas or close it with a note.*
