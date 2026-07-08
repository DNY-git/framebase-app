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

## Backlog — Phase 3 (Field Operations)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-201 | Equipment registry + assignment | ✅ Completed | Full-stack | [docs/features/equipment.md](./docs/features/equipment.md) |
| T-202 | Equipment utilization + maintenance schedule | 📋 Backlog | Full-stack | |
| T-203 | Inventory catalog + stock levels + reorder points | 📋 Backlog | Full-stack | [docs/features/inventory.md](./docs/features/inventory.md) |
| T-204 | Inventory allocations to projects + delivery receipts | 📋 Backlog | Full-stack | |
| T-205 | Link tasks ↔ equipment/material consumption | 📋 Backlog | Full-stack | |

---

## Backlog — Phase 4 (Insight)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-301 | Report builder (templates, scheduling, export) | 📋 Backlog | Full-stack | [docs/features/reports.md](./docs/features/reports.md) |
| T-302 | Dashboard KPIs (org-wide) | 📋 Backlog | Full-stack | [docs/features/dashboard.md](./docs/features/dashboard.md) |
| T-303 | Report generation via BullMQ jobs | 📋 Backlog | Backend | Idempotency keys required |

---

## Backlog — Phase 5 (Engagement)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-401 | Notification service (in-app, email, push) | 📋 Backlog | Full-stack | [docs/features/notifications.md](./docs/features/notifications.md) |
| T-402 | Notification subscriptions/preferences | 📋 Backlog | Full-stack | |
| T-403 | AI Assistant MVP — Q&A over tenant data | 📋 Backlog | Full-stack | [docs/features/ai-assistant.md](./docs/features/ai-assistant.md) |
| T-404 | Provider-agnostic AI service abstraction | 📋 Backlog | Backend | [docs/architecture/ai.md](./docs/architecture/ai.md) |

---

## Backlog — Phase 6 (Hardening)

| ID | Task | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| T-501 | Observability (metrics, tracing, alerting) | 📋 Backlog | DevOps | |
| T-502 | Performance pass + load testing | 📋 Backlog | Full-stack | Dashboard p95 < 2s |
| T-503 | Security pen-test + remediation | 📋 Backlog | Security | [docs/security/](./docs/security/) |
| T-504 | Backup & restore drill | 📋 Backlog | DevOps | |

---

## In Progress

| ID | Task | Owner | Started | Notes |
| --- | --- | --- | --- | --- |
| — | *No tasks in progress — Phase 1 complete, Phase 2 not yet started* | — | — | — |

---

## Blocked

| ID | Task | Blocked by | Notes |
| --- | --- | --- | --- |
| T-303 | Report generation via background jobs | Phase 5 (Redis/BullMQ) | Uses BullMQ — deferred |

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
