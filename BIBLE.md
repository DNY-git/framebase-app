# BIBLE.md — The ConstructTrack Constitution

> This document is the **single source of truth** for the ConstructTrack platform. Every contributor — human or AI — must read and internalize it before modifying the project. When a decision conflicts with anything else in the repository, **BIBLE.md wins**.

---

## Table of Contents

- [1. Project Vision](#1-project-vision)
- [2. Mission](#2-mission)
- [3. Product Goals](#3-product-goals)
- [4. Core Principles](#4-core-principles)
- [5. Target Users](#5-target-users)
- [6. Architecture Overview](#6-architecture-overview)
- [7. Folder Structure](#7-folder-structure)
- [8. Tech Stack](#8-tech-stack)
- [9. Development Philosophy](#9-development-phosophy)
- [10. UI Philosophy](#10-ui-philosophy)
- [11. Security Philosophy](#11-security-philosophy)
- [12. Database Philosophy](#12-database-philosophy)
- [13. Coding Standards](#13-coding-standards)
- [14. Naming Conventions](#14-naming-conventions)
- [15. AI Operating Rules](#15-ai-operating-rules)
- [16. Documentation Standards](#16-documentation-standards)
- [17. Git Workflow](#17-git-workflow)
- [18. Definition of Done](#18-definition-of-done)
- [19. Future Vision](#19-future-vision)

---

## 1. Project Vision

ConstructTrack exists to make construction projects **legible**. Today, the truth about a project — what got done, what broke, what's at risk, what was delivered, who signed off — is scattered across spreadsheets, group chats, paper logs, and people's memory. We replace that fragmentation with a structured, queryable, role-aware record that is equally useful to a project manager at a desk and a superintendent on site.

The platform is not a generic project-management tool. It is opinionated about **construction**: it understands phases, crews, equipment hours, material allocations, daily logs, and safety observations as first-class concepts.

## 2. Mission

To give every construction team one reliable system of record where field data becomes actionable insight — fast enough to matter on the job today, and structured enough to power AI-assisted decisions tomorrow.

## 3. Product Goals

1. **One source of truth.** Every project fact has exactly one authoritative location.
2. **Capture at the source.** Data is entered where it is created — on site — with the lowest possible friction.
3. **Role-aware by default.** Field crew, PM, finance, and admin each see exactly what they need and nothing they shouldn't.
4. **Insight on demand.** KPIs, reports, and AI summaries surface risk before it becomes cost.
5. **Trustworthy.** Audit trails, immutability where required, and clear ownership for every record.
6. **Extensible.** Built to grow over many releases and across multiple AI models without rewrites.

## 4. Core Principles

- **Documentation is the foundation, not an afterthought.** Docs precede code; this file is the proof.
- **Simplicity over cleverness.** Boring, readable code wins. Optimize for the next reader.
- **Composition over inheritance.** Small, focused, reusable units.
- **Strict typing end to end.** TypeScript everywhere; a single source of types shared across web and API.
- **Separation of concerns.** UI, business logic, and data access live in distinct layers.
- **Reversibility.** Prefer decisions that are easy to change. Record irreversible ones as ADRs.
- **Mobile-first, field-first.** If it doesn't work on a phone on a job site, it doesn't ship.
- **Security is a feature.** Never compromise isolation or least-privilege for convenience.

## 5. Target Users

| Persona | Primary need |
| --- | --- |
| **Project Manager** | Roll-up visibility across projects, budgets, schedules, and risks. |
| **Site Engineer / Superintendent** | Daily logs, task status, crew/equipment assignment, safety tracking. |
| **Field Crew** | Fast, low-friction task updates and log entry from a phone. |
| **Procurement / Inventory Manager** | Material levels, allocations, reorder alerts, delivery receipts. |
| **Fleet Manager** | Equipment registry, utilization, maintenance, downtime. |
| **Executive / Stakeholder** | Dashboards and reports without needing to open a project. |
| **Admin** | Tenancy, users, roles, and platform configuration. |

Every feature must map to at least one persona and a measurable outcome.

## 6. Architecture Overview

ConstructTrack is a **modular monolith** with a clean-layered backend and a feature-based frontend. Detailed in [docs/architecture/system.md](./docs/architecture/system.md).

```
              ┌──────────────────────────────────────────┐
   Browser ──▶│  API  (NestJS modular monolith)           │
              │  Modules: auth · projects · tasks ·         │
              │  equipment · inventory · reports ·           │
              │  notifications · ai · dashboard             │
              └───┬───────────────┬──────────────────────┘
                  │               │
            ┌─────▼─────────┐ ┌───▼──────────────────┐
            │ MongoDB Atlas │ │ AI Provider(s)        │
            │  (truth)      │ │ (OpenAI/Anthropic/etc.)│
            └───────────────┘ └────────────────────────┘
```

Key properties:

- **Modular monolith:** domain modules with clearly bounded responsibilities; ready to extract to services if scale demands it.
- **Multi-tenant:** every tenant-scoped document carries `tenantId`; document-level isolation enforced in the repository layer.
- **Swappable persistence:** Mongoose sits behind a repository interface. The database can be swapped (e.g., to PostgreSQL) without rewriting business logic. See [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).
- **Provider-agnostic AI:** the assistant talks to a service abstraction, not a vendor SDK directly.

## 7. Folder Structure

See [README.md → Repository Structure](./README.md#repository-structure). In short: a monorepo with `apps/web`, `apps/api`, shared `packages/`, and `docs/`.

## 8. Tech Stack

Condensed here; full rationale in [TECH_STACK.md](./TECH_STACK.md).

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query v5, Zustand, React Router, React Hook Form + Zod
- **Backend:** Node.js 20 LTS + NestJS + TypeScript + Mongoose + class-validator
- **Data:** MongoDB Atlas (managed), in-memory cache for Phase 1–4 (Redis deferred to Phase 5)
- **AI:** OpenAI / Anthropic via a provider-agnostic service layer
- **Infra:** GitHub Actions (no container runtime required for development; see [ADR-002](./docs/decisions/ADR-002-database-and-infra.md))

## 9. Development Philosophy

- **Spec-first.** A feature exists as a spec under `docs/features/` before code is written.
- **Small, reviewable changes.** One concern per PR.
- **Tests describe behavior.** Write the test that documents intent, then the code that satisfies it.
- **Refactor in a separate PR from behavior change.**
- **Delete dead code fearlessly** — once tests and search confirm it's truly dead.
- **Prefer pure functions**; push side effects to the edges (handlers, controllers, workers).

## 10. UI Philosophy

- **Mobile-first.** Layout for a phone, enhance for tablet, polish for desktop.
- **Content density with breathing room.** Field users scan, they don't read.
- **One primary action per screen.** Secondary actions are visibly secondary.
- **Predictable components.** The same concept always uses the same component.
- **Accessible by default** (WCAG 2.1 AA). See [docs/ui/accessibility.md](./docs/ui/accessibility.md).
- **Optimistic updates with rollback** for confidence; clear errors for failure.
- **Design system first** — see [docs/ui/design-system.md](./docs/ui/design-system.md).

## 11. Security Philosophy

- **Least privilege** at every layer: role, tenant, and record.
- **Tenant isolation is non-negotiable.** A query must never return another tenant's data.
- **Secrets live in the environment, never in code.**
- **Audit everything that mutates** stateful data.
- **Defend in depth:** validation at the edge, authorization at the service, constraints in the DB.
- Full policy: [docs/security/](./docs/security/).

## 12. Database Philosophy

- **MongoDB Atlas is the system of record.** Mongoose schemas define the data model; the repository interface abstracts the persistence layer so the database can be swapped (e.g., to PostgreSQL) in the future without rewriting business logic. See [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).
- **The schema is the contract.** Mongoose schemas are authoritative; seed scripts initialize dev data.
- **Indexes and constraints are enforced** at the schema level — compound indexes for uniqueness, covering indexes for tenant-scoped queries.
- **Soft-delete sparingly** and intentionally — only where audit/history is required.
- **Every tenant-scoped collection** has a `tenantId` field and a covering index. The base repository injects `tenantId` on all queries.
- **Tenant isolation is structural.** Cross-tenant leakage is prevented by the repository layer, not by hoping controllers remember to filter.
- Schema details: [docs/database/schema.md](./docs/database/schema.md).

## 13. Coding Standards

- **TypeScript `strict: true`** everywhere. No `any` without a `// reason:` comment.
- **Linting & formatting are enforced.** ESLint + Prettier; zero warnings on `main`.
- **Functions do one thing.** If the name needs "and," split it.
- **No magic strings** for domains — use typed constants/enums.
- **Handle errors explicitly.** No swallowed promises; every thrown error is either expected (typed) or a bug (logged + surfaced).
- **Comments explain *why*, not *what*.** The code already says what.

## 14. Naming Conventions

- **Files (frontend):** `PascalCase` for components (`ProjectCard.tsx`), `camelCase` for utilities (`formatCurrency.ts`).
- **Files (backend):** `kebab-case` (`project.service.ts`, `tasks.controller.ts`).
- **Types/Interfaces:** `PascalCase`, descriptive (`ProjectStatus`, `CreateTaskDto`).
- **Database:** `snake_case` tables and columns (`project`, `created_at`); join tables as `a_b` (`project_member`).
- **API:** `kebab-case` path segments (`/api/v1/projects/:id/tasks`), `camelCase` JSON keys in responses.
- **Branches:** `feat/`, `fix/`, `chore/`, `docs/` + kebab-case slug.
- **Constants:** `UPPER_SNAKE_CASE`.

## 15. AI Operating Rules

Because this project is built by many AI models over time, the following are **binding on all AI contributors**:

1. **Read BIBLE.md, PROJECT_RULES.md, and AI_CONTEXT.md before making any change.** Loading AI_CONTEXT.md satisfies the minimum.
2. **Never write code that contradicts the docs.** If the docs are wrong, propose a doc change first.
3. **Never delete working functionality** without explicit human approval and an updated test plan.
4. **Never commit secrets, real credentials, or `.env`.**
5. **One concern per change.** Do not bundle refactors with features.
6. **Always run lint and tests** for the area you touched; report results truthfully.
7. **Update the docs you touched** in the same change that touches the code.
8. **Cite the spec.** Every new feature PR links to its `docs/features/<spec>.md`.
9. **Prefer the existing stack.** Introducing a new dependency requires an ADR.
10. **Leave the campsite cleaner.** Fix a nearby smell when you touch its neighborhood.
11. **Surface uncertainty.** If unsure, stop and ask rather than guess at irreversible actions.

## 16. Documentation Standards

- **Docs precede code.** No feature ships without a spec.
- **Every markdown file** has: a one-line purpose at the top, a table of contents for long docs, and a cross-reference to related docs.
- **No placeholder text.** Every section carries real, meaningful content.
- **Keep it current.** Stale docs are bugs; a code change that invalidates a doc must update it.
- **Cross-link liberally** but never to non-existent paths (see the review step in CONTRIBUTING).
- **Use relative links** so docs work in any clone or branch preview.
- Standards detail: [docs/api/standards.md](./docs/api/standards.md) and the contributing guide.

## 17. Git Workflow

- **Trunk-based.** Short-lived branches off `main`, PRs back to `main`.
- **Branch prefix** reflects intent: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
- **Commit messages:** imperative mood — `Add equipment maintenance schedule endpoint`.
- **PRs are small** and reference a `TASKS.md` item; description includes *what*, *why*, and *how to test*.
- **Squash-merge** to keep `main` linear.
- **`main` is always green** — CI must pass before merge.
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full checklist.

## 18. Definition of Done

A change is "Done" when **all** of these are true:

- [ ] Implements the agreed spec (or updates it with rationale).
- [ ] Passes lint, type-check, and all affected tests.
- [ ] Adds or updates tests for new/changed behavior.
- [ ] Updates affected documentation.
- [ ] Includes or references an audit/permission check (for stateful changes).
- [ ] No secrets, no `console.log`/debugger left behind.
- [ ] Reviewed and approved; CHANGELOG entry added.
- [ ] Deployable — `main` remains releasable.

## 19. Future Vision

ConstructTrack is built to grow. Foreseeable directions, deliberately out of scope today:

- **Offline-first field capture** with conflict-free sync (CRDT-style).
- **IoT/telemetry ingestion** for equipment hours and site sensors.
- **Photo & document OCR** to auto-populate daily logs and delivery receipts.
- **Predictive scheduling** and budget-burn forecasting via the AI assistant.
- **Mobile apps** (native) once the responsive web experience is proven.
- **Marketplace of report templates** and workflow automations.

Each of these will be evaluated against the Core Principles and introduced only with a matching ADR under [docs/decisions/](./docs/decisions/).

---

*This constitution is a living document. Changes to it require a PR, review, and an explicit callout — it is too important to edit casually.*
