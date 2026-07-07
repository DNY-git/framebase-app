# CHANGELOG.md

> All notable changes to ConstructTrack are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/) once application releases begin.

Until implementation starts, versions are documented as `0.0.x` documentation revisions.

## [Unreleased]

### Added
- **T-105: Tasks Module**
  - Mongoose schemas for `Task` and `TaskDependency`.
  - CRUD operations with full `TenantId` isolation and `AuthContext` injection.
  - Cycle detection for task dependencies.
  - Lifecycle state machine and dependency blocking constraints.
- **T-104: Projects Module**
  - Mongoose schemas for `Project` and `ProjectMember`.
  - Full CRUD operations with `TenantId` isolation and auto-assigned creator admin.
  - Lifecycle state machine enforcement.
  - Project membership management with robust constraints (e.g. preventing the removal/demotion of the last manager).
  - Extensive audit logging.
  - Controller secured via JWT and integrated with the new `AuthorizationModule`.
- `AuthorizationModule` and `AuthorizationService` for handling three-axis security (Tenant + Role + Membership).
- **ADR-002** (`docs/decisions/ADR-002-database-and-infra.md`) — supersedes ADR-001's PostgreSQL and Docker decisions. Documents the shift to MongoDB Atlas, Mongoose behind a swappable repository interface, no Docker/Compose for development, and Redis deferred to Phase 5.
- **Phase 1 platform skeleton** (npm workspaces monorepo, no Docker required):
  - Root workspace config: `package.json` (npm workspaces), `tsconfig.json` (project references), `.gitignore`, `.npmrc`.
  - `packages/config/` — shared ESLint, Prettier, and strict TypeScript base configs.
  - `packages/types/` — shared types: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `Role` enum, `TenantId`/`UserId`/`EntityId` branded types, `PaginationOptions`.
  - `packages/ui/` — placeholder for the shared component library (populated in Phase 2).
  - `apps/api/` — NestJS modular monolith skeleton:
    - Bootstrap (`main.ts`) with Helmet, CORS, compression, global validation pipe, Winston structured logging, graceful shutdown.
    - Standard response envelope interceptor and global all-exceptions filter mapping to the documented error shape (`docs/api/standards.md`).
    - Config validation that fails fast in production if `change-me-*` secrets remain.
    - MongoDB Atlas connection module with graceful degradation (app starts even without `MONGODB_URI`; health check reports DB status).
    - Repository pattern: `IBaseRepository<T>` interface + abstract `BaseRepository<T>` with automatic `tenantId` scoping on every query.
    - Mongoose schemas for tenancy primitives: `Tenant`, `User`, `Membership`, `AuditLog`, `Session` (with TTL index).
    - `GET /api/v1/health` endpoint returning aggregated subsystem status.
    - Idempotent seed script (`npm run seed`) creating a demo tenant + admin user + membership.
  - `apps/web/` — React 18 + Vite SPA skeleton:
    - QueryClientProvider wired with sane defaults; React Router, Zustand, React Hook Form, Zod, Tailwind CSS v4 installed.
    - Root page that fetches and renders the API health check.
    - Vite dev-server proxy for `/api` to the API on :4000.
- **Phase 2 — Auth spine (T-101):**
  - **Database connection refactor:** `DatabaseModule` now uses `MongooseModule.forRootAsync({ lazyConnection: true })`, returning the connection object instantly without blocking bootstrap. Inert placeholder URI with 1ms timeout when no `MONGODB_URI` configured. `DatabaseService` wraps the injected connection for health checks (replaces the manual `import('mongoose')` approach from Phase 1).
  - **Auth module** (`apps/api/src/modules/auth/`):
    - `PasswordService` — bcryptjs hashing with per-deployment pepper (`PASSWORD_PEPPER`); strength validation (min 8, upper/lower/digit).
    - `TokenService` — JWT access (15m) / refresh (7d) pair with distinct secrets; HS256 sign + verify.
    - Repositories: `UserRepository`, `TenantRepository`, `MembershipRepository`, `SessionRepository` (SHA-256 token hashing, session rotation, multi-session revocation).
    - DTOs: `RegisterDto`, `LoginDto`, `RefreshDto` (class-validator edge validation).
    - `AuthService` — register (creates tenant + admin membership), login (generic 401, no enumeration), refresh (token rotation + reuse-theft detection), logout, getMe.
    - `AuthController` — 5 endpoints under `/api/v1/auth/` per `docs/api/authentication.md`.
  - **Security:** Global `JwtAuthGuard` (`APP_GUARD`) — every route protected unless `@Public()`. `@Public()`, `@CurrentUser()`, `@CurrentTenant()` decorators. Added `RolesGuard` (`APP_GUARD`) and `@Roles()` decorator for role-based authorization (T-102).
  - **Tenant Isolation (T-103):** Verified `BaseRepository` automatically enforces row-level tenant isolation on all queries. Cross-tenant access is structurally impossible and covered by dedicated unit tests.
  - **Audit module** (`apps/api/src/modules/audit/`): global `AuditService` recording auth mutations (register, login, logout) with actor, action, entity, IP/UA metadata. Fire-and-forget with error logging.
  - **Seed script** updated to hash the seed password with pepper + bcryptjs (replaces placeholder hash).
  - **Cookie-parser** middleware added to `main.ts` for refresh-token cookie transport.
  - **25 unit tests** (password, token, auth service) — all pass; typecheck clean.

### Changed
- **Stack decision (per ADR-002 and user directive):** Database is now MongoDB Atlas + Mongoose (was PostgreSQL 16 + Prisma). Development no longer requires Docker, Docker Compose, or Nginx (was the documented dev model). Redis/BullMQ deferred to Phase 5.
- Updated `TECH_STACK.md`, `BIBLE.md` (§6 architecture, §8 tech stack, §12 database philosophy), `AI_CONTEXT.md`, `README.md`, `.env.example`, `PROJECT_RULES.md` §6, `ROADMAP.md` Phase 0/1, `TASKS.md` (T-001…T-009), and `HANDOFF.md` to reflect the new stack and Phase 1 status.

### Notes
- **MongoDB Atlas is optional for local startup.** The API starts with graceful degradation and reports `database: "disconnected"` on `/api/v1/health` until `MONGODB_URI` is configured. Set up a free Atlas cluster and whitelist your IP to enable DB-dependent features (registration, login, etc.).
- **Mongoose connection is non-blocking via `lazyConnection: true`.** `DatabaseModule` uses `MongooseModule.forRootAsync({ lazyConnection: true })` so the connection object returns instantly. When no URI is configured, an inert placeholder (`mongodb://127.0.0.1:9/...`) with a 1ms timeout fails fast, keeping startup snappy. Feature modules use standard `@InjectModel()` — queries buffer until connected or fail after timeout.
- **Global JWT guard.** Every route is protected by default (returns 401 without a valid access token). Routes marked `@Public()` bypass the guard (health check, auth/register, auth/login, auth/refresh). DB-dependent endpoints (register, login) return 500 if MongoDB is not connected — configure `MONGODB_URI` to enable.
- **npm 11 `allow-scripts` compatibility.** `@nestjs/core`, `esbuild`, and `mongodb-memory-server` are listed in both `package.json` `allowScripts` and `.npmrc`. Warnings about "unparseable entry" in `.npmrc` are cosmetic and do not affect functionality.
- **Phase 1 exit criteria verified:** `node dist/main.js` starts and responds on `:4000`; `GET /api/v1/health` returns degraded status; `GET /api/v1` returns version envelope; Vite web dev server starts on `:5173` with proxy to API; TypeScript typecheck clean; both API and web production builds succeed.
- **Phase 2 auth spine verified:** 25/25 unit tests pass (password hashing, token sign/verify/expiry, auth register/login/refresh/logout); typecheck clean; API starts and responds with JWT guard active.

---

## [0.0.1] - 2026-07-03

### Added
- Documentation foundation for the ConstructTrack platform (Phase 0).
  - Root governance: `README.md`, `BIBLE.md`, `PROJECT_RULES.md`, `AI_CONTEXT.md`, `TECH_STACK.md`, `ROADMAP.md`, `TASKS.md`, `HANDOFF.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`, `.env.example`.
  - AI operating instructions under `.cline/` (`instructions.md`, `workflow.md`, `prompts.md`).
  - Architecture docs: `docs/architecture/{system,frontend,backend,database,ai}.md`.
  - Database docs: `docs/database/{schema,migrations,security}.md`.
  - API docs: `docs/api/{authentication,endpoints,standards}.md`.
  - UI docs: `docs/ui/{design-system,components,accessibility}.md`.
  - Feature specs: `docs/features/{dashboard,projects,tasks,equipment,inventory,reports,notifications,ai-assistant}.md`.
  - Deployment docs: `docs/deployment/{local,production,ci-cd}.md`.
  - Security docs: `docs/security/{authentication,authorization,data-protection}.md`.
  - Testing docs: `docs/testing/{strategy,frontend,backend}.md`.
  - First Architecture Decision Record: `docs/decisions/ADR-001-project-foundation.md`.

---

## Versioning Policy (prospective)

Once the platform ships code, versions will follow SemVer:

- **MAJOR:** incompatible API or data-model changes.
- **MINOR:** backward-compatible features.
- **PATCH:** backward-compatible fixes.

Each release merges `[Unreleased]` into a dated, numbered section.

---

## Maintenance

- Every PR adds a line under `[Unreleased]` in the appropriate subsection.
- Subsections used: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- A new release = move `[Unreleased]` contents to a numbered, dated heading and start a fresh `[Unreleased]`.

<!-- 
Template for future entries:

## [0.1.0] - YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Fixed
- ...
-->
