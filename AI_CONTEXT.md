# AI_CONTEXT.md — Fast-Load Context for AI Agents

> This is the **condensed, token-efficient** version of [BIBLE.md](./BIBLE.md). Loading this file satisfies the minimum context requirement for any AI working on ConstructTrack. For full reasoning, read the linked documents.

**Status (current):** Documentation foundation complete. **No application code exists yet.** Implementation begins only after human approval of this documentation. See [HANDOFF.md](./HANDOFF.md).

---

## Project Summary

**ConstructTrack** is a production-grade, multi-tenant **Construction Tracking Platform**. It unifies project management, field reporting, equipment & inventory control, reporting, notifications, and an AI assistant into one role-aware system of record for construction teams (PMs, site engineers, field crew, procurement, fleet managers, executives).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui, TanStack Query v5, Zustand, React Router, React Hook Form + Zod |
| Backend | Node.js 20 LTS, NestJS, TypeScript (strict), Mongoose ODM, class-validator |
| Data | MongoDB Atlas (source of truth); Redis deferred to Phase 5 |
| AI | Provider-agnostic service layer (OpenAI / Anthropic) |
| Infra | GitHub Actions; no Docker required for dev or CI |
| Repo | Monorepo: `apps/web`, `apps/api`, `packages/{ui,config,types}` |

Full rationale: [TECH_STACK.md](./TECH_STACK.md).

## Architecture (one paragraph)

A **modular monolith** API (NestJS) serves a **feature-based SPA** (React). MongoDB Atlas is the system of record; Mongoose schemas define the data model behind a swappable repository interface. Every tenant-scoped document carries `tenantId`; isolation is enforced in the base repository layer and verified by tests. The AI assistant talks to a provider-agnostic abstraction, never a vendor SDK directly. Diagram: [docs/architecture/system.md](./docs/architecture/system.md).

## Core Domains (modules / features)

`auth` · `projects` · `tasks` · `equipment` · `inventory` · `reports` · `notifications` · `ai-assistant` · `dashboard`

Specs: [docs/features/](./docs/features/).

## Binding Rules (the ones you must not violate)

1. **Docs precede code.** No feature without a spec in `docs/features/`.
2. **Never delete working functionality** without explicit human approval.
3. **Never weaken auth, authz, or tenant isolation.** Cross-tenant access must fail (and be tested).
4. **Never commit secrets / `.env`.** Secrets come from the environment.
5. **`strict: true`, no `any` without a `// reason:`.** Validation at the edge (DTOs + class-validator).
6. **One concern per PR.** No bundled refactors + features. Squash-merge to `main`.
7. **Business logic in services, not controllers/components.** Background work → BullMQ.
8. **Mongoose schemas are authoritative; repository interface abstracts persistence.** Every tenant collection has `tenantId` + index. DB is swappable via the repository pattern.
9. **Mobile-first, WCAG 2.1 AA.** Server state via TanStack Query; UI state via Zustand.
10. **Update the docs you touch, in the same change.** No broken links, no placeholder text.
11. **Report truthfully.** If you skipped a step or a test failed, say so.
12. **Surface uncertainty.** Stop and ask before irreversible actions.

Full rules: [PROJECT_RULES.md](./PROJECT_RULES.md). Constitution: [BIBLE.md](./BIBLE.md).

## Current Priorities

1. Await **human approval** of the documentation foundation.
2. On approval, scaffold the monorepo per `README.md` structure and [docs/architecture/](./docs/architecture/).
3. Establish CI (lint, type-check, test) before any feature work — see [ROADMAP.md](./ROADMAP.md) Phase 1.
4. First feature vertical slice: **auth + projects + tasks** (the spine every other feature depends on).

## Conventions (quick reference)

- Files: frontend `PascalCase` (components) / `camelCase` (utils); backend `kebab-case` (`project.service.ts`).
- DB: `snake_case` (`project`, `created_at`); join tables `a_b`.
- API: `/api/v1/...` paths, `camelCase` JSON, versioned, documented in [docs/api/endpoints.md](./docs/api/endpoints.md).
- Branches: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` + kebab slug. Commit messages imperative mood.
- Envelope + pagination conventions: [docs/api/standards.md](./docs/api/standards.md).

## Where things live

- **Vision/rules:** [BIBLE.md](./BIBLE.md), [PROJECT_RULES.md](./PROJECT_RULES.md)
- **Tasks/roadmap:** [TASKS.md](./TASKS.md), [ROADMAP.md](./ROADMAP.md)
- **Continuity:** [HANDOFF.md](./HANDOFF.md)
- **Specs by domain:** [docs/features/](./docs/features/)
- **Architecture/UI/API/DB/Security/Testing/Deployment:** [docs/](./docs/) subdirectories
- **AI operating prompts:** [.cline/](./.cline/)
- **Decisions:** [docs/decisions/](./docs/decisions/) (ADRs)

## Agent Quick-Start

1. Read this file (you're here).
2. Read [TASKS.md](./TASKS.md) to see what's current.
3. Read the relevant spec under [docs/features/](./docs/features/) for your task.
4. Check [PROJECT_RULES.md](./PROJECT_RULES.md) §13 (Definition of Done) before opening a PR.
5. Update docs + CHANGELOG in the same change as code.
