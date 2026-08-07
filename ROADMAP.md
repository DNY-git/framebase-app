# ROADMAP.md — Phased Delivery Roadmap

> ConstructTrack is delivered in value-driven phases. Each phase ends with something a real user can use and a system that stays releasable. Dates are indicative, not contractual; the order is what matters.

This roadmap tracks *what* and *when*; *what's currently happening* lives in [TASKS.md](./TASKS.md), and *why we're building it* in [BIBLE.md](./BIBLE.md).

---

## Table of Contents

- [Guiding Principles](#guiding-principles)
- [Phase Overview](#phase-overview)
- [Phase 0 — Foundation & Approval](#phase-0--foundation--approval)
- [Phase 1 — Platform Skeleton](#phase-1--platform-skeleton)
- [Phase 2 — The Spine (Auth, Projects, Tasks)](#phase-2--the-spine-auth-projects-tasks)
- [Phase 3 — Field Operations (Equipment, Inventory)](#phase-3--field-operations-equipment-inventory)
- [Phase 4 — Insight (Reports, Dashboard)](#phase-4--insight-reports-dashboard)
- [Phase 5 — Engagement (Notifications, AI Assistant)](#phase-5--engagement-notifications-ai-assistant)
- [Phase 6 — Hardening & Scale](#phase-6--hardening--scale)
- [Beyond v1](#beyond-v1)

---

## Guiding Principles

1. **Vertical slices over horizontal layers.** Each phase delivers a usable thin slice, not a stack of disconnected layers.
2. **`main` is always releasable.** No phase lands without CI, tests, and docs.
3. **Security and tenancy from day one.** Auth and tenant isolation ship with the spine, not bolted on.
4. **Specs precede code** for every phase ([PROJECT_RULES.md §10](./PROJECT_RULES.md#10-documentation-rules)).

---

## Phase Overview

| Phase | Theme | Status | Exit criteria |
| --- | --- | --- | --- |
| 0 | Foundation & Approval | ✅ Done | Docs approved; Phase 1 begins |
| 1 | Platform Skeleton | ✅ Done | Repo, CI, npm scripts, MongoDB Atlas, empty modules |
| 2 | The Spine | ✅ Done | Auth + multi-tenancy + Projects + Tasks usable E2E |
| 3 | Field Operations | ✅ Done | Equipment + Inventory usable and linked to Projects |
| 4 | Insight | ✅ Done | Reports builder + Dashboard KPIs live |
| 5 | Engagement | ✅ Done | Notifications + AI Assistant MVP |
| 6 | Hardening & Scale | ✅ Done | Observability, error classification, rate limiting, backups, job queue |

Legend: ✅ done · 🟡 in progress · ⏳ not started

---

## Phase 0 — Foundation & Approval

**Goal:** Establish the documentation system that will govern the project forever.

**Scope:**
- Root governance docs (BIBLE, PROJECT_RULES, AI_CONTEXT, TECH_STACK, etc.)
- `docs/` knowledge tree (architecture, database, api, ui, features, deployment, security, testing, decisions)
- `.cline/` AI operating instructions
- `.env.example`, LICENSE, CONTRIBUTING

**Exit criteria:**
- All docs reviewed for consistency and broken links.
- **Human approval** to begin implementation.

**Status:** Documentation complete. Awaiting approval.

---

## Phase 1 — Platform Skeleton

**Goal:** A running, empty, fully-wired platform with CI enforcing quality gates.

**Scope:**
- Monorepo scaffolding: `apps/web`, `apps/api`, `packages/{ui,config,types}`.
- TypeScript strict configs shared via `packages/config`.
- Mongoose baseline schemas (tenancy primitives) + seed script.
- MongoDB Atlas connection with graceful degradation (health check reports DB status).
- GitHub Actions: lint → type-check → unit → build.
- Health check endpoints; structured logging; error envelope.
- Repository interface pattern (`IBaseRepository<T>` → `BaseRepository<T>`).

**Exit criteria:**
- `npm run dev` yields a running API + web dev server; `GET /api/v1/health` returns 200 with DB status.
- CI green on `main`; lint, typecheck, unit tests, and build all pass.

---

## Phase 2 — The Spine (Auth, Projects, Tasks)

**Goal:** The dependency spine every later feature needs, usable end-to-end.

**Scope:**
- **Auth:** email/password + refresh tokens, roles, session management ([docs/security/authentication.md](./docs/security/authentication.md)).
- **Multi-tenancy:** `tenantId` everywhere, row-level isolation verified by tests.
- **Projects:** CRUD, phases, milestones, team membership, status.
- **Tasks:** hierarchical WBS, assignment, status, priority, dependencies.
- **Dashboard stub:** counts of projects/tasks (full KPIs in Phase 4).

**Exit criteria:**
- A user can register, log in, create a project, and manage tasks in it.
- Cross-tenant access tests pass; audit log records mutations.

---

## Phase 3 — Field Operations (Equipment, Inventory)

**Goal:** The physical side of construction is tracked and linked to projects.

**Scope:**
- **Equipment:** registry, assignment to projects, utilization hours, maintenance schedule, downtime logging.
- **Inventory:** materials catalog, stock levels, reorder points, allocations to projects, delivery receipts.
- Linkage: tasks can require equipment/materials; consumption flows from tasks to inventory.

**Exit criteria:**
- A fleet manager sees utilization and upcoming maintenance.
- An inventory manager sees reorder alerts and project allocations.

---

## Phase 4 — Insight (Reports, Dashboard)

**Goal:** Data captured in Phases 2–3 becomes decision-grade insight.

**Scope:**
- **Reports:** template-based builder (daily log, weekly summary, safety, custom), scheduling, export (PDF/CSV). See [docs/features/reports.md](./docs/features/reports.md).
- **Dashboard:** org-wide KPIs — active projects, overdue tasks, equipment utilization, inventory health, open safety items. See [docs/features/dashboard.md](./docs/features/dashboard.md).

**Exit criteria:**
- A PM can generate a weekly summary report with one click.
- An executive dashboard loads in under 2s (p95) for a tenant with 100 projects.

---

## Phase 5 — Engagement (Notifications, AI Assistant)

**Goal:** The platform reaches out, and answers back.

**Scope:**
- **Notifications:** in-app + email + push, driven by domain events and subscriptions. See [docs/features/notifications.md](./docs/features/notifications.md).
- **AI Assistant MVP:** natural-language Q&A over tenant data, progress summaries, risk surfacing, report drafting. Provider-agnostic. See [docs/features/ai-assistant.md](./docs/features/ai-assistant.md).

**Exit criteria:**
- Users receive timely notifications for the events they subscribe to.
- A PM can ask "What's at risk this week?" and get a grounded, cited answer.

---

## Phase 6 — Hardening & Scale

**Goal:** Production confidence.

**Scope:**
- Observability: metrics, tracing, dashboards, alerting.
- Performance: query optimization, caching strategy review, load testing.
- Security: third-party penetration test, dependency audit, threat-model refresh.
- Reliability: backups, restore drills, graceful degradation.

**Exit criteria:**
- p95 API latency budgets met under load test.
- Pen-test findings remediated; restore drill completed.

---

## Beyond v1

Future-direction candidates, each gated on a future ADR ([BIBLE.md §19](./BIBLE.md#19-future-vision)):

- Offline-first field capture with CRDT-style sync.
- IoT/telemetry ingestion for equipment hours and site sensors.
- Photo & document OCR for daily logs and delivery receipts.
- Predictive scheduling and budget-burn forecasting.
- Native mobile apps.
- Report/workflow marketplace.

These are intentionally out of scope until v1 proves out.
