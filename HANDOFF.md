# HANDOFF.md — Continuity Document

> The goal of this file: **any developer or AI can pick up ConstructTrack and continue without additional explanation.** Read this, then [AI_CONTEXT.md](./AI_CONTEXT.md), then the relevant spec under [docs/features/](./docs/features/).

---

## Table of Contents

- [Current Status](#current-status)
- [Completed Work](#completed-work)
- [Outstanding Work](#outstanding-work)
- [Known Issues](#known-issues)
- [Architecture Summary](#architecture-summary)
- [Current Priorities](#current-priorities)
- [Recommended Next Steps](#recommended-next-steps)
- [How to Resume](#how-to-resume)

---

## Current Status

**Phase:** Phase 2 (The Spine) — **Tasks module complete.** Dashboard stub pending.

**One-line state:** Phase 2 auth spine (T-101), role guard (T-102), Projects module (T-104), and Tasks module (T-105) are complete. A user can manage projects and break them down into hierarchical tasks with strict dependency cycle-detection and lifecycle validation. 80/80 unit tests pass; typecheck and build clean. Dashboard stub (T-106) is the next step.

**Last updated:** 2026-07-07.

---

## Completed Work

### Documentation foundation (Phase 0) — complete

- **Root governance docs:** [README.md](./README.md), [BIBLE.md](./BIBLE.md), [PROJECT_RULES.md](./PROJECT_RULES.md), [AI_CONTEXT.md](./AI_CONTEXT.md), [TECH_STACK.md](./TECH_STACK.md), [ROADMAP.md](./ROADMAP.md), [TASKS.md](./TASKS.md), [CHANGELOG.md](./CHANGELOG.md), [CONTRIBUTING.md](./CONTRIBUTING.md), [LICENSE](./LICENSE), [.env.example](./.env.example).
- **AI operating instructions:** [.cline/instructions.md](./.cline/instructions.md), [.cline/workflow.md](./.cline/workflow.md), [.cline/prompts.md](./.cline/prompts.md).
- **Architecture:** system, frontend, backend, database, AI — [docs/architecture/](./docs/architecture/).
- **Database:** schema, migrations, security — [docs/database/](./docs/database/).
- **API:** authentication, endpoints, standards — [docs/api/](./docs/api/).
- **UI:** design system, components, accessibility — [docs/ui/](./docs/ui/).
- **Features:** dashboard, projects, tasks, equipment, inventory, reports, notifications, AI assistant — [docs/features/](./docs/features/).
- **Deployment:** local, production, CI/CD — [docs/deployment/](./docs/deployment/).
- **Security:** authentication, authorization, data protection — [docs/security/](./docs/security/).
- **Testing:** strategy, frontend, backend — [docs/testing/](./docs/testing/).
- **Decisions:** [ADR-001-project-foundation.md](./docs/decisions/ADR-001-project-foundation.md), [ADR-002-database-and-infra.md](./docs/decisions/ADR-002-database-and-infra.md).

### Documentation updates for ADR-002

- Updated BIBLE.md §6 (Architecture), §8 (Tech Stack), §12 (Database Philosophy).
- Updated TECH_STACK.md: Data Layer, Backend, Infrastructure, Testing, Rejected Alternatives, Version Pinning.
- Updated AI_CONTEXT.md: Stack table, Architecture paragraph, Binding Rules.
- Updated README.md: Tech Stack, Prerequisites, Setup, Repository Structure, Testing, Deployment.
- Updated .env.example: MongoDB Atlas URI, removed Postgres/Redis/Docker/upload/AI vars.
- Updated PROJECT_RULES.md §6: Mongoose schemas, repository pattern, tenant scoping.
- Updated ROADMAP.md: Phase 0→approved, Phase 1 scope (no Docker, MongoDB Atlas, Mongoose).
- Updated TASKS.md: T-004…T-009 updated for new stack.

### Consistency review — complete

- Cross-references audited for broken links.
- Terminology unified across docs (domains, persona names, tech versions).
- Binding rules aligned between BIBLE, PROJECT_RULES, and AI_CONTEXT.

### Phase 2 — Auth spine (T-101) — complete

- **Database connection refactor:** `DatabaseModule` now uses `MongooseModule.forRootAsync({ lazyConnection: true })` — the connection object returns instantly without blocking bootstrap. When `MONGODB_URI` is absent, an inert placeholder URI with a 1ms timeout fails fast so startup stays snappy. `DatabaseService` wraps the injected connection for health checks.
- **Auth module** (`apps/api/src/modules/auth/`): `AuthService`, `PasswordService` (bcryptjs + per-deployment pepper), `TokenService` (JWT access/refresh pair with distinct secrets). Repositories: `UserRepository`, `TenantRepository`, `MembershipRepository`, `SessionRepository` (refresh token hashing with SHA-256, session rotation, multi-session revocation). DTOs: `RegisterDto`, `LoginDto`, `RefreshDto` (class-validator edge validation).
- **Endpoints:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` — all per docs/api/authentication.md.
- **Security:** Global `JwtAuthGuard` (registered as `APP_GUARD`) — every route is protected unless marked `@Public()`. Refresh token rotation on each refresh; reuse of a revoked token revokes ALL sessions (theft signal). Generic 401 on credential failure (no enumeration). Password strength validated at DTO + service (defense-in-depth).
- **Audit module** (`apps/api/src/modules/audit/`): global `AuditService` recording every auth mutation (register, login, logout) with actor, action, entity, IP/UA metadata.
- **Decorators:** `@Public()`, `@CurrentUser()`, `@CurrentTenant()` for clean controller code.
- **Seed script** updated: hashes the seed password with pepper + bcryptjs (no more placeholder hash).
- **Tests:** 25 unit tests (password hashing/validation, token sign/verify/expiry, auth register/login/refresh/logout business logic) — all pass. Typecheck clean.

**Note:** Several docs reference PostgreSQL/Prisma/Docker and will be updated as their respective features land: `docs/architecture/database.md`, `docs/database/schema.md`, `docs/database/migrations.md`, `docs/database/security.md`, `docs/architecture/backend.md`, `docs/deployment/local.md`, `docs/deployment/production.md`, `docs/deployment/ci-cd.md`, `docs/testing/strategy.md`, `docs/testing/backend.md`. These updates are tracked as part of Phase 2+ implementation.

---

## Outstanding Work

1. Continue **Phase 2 — The Spine** ([TASKS.md T-106…T-107](./TASKS.md)):
   - Dashboard stub — project/task counts (T-106).
   - Audit log for all project/task mutations (T-107).

---

## Known Issues

- **MongoDB Atlas connection required for DB-dependent features.** The app degrades gracefully (starts successfully, health check returns `database: "disconnected"`) but DB operations will fail until `MONGODB_URI` is configured in `.env`. Set up a free Atlas cluster and whitelist your IP.
- **Several docs still reference PostgreSQL/Prisma/Docker.** Updated as part of feature implementation (Phase 2+). See the note in Completed Work above for the full list.

---

## Architecture Summary

ConstructTrack is a **multi-tenant, modular monolith** with a **feature-based SPA** frontend. (Full detail: [docs/architecture/system.md](./docs/architecture/system.md).)

```
Browser ──▶ API (NestJS modular monolith)
            Modules: auth · projects · tasks · equipment · inventory ·
                     reports · notifications · ai · dashboard
            │       │
            ▼       ▼
      MongoDB Atlas  AI Provider(s)
       (truth)      (OpenAI/Anthropic via abstraction)
```

- **Source of truth:** MongoDB Atlas (managed). Mongoose schemas define the data model behind a swappable repository interface.
- **Tenancy:** every tenant-scoped document has `tenantId`; isolation enforced in the base repository layer and verified by tests.
- **No Docker:** development uses `npm run dev`; CI uses GitHub Actions without service containers.
- **Redis deferred to Phase 5:** no caching or queue infrastructure until then.
- **AI:** provider-agnostic service layer; no vendor SDK in domain code.
- **Stack rationale:** [TECH_STACK.md](./TECH_STACK.md). DB/infra rationale: [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).

---

## Current Priorities

1. **Preserve `main` releasability.** All further work must pass CI before merging.
2. **Continue Phase 2 spine.** Tenant isolation -> Projects -> Tasks (Phase 2) unblocks everything else.

---

## Recommended Next Steps

In order, for whoever picks this up:

1. **Verify the auth spine** (smoke test):
   - Set `MONGODB_URI` in `.env` to a MongoDB Atlas connection string.
   - `npm run dev:api` → register a user via `POST /api/v1/auth/register` → log in → call `GET /api/v1/auth/me` with the access token → refresh → logout.
2. **Continue Phase 2 spine** ([ROADMAP.md](./ROADMAP.md)):
   - Projects module (T-104) → Tasks module (T-105) → Dashboard stub (T-106).

---

## How to Resume

If you are an AI continuing this work:

1. Read [AI_CONTEXT.md](./AI_CONTEXT.md) (minimum required context).
2. Read this file (you're here) and [TASKS.md](./TASKS.md) for the current board state.
3. Check the [ROADMAP.md](./ROADMAP.md) phase you're entering and its exit criteria.
4. Honor [PROJECT_RULES.md](./PROJECT_RULES.md) — especially §1 (Behavior & Safety) and §13 (Definition of Done).
5. For any irreversible action (destructive migration, deleting code, force-push), **stop and confirm** first.
6. Update this file, [TASKS.md](./TASKS.md), and [CHANGELOG.md](./CHANGELOG.md) as you make progress.

If you are a human: welcome — the docs are written to let you move fast safely. Start at [README.md](./README.md).
