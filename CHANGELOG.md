# CHANGELOG.md

> All notable changes to ConstructTrack are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/) once application releases begin.

Until implementation starts, versions are documented as `0.0.x` documentation revisions.

## [Unreleased]

### Added
- **Frontend overhaul + hardening (2026-08-07)**
  - Reworked app chrome: `AppShell`, `Sidebar`, `MobileSidebar`, `TopNav`, `PageLayout` with a page-title store; auth pages (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`), `NotFound`, `Unauthorized`, and an `ErrorBoundary`.
  - Added `auth.ts` + `auth-fetch.ts` (token storage, automatic refresh with 401 debounce, redirect on refresh failure); feature screens now fetch through `authFetch` instead of receiving `token` props.
  - Added Documents screen as its own nav entry/route (layout-only, no backend yet) and an Audit Log screen backed by the new `GET /api/v1/audit` endpoints (`AuditController`).
  - Removed the frontend Notifications feature (bell + `/notifications` route) — inbox UI dropped, API module untouched.
  - Added Playwright e2e smoke (`apps/web/e2e/critical-path.spec.ts` + `playwright.config.ts`, `npm run test:e2e`).
  - Updated `InventoryService` transaction/delivery flow to atomic `atomicConsume`/`atomicIncrement` stock updates (race-safe) with matching spec mocks.
  - Pinned mongodb-memory-server to 6.0.24 in the API vitest config (7.0.x mongod segfaults on WSL2); tenant isolation suite now runs (7 tests).
  - Verification (2026-08-07): typecheck, lint (0 warnings), build, and 210/210 unit tests green.
- **T-206: Figma wireframe implementation (Phase 3)**
  - Added `Documents` feature screen (`apps/web/src/features/documents/Documents.tsx`) — spec layout (PageHeader, search, project/type filter dropdowns, "+ Upload" button, Title Case table) with empty state; registered `/documents` route in `App.tsx`.
  - Added Documents to desktop + mobile sidebar nav as its own entry (`FolderOpen` icon) — fixes the mock's incorrect "Inventory highlighted" active state.
  - Rewrote `EquipmentList` as a spec-style table (status dot + name/serial, type, status pill, purchase date, purchase cost, utilisation % from the real per-item `/utilization` endpoint); row select still renders `EquipmentDetail` below.
  - Rewrote `MaterialList` as a materials/stock table distinct from Equipment (item/SKU, quantity on hand, unit, reorder threshold, stock status) with search, stock filter, and "+ Add stock" → deliveries form.
  - Added summary stat cards to Reports (templates, runs, succeeded, failed) computed from real fetched data.
  - Restyled AI Assistant to design tokens with the spec pill input bar (plus attach, mic, dark square up-arrow send); all real endpoints preserved.
  - Added `FolderOpen`, `Mic`, `ArrowUp` icons to `apps/web/src/shared/components/icons.tsx`.
  - Constraint honored: no mock data, no fake endpoints. Verification (2026-08-06): typecheck, lint (0 warnings), build (250 modules) all green.
- **T-303: Lightweight Job Queue + Report Generation (Phase 6)**
  - Added `IJobQueue`, `IJobProcessor`, `Job`, `JobStatus`, `JobPayload`, `JobResult` types to `@constructtrack/types`.
  - Added `InMemoryJobQueue` — synchronous in-memory job queue (no Redis required). Swappable via `IJobQueue` interface.
  - Added `ReportProcessor` — processes report generation jobs with abstract `IReportRunWriter` / `IReportTemplateReader` interfaces for testability without Mongoose.
  - Added `ReportRunWriterAdapter` / `ReportTemplateReaderAdapter` — bridges concrete Mongoose repositories to processor interfaces.
  - Added `JobQueueModule` — provides `JOB_QUEUE` token, imported by `ReportsModule`.
  - Refactored `ReportsService.generateReport()` to enqueue jobs via `IJobQueue` and re-fetch updated status.
  - Reports now transition through PENDING → GENERATING → SUCCEEDED|FAILED (previously stuck at PENDING).
  - 18 unit tests (9 InMemoryJobQueue + 9 ReportProcessor), all passing. Typecheck clean.
  - Extension point: implement `IJobQueue` with BullMQ to swap in Redis-backed async processing without changing business logic.
- **T-503: API Rate Limiting (Phase 6)**
  - Added `RateLimiterService` — in-memory sliding-window rate limiter with periodic cleanup.
  - Added `@RateLimit()` decorator for per-route limit overrides (method + class level).
  - Added `RateLimitGuard` — global `APP_GUARD` that applies authenticated (100/min) and public (20/min) rate limits, keyed by userId or IP respectively.
  - Added `RateLimitModule` registered in `AppModule` (runs after JwtAuthGuard + RolesGuard).
  - Added rate limit config fields to `AppConfig` (`rateLimitAuthLimit`, `rateLimitAuthTtl`, `rateLimitPublicLimit`, `rateLimitPublicTtl`) with `.env.example` defaults.
  - 12 service + guard unit tests covering limit enforcement, window reset, anonymous vs. authenticated keys, and decorator overrides.
- **T-504: Backup & Restore Drill (Phase 6)**
  - Created `docs/deployment/backup-drill.md` — comprehensive runbook covering Atlas Cloud Backups (PITR), manual mongodump, restore drill procedure, backup verification checklist, and incident recovery playbooks.
  - Created `apps/api/scripts/backup-verify.ts` — data integrity verification script (collection existence, counts, indexes, tenant isolation sample, audit log freshness).
  - Added `npm run backup:verify`, `backup:local`, `restore:local` scripts.
  - Updated `docs/deployment/production.md` — replaced PostgreSQL references with MongoDB Atlas topology, backups, and migration strategy.
  - Updated `docs/deployment/ci-cd.md` — replaced Prisma/migration references with Mongoose additive-schema pattern.
  - Updated `docs/database/security.md` — replaced Prisma/PostgreSQL references with MongoDB Atlas backup and tenant isolation strategy.
- **T-204: Inventory Transactions + Delivery Receipts (Phase 3)**
  - Added append-only `InventoryTransaction` schema/repository with signed quantity stock updates (zero-stock floor, insufficient-stock check).
  - Added `DeliveryReceipt` schema/repository with atomic delivery + receive transaction on record.
  - Endpoints: `POST/GET /api/v1/inventory/transactions`, `GET /materials/:id/transactions`, `POST /api/v1/deliveries`, `GET /deliveries/:id`.
  - Added `TransactionLedger` React component with material/type filters and record-transaction form.
  - Added `DeliveryForm` React component with delivery recording and recent-deliveries list.
  - Added Transactions and Deliveries tabs to the web app navigation.
  - 24 service unit tests covering recordTransaction (receive/consume/adjust/transfer), recordDelivery, and queries.
- **T-302: Dashboard KPIs (Phase 4)**
  - Expanded `DashboardOverview` type with `equipment` (total, available, assigned, inMaintenance, utilizationRate, upcomingMaintenance) and `inventory` (totalMaterials, lowStockItems, totalStockQuantity) sections.
  - Updated `DashboardService` to query `EquipmentService`, `EquipmentReportService`, and `InventoryService` for real KPI data.
  - Wired `EquipmentModule` and `InventoryModule` into `DashboardModule`.
  - Updated `Dashboard` frontend component with new KPI cards for Equipment Fleet, Inventory, and Upcoming Maintenance.
- **T-301: Report Builder (Phase 4)**
  - Added `ReportTemplateDomain`, `ReportRunDomain`, and `ReportStatus` enum to shared types.
  - Created `ReportTemplate` and `ReportRun` Mongoose schemas with tenant-scoped indexes.
  - Built full `ReportsModule`: `ReportTemplateRepository`, `ReportRunRepository`, `ReportsService`, `ReportsController`.
  - Endpoints: `POST/GET /v1/reports/templates`, `GET /v1/reports/templates/:id`, `POST /v1/reports`, `GET /v1/reports`, `GET /v1/reports/:id`.
  - Registered `ReportsModule` in `app.module.ts`.
- **T-401/T-402: Notifications + Subscriptions (Phase 5)**
  - Added `NotificationDomain`, `NotificationSubscriptionDomain`, `NotificationType`, and `NotificationChannel` to shared types.
  - Created `Notification` and `NotificationSubscription` Mongoose schemas with tenant-scoped indexes.
  - Built `NotificationsModule`: repositories, service, controller with 7 endpoints (`POST /v1/notifications`, `GET /v1/notifications`, `GET /v1/notifications/unread-count`, `PATCH /:id/read`, `PATCH /read-all`, `GET /subscriptions`, `PUT /subscriptions`).
  - Added `Notifications` React component with inbox list, mark-read, mark-all-read, and subscription preference toggles.
  - Added notification bell with unread badge to the web app header.
  - 13 service unit tests covering create, find, mark-read, mark-all-read, count-unread, and subscription CRUD.
- **T-502: Error Classification (Phase 6)**
  - Defined `ErrorCode` enum in `@constructtrack/types` with 40+ domain-specific error codes (auth, projects, tasks, equipment, inventory, notifications, reports, AI, common).
  - Created `DomainException` base class extending `HttpException` with typed `errorCode` field.
  - Refactored all 12 service files and `AuthorizationService` to throw `DomainException` with proper error codes instead of generic NestJS exceptions.
  - All 171 tests pass; typecheck clean.
- **T-501: Observability (Phase 6)**
  - Added `CorrelationIdMiddleware` — generates/forwards `x-request-id` on every request with `ct_` prefix.
  - Added `LoggingInterceptor` — logs method, path, status code, and duration for every HTTP request with correlation ID context.
  - Added `MetricsService` — in-memory request metrics (count, duration, errors) aggregated by endpoint.
  - Added `MetricsController` at `GET /api/v1/metrics` (public) exposing service uptime, total requests, errors, and per-endpoint breakdown.
  - Added `MetricsInterceptor` — records request metrics automatically.
  - Expanded health check (`GET /api/v1/health`) with deep database ping test and metrics summary.
  - 11 service unit tests covering metrics aggregation, path normalization, reset, correlation ID forwarding, and health check expansion.
- **T-403/T-404: AI Assistant (Phase 5)**
  - Added `AiJobDomain`, `AiFeedbackDomain`, `AIProvider` interface, `AiCompletionRequest`/`Response` to shared types.
  - Created `AiJob` and `AiFeedback` Mongoose schemas with tenant-scoped indexes.
  - Built `AiModule`: provider-agnostic `IAIProvider` interface, `NoneProvider` (graceful degradation), repositories, service, controller with 6 endpoints (`POST /v1/ai/query`, `POST /summarize`, `POST /draft-report`, `GET /jobs`, `GET /jobs/:id`, `POST /feedback`).
  - Added `AI_PROVIDER`, `AI_MAX_TOKENS`, `AI_REQUEST_TIMEOUT_MS` to config and `.env.example`.
  - Added `AiAssistant` React component with chat interface, summarization, report drafting, and job tracking.
  - 8 service unit tests covering query (success + error), async jobs, job listing, job detail, and feedback.
- **T-205: Task ↔ Equipment/Material Consumption Linkage (Phase 3)**
  - Added `taskId` field to `EquipmentUsageLog` schema, DTO, domain type, and repository.
  - Added `findByTask` query methods to `EquipmentUsageLogRepository` and `InventoryTransactionRepository`.
  - Added task-scoped equipment usage and material consumption methods to `TasksService` (recordEquipmentUsage, getEquipmentUsage, recordMaterialConsumption, getMaterialConsumption).
  - Added 4 API endpoints: `POST/GET :taskId/equipment-usage` and `POST/GET :taskId/material-consumption`.
  - Wired `EquipmentModule` and `InventoryModule` into `TasksModule`.
  - Added `TaskConsumption` React component with project/task selector, equipment usage logging, and material consumption recording.
  - Added Tasks tab to the web app navigation.
  - 5 new service tests for consumption methods.
- **T-203: Inventory Catalog + Stock Levels (Phase 3)**
  - Added `InventoryModule` with `MaterialRepository`, `StockLevelRepository`, `InventoryService`, and `InventoryController`.
  - Endpoints: `GET/POST /api/v1/materials`, `GET /materials/low-stock`, `GET /materials/:id`, `PATCH /materials/:id`, `PATCH /materials/:id/archive`, `GET /materials/:id/stock`.
  - Material CRUD with SKU uniqueness, stock level initialization on create, low-stock detection.
  - Added `MaterialList` React component with catalog view and low-stock filter toggle.
  - 18 service unit tests covering create, find, findById, update, getStockLevel, getLowStock, and archive.
- **T-202: Equipment Utilization + Maintenance Schedule (Phase 3)**
  - Added backend `EquipmentReportService` for utilization, usage timeline, maintenance history, downtime history, and upcoming-maintenance alert reads.
  - Added validated equipment reporting query DTOs and API endpoints under `/api/v1/equipment`.
  - Added report-service unit coverage for utilization calculations, downtime adjustment, maintenance urgency ordering, and history reads (12 new tests).
  - Added `EquipmentDetail` frontend component with utilization KPI cards, maintenance timeline, usage timeline, and downtime history — rendered alongside the fleet list.
- **T-201: Equipment Registry + Assignment (Phase 3)**
  - Added `Equipment` and `EquipmentAssignment` domains.
  - Implemented `EquipmentRepository` and `EquipmentAssignmentRepository` with Mongoose and `BaseRepository` for tenant isolation.
  - Implemented `EquipmentService` with audit logging, project manager authorization for assignments, and status lifecycles.
  - Added `/api/v1/equipment` endpoints.
  - Added minimal `EquipmentList` React component to the web app for viewing the fleet.
- **T-107: Audit Logs**
  - All project and task mutations are recorded in the audit log via `AuditService`.
  - Added `GET /api/v1/projects/:id/activity` and `GET /api/v1/projects/:projectId/tasks/:id/activity` endpoints to retrieve the audit log for a specific entity.
  - Added `AuditLogDomain` interface to `@constructtrack/types`.
- **T-106: Dashboard Stub**
  - Mongoose queries for returning project and task counts scoped to the user and tenant.
  - Basic minimal frontend dashboard view in React.
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
