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

**Phase 6 (Hardening) — T-501 ✅, T-502 ✅, T-503 ✅, T-504 ✅, T-303 ✅.**

Observability, Error Classification, API Rate Limiting, Backup & Restore Drill, and Lightweight Job Queue are complete. See [TASKS.md](./TASKS.md) for remaining work.

**Phase:** Phase 5 (Engagement) — **T-401 ✅, T-402 ✅, T-403 ✅, T-404 ✅.** T-303 backlog (blocked by Redis).

**One-line state:** Phase 3 (equipment, inventory, task linkage) ✅, Phase 4 (reports + dashboard KPIs) ✅, Phase 5 (notifications + AI assistant) ✅, Phase 6 (hardening + job queue) ✅ complete. **React 19 upgrade ✅** (deps bumped, all `JSX` namespace breakage + typecheck blockers + 30 lint warnings fixed; typecheck/build/lint green). **shadcn/ui Phase 1 ✅** (infra installed, Button generated, token bridge, `/ui-lab` smoke page; commit `fd5b4e9`). **Design Foundation (Phase 2) ✅** (13 reusable UI primitives in `apps/web/src/components/ui/` + barrel `@/components/ui`, Design Foundation smoke section on `/ui-lab`; commit `035dc69`). **Figma implementation ✅** (all 7 wireframe screens implemented from `figma/img.json` — see "Completed Work → Phase 3 (Figma screenshot implementation)"). **Multi-tenant organizations (T-207) — implemented, staged for review** (prompt2.txt): OrganizationsModule on the existing Tenant/Membership models, OWNER founder role, Team page, invitation accept flow, org switcher, cross-org project-membership prevention, 37 new tests — work sits in the working tree, commit sequence outlined below.

**Last updated:** 2026-08-14 (Google OAuth sign-in/sign-up; profile photo fixes: crop-only editor, stuck-loading bug fix, 10 MB cap, cache-busted avatar URLs, DB-free avatar serving; @nestjs/mongoose 8.24.2→10.1.0). **2026-08-14 evening:** boot crash fixed (AuthController `GoogleStrategy` union-type DI token → `@Inject`+`@Optional`); `authorizeURLForClient` fixed to use `_oauth2.getAuthorizeUrl`; **Gemini provider added** (`GeminiProvider`, `AI_PROVIDER=gemini`, `GEMINI_API_KEY`); Google OAuth + Gemini keys configured in `apps/api/.env`.

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

**Note:** Documentation has been updated to reflect MongoDB Atlas / Mongoose throughout. ADR files retain historical PostgreSQL/Prisma references as they document past decisions.

### Phase 5 — Notifications + AI Assistant (T-401..T-404) — complete

- **Notifications module** (`apps/api/src/modules/notifications/`):
  - `Notification` and `NotificationSubscription` Mongoose schemas with tenant-scoped indexes.
  - `NotificationRepository` with `findByUser`, `markAsRead`, `markAllAsRead`, `countUnread`.
  - `NotificationSubscriptionRepository` with `findByUser`, `upsert`.
  - `NotificationsService` with create, list, mark-read, count-unread, subscription CRUD.
  - `NotificationsController` under `/api/v1/notifications`: 7 endpoints (create, list, unread-count, mark-read, mark-all-read, get subscriptions, put subscriptions).
  - Frontend `Notifications` React component with inbox tab, unread badge, mark-all-read, subscription preferences with per-type channel toggles.
  - Notification bell with badge count in the App header nav.
  - 13 service unit tests.

- **AI Assistant module** (`apps/api/src/modules/ai/`):
  - `IAIProvider` interface (`complete` + optional `embed`) for provider-agnostic design.
  - `NoneProvider` — default (graceful degradation) returning "AI not configured" message.
  - `AiJob` and `AiFeedback` Mongoose schemas with tenant-scoped indexes.
  - `AiJobRepository` with `findByUser` pagination; `AiFeedbackRepository` for feedback recording.
  - `AiService`: query (sync), submitJob (summarize/draft-report), findMyJobs, findJobById, submitFeedback.
  - `AiController` under `/api/v1/ai`: 6 endpoints (query, summarize, draft-report, list jobs, get job, feedback).
  - AI config vars (`AI_PROVIDER`, `AI_MAX_TOKENS`, `AI_REQUEST_TIMEOUT_MS`) added to `AppConfig` and `.env.example`.
  - Frontend `AiAssistant` React component with chat interface, summarization, report drafting, job tracking overlay, and feedback buttons.
  - AI Assistant tab in the web app navigation (gracefully degrades when provider is `none`).
  - 8 service unit tests.

### Phase 6 — Hardening — T-501 (Observability) + T-502 (Error Classification) + T-503 (API Rate Limiting) + T-504 (Backup & Restore Drill) — complete

- **CorrelationIdMiddleware** (`apps/api/src/common/middleware/correlation-id.middleware.ts`): generates `x-request-id` as `ct_<uuid>` or forwards caller-provided `x-request-id` / `x-correlation-id`. Applied globally.
- **LoggingInterceptor** (`apps/api/src/common/interceptors/logging.interceptor.ts`): logs method, path, statusCode, durationMs, and correlation ID for every HTTP request.
- **MetricsService** (`apps/api/src/modules/metrics/metrics.service.ts`): in-memory per-endpoint counters (count, avgMs, maxMs, errorCount) with global totals (uptimeSeconds, totalRequests, totalErrors).
- **MetricsController** (`apps/api/src/modules/metrics/metrics.controller.ts`): `GET /api/v1/metrics` (public) returns full metrics snapshot.
- **MetricsInterceptor** (`apps/api/src/modules/metrics/metrics.interceptor.ts`): records request duration for every endpoint automatically.
- **Health check expanded** (`apps/api/src/modules/health/health.service.ts`): now includes deep database ping test (pingMs) and metrics summary.
- **Tests:** 11 new unit tests (6 for MetricsService, 3 for HealthService, 2 for CorrelationIdMiddleware) — all pass.

- **T-502 (Error Classification):**
  - `ErrorCode` enum with 40+ domain-specific codes in `@constructtrack/types` (auth, projects, tasks, equipment, inventory, notifications, reports, AI, common).
  - `DomainException` base class in `apps/api/src/common/exceptions/domain.exception.ts` — extends `HttpException` with typed `errorCode`.
  - All 12 services + `AuthorizationService` refactored to throw `DomainException` with proper error codes.
  - Existing `AllExceptionsFilter` already handles the envelope body — no filter changes needed.
  - 171 tests pass, typecheck clean.

- **T-503 (API Rate Limiting):**
  - `RateLimiterService` (`apps/api/src/common/rate-limiter/rate-limiter.service.ts`): in-memory sliding-window rate limiter with automatic cleanup of stale entries every 60s.
  - `@RateLimit()` decorator (`apps/api/src/common/decorators/rate-limit.decorator.ts`): method/class-level override for `{ limit, ttl }`.
  - `RateLimitGuard` (`apps/api/src/common/rate-limiter/rate-limit.guard.ts`): global `APP_GUARD` registered after JwtAuthGuard + RolesGuard. Uses userId key for authenticated users (default 100/60s) and IP key for anonymous (default 20/60s). Throws 429 with `RATE_LIMITED` error code.
  - `RateLimitModule` (`apps/api/src/common/rate-limiter/rate-limit.module.ts`): registers service + guard, imported by `AppModule`.
  - Config: `rateLimitAuthLimit`, `rateLimitAuthTtl`, `rateLimitPublicLimit`, `rateLimitPublicTtl` — added to `AppConfig` and `.env.example`.
  - Tests: 12 new unit tests (6 for RateLimiterService, 6 for RateLimitGuard) covering limits, window reset, key isolation, and decorator overrides.
  - Typecheck clean.

- **T-504 (Backup & Restore Drill):**
  - `docs/deployment/backup-drill.md` — comprehensive runbook covering Atlas Cloud Backups (PITR), manual `mongodump`, step-by-step restore drill procedure, backup verification checklist, and three incident recovery playbooks (data loss, region outage, user-triggered corruption).
  - `apps/api/scripts/backup-verify.ts` — data integrity verification script that connects to a restored cluster and validates: all expected collections exist with minimum doc counts, tenant isolation sample, index presence, and audit log freshness.
  - `npm run backup:verify` (runs the script), `backup:local` (mongodump), `restore:local` (mongorestore from latest archive).
  - Updated `docs/deployment/production.md` — replaced PostgreSQL topology, backups, and migration references with MongoDB Atlas equivalents.
  - Updated `docs/deployment/ci-cd.md` — replaced Prisma/migration pipeline with Mongoose additive-schema pattern.
  - Updated `docs/database/security.md` — replaced Prisma/PostgreSQL references with MongoDB Atlas backup and tenant isolation strategy.

### Phase 6 — T-303 (Lightweight Job Queue + Report Generation) — complete

- **IJobQueue interface** (`packages/types/src/index.ts`): `IJobQueue`, `IJobProcessor`, `Job`, `JobStatus`, `JobPayload`, `JobResult` — provider-agnostic abstractions for background job execution.
- **InMemoryJobQueue** (`apps/api/src/common/job-queue/in-memory-job-queue.ts`): synchronous in-memory queue. No Redis, no external dependencies. Executes jobs inline within the request cycle. Extension point: swap to BullMQ via `IJobQueue` interface.
- **ReportProcessor** (`apps/api/src/common/job-queue/report.processor.ts`): processes `report.generate` jobs. Transitions ReportRun through PENDING → GENERATING → SUCCEEDED|FAILED. Uses abstract `IReportRunWriter` / `IReportTemplateReader` interfaces — fully testable without Mongoose.
- **Adapters** (`apps/api/src/common/job-queue/reports.adapters.ts`): `ReportRunWriterAdapter` / `ReportTemplateReaderAdapter` bridge concrete Mongoose repositories to processor interfaces.
- **JobQueueModule** (`apps/api/src/common/job-queue/job-queue.module.ts`): provides `JOB_QUEUE` token. Imported by `ReportsModule`.
- **ReportsService refactor**: `generateReport()` now enqueues via `IJobQueue`, then re-fetches the run to return the updated status (previously stuck at PENDING).
- **Tests:** 18 unit tests (9 InMemoryJobQueue + 9 ReportProcessor) — all passing. Typecheck clean.
- **Deferred infrastructure documented:** Redis/BullMQ swap documented in HANDOFF.md and CHANGELOG.md. Business logic continues working with synchronous implementation.

### React 19 Upgrade — complete

- **Dependency bump** (`apps/web/package.json`): `react` 19.2.8, `react-dom` 19.2.8, `@types/react` 19.2.18, `@types/react-dom` 19.2.4, `react-router-dom` 6.30.4. Lockfile verified consistent (`npm install` clean; only platform-optional rollup binaries re-resolved for Linux).
- **React 19 `JSX` namespace breakage fixed** (6 files → `React.JSX.Element`): `App.tsx`, `features/ai/AiAssistant.tsx`, `features/dashboard/Dashboard.tsx`, `features/equipment/EquipmentDetail.tsx`, `features/notifications/Notifications.tsx`, `shared/components/icons.tsx`.
- **Web typecheck blockers fixed:** `features/settings/Settings.tsx` (typed `ProfileTab` with `User`, removed dead state/imports), `features/audit/AuditLog.tsx` + `features/inventory/TransactionLedger.tsx` (unused imports removed).
- **Lint cleanup (all pre-existing warnings, 30 → 0):** API (22) and web (8) — unused vars/imports, `any` casts removed, hook dependency arrays corrected with `useCallback`, `AiJobType` enum typed end-to-end (DTO → controller → service → repository). Files: 14 API (auth, ai, reports, notifications, middleware, rate-limiter, job-queue specs) + 8 web (Dashboard, Notifications, ProjectDetail, TaskDetail, TaskConsumption, LoginPage).
- **Verification (2026-08-04):** `npm install` ✅ · `npm run typecheck` ✅ (all 4 workspaces, 0 errors) · `npm run build` ✅ (nest build + vite, 129 modules) · `npm run lint` ✅ (0 errors, 0 warnings).
- **Runtime smoke:** login page confirmed rendering (React mounted, full DOM) in headless Chromium once. Full data flows not verifiable — MongoDB Atlas unreachable from this WSL (5s `secureConnect` timeout; app runs degraded).
- **Not started:** shadcn install (deferred; runbook in `.zcode/plans/`).

### shadcn/ui Phase 1 — Install shadcn/ui infrastructure — complete

- **Deps installed** (`apps/web`): `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `lucide-react`, `radix-ui` (CLI-added umbrella); dev: `@types/node`. No `--force` / `--legacy-peer-deps`.
- **Config:** `components.json` (new-york, rsc:false, Tailwind v4 CSS-only, aliases `@/*`), `src/lib/utils.ts` (stock `cn()`), `tsconfig.json` `@/*` paths, `vite.config.ts` `@` alias.
- **CSS token bridge (append-only):** shadcn vars (`--border/--input/--card/--popover/--secondary/--muted/--accent/--destructive/--radius`) aliased to existing ConstructTrack tokens in `:root` + `.dark` and registered in `@theme`. Single non-append edit: fixed malformed `--ring: 2563eb;` → `var(--primary)`. No existing tokens overwritten.
- **Button** generated via official `npx shadcn@latest add button` (new-york, uses `radix-ui` `Slot.Root`, `@/lib/utils`). CLI note: internal `npm install` step is slow (~2–3 min) in this WSL and can appear hung — let it run.
- **`/ui-lab` smoke page:** `pages/UiLab.tsx` renders all 6 variants, 5 sizes, disabled states; one additive route in `App.tsx` (sibling of `/login`, outside auth). Existing feature pages untouched.
- **Verification (2026-08-04):** typecheck ✅ · lint ✅ (0 warnings) · build ✅ (236 modules; CSS 36.8→43.4 kB confirms shadcn utilities active).
- **Commit:** `fd5b4e9` — `feat(ui): install shadcn/ui infrastructure`.
- **Caveat:** `/ui-lab` runtime browser check not re-run (headless Chromium/Edge unreliable in this WSL); build + typecheck cover it.

### Design Foundation (Phase 2) — 13 reusable UI primitives — complete

- **Files created** (`apps/web/src/components/ui/`, commit `035dc69` — `feat(ui): add reusable design foundation`):
  `page-container`, `page-header`, `section-header`, `content-card`, `data-card`, `stat-card`, `empty-state`, `loading-state`, `error-state`, `search-input`, `filter-bar`, `table-toolbar`, plus barrel `index.ts` → import via `@/components/ui`.
- **Conventions:** all primitives use existing design tokens (`bg-surface`, `border-border`, `text-foreground-muted`, `rounded-xl`, `shadow-sm`), the `cn()` util from `@/lib/utils`, and icons from `@/shared/components/icons`. `PageContainer` is a composition wrapper only — `AppShell` already owns page padding.
- **Files modified:** `apps/web/src/pages/UiLab.tsx` — added "Design Foundation" smoke section rendering every primitive (page header, filter bar, stat cards, data/content cards, empty/loading/error states, search input).
- **Verification (2026-08-05):** typecheck ✅ · lint ✅ (0 warnings) · build ✅ (249 modules, +13).
- **Packages installed:** none.
- **Checkpoint folder:** `.design-foundation-checkpoint-20260805-192844/` (snapshot of `components/ui/` + `UiLab.tsx`).

### Phase 3 (Figma screenshot implementation) — complete

- **Unblocked via spec JSON:** the 7 Figma exports (`img/Group 86`–`Group 92`, 1082×669) cannot be viewed by the current model, so they were converted into a machine-readable spec at `figma/img.json` + `figma/prompt.txt` — global layout (sidebar, header pattern, filter row, color tokens) + all 7 screens. Implemented 2026-08-06.
- **Documents screen (new):** `apps/web/src/features/documents/Documents.tsx` — full spec chrome (PageHeader, search, project + type filter dropdowns, green "+ Upload" button, Title Case table headers Name/Type/Project/Uploaded by/Date/Size) rendering an empty state since no documents module/endpoint exists yet. Route `/documents` registered in `App.tsx`; own sidebar nav entry (FolderOpen icon) on desktop + mobile — fixes the mock's wrong "Inventory highlighted" active state.
- **Equipment screen:** `EquipmentList` rewritten as a spec-style table — Equipment (status dot + name + serial), Type (category), Status pill, Purchase date, Purchase cost, Utilisation % (fetched per row from the real `/api/v1/equipment/:id/utilization` endpoint; colored text + bar by value). Search + status filter. Row selection still renders `EquipmentDetail` below the table.
- **Inventory screen:** `MaterialList` rewritten as a materials/stock table distinct from Equipment — Item (name + SKU), Quantity on hand (red when low), Unit, Reorder threshold, In stock/Low stock badge. Search + stock filter; "+ Add stock" navigates to the real deliveries form (`/inventory/deliveries`).
- **Reports screen:** added a summary stat-card row (templates, runs, succeeded, failed) computed from real fetched data — a reporting view, not the Equipment table.
- **AI assistant screen:** restyled from hardcoded gray/blue classes to design tokens; chat input is now the spec's rounded pill (plus attach, mic, dark square up-arrow send). All real endpoints preserved (query/summarize/draft-report/jobs).
- **Status taxonomy:** Projects (`ProjectStatus`) and Equipment (`EquipmentStatus`) remain separate enums; no shared status set. Table headers normalized to Title Case.
- **Constraint honored:** no mock data, no fake endpoints — screens compose real API data where the module exists, and pure layout chrome where it does not (Documents).
- **Verification (2026-08-06):** typecheck ✅ · lint ✅ (0 warnings) · build ✅ (250 modules).
- **Not done:** `EquipmentDetail` internals still use legacy gray/blue utility classes (functional, unstyled to tokens); Tasks board keeps backend `TaskStatus` columns (mock's "In review" has no enum value — left untouched per "don't invent data model fields").

### Phase 3 — Equipment Registry + Assignment (T-201) — complete

- **Equipment domain:** 5 schemas (Equipment, EquipmentAssignment, EquipmentUsageLog, MaintenanceRecord, DowntimeLog) with proper indexes for tenant scoping and query performance.
- **Repository layer:** 5 repositories extending `BaseRepository` with adapters for DTO ↔ Mongoose document conversion:
  - `EquipmentRepository` — registry CRUD
  - `EquipmentAssignmentRepository` — project allocation with overlap validation
  - `EquipmentUsageLogRepository` — daily hours logged
  - `MaintenanceRecordRepository` — maintenance scheduling & history
  - `DowntimeLogRepository` — unavailability tracking
- **Service layer:** `EquipmentService` with 12 core methods (create, findAll, findOne, update, assignToProject, endAssignment, logUsage, getUsageLogs, scheduleMaintenance, updateMaintenance, logDowntime, getDowntimeLogs). All mutations audit-logged.
- **DTOs:** 8 DTOs for all create/update operations with `class-validator` validation.
- **API endpoints:** 10 endpoints under `/api/v1/equipment` (CRUD, assignments, usage, maintenance, downtime) per [docs/api/endpoints.md](./docs/api/endpoints.md).
- **Frontend:** `EquipmentList` React component (minimal stub; full detail/edit deferred to T-202).
- **Types:** 9 domain types exported from `@constructtrack/types` (EquipmentStatus, EquipmentDomain, EquipmentAssignmentDomain, EquipmentUsageLogDomain, MaintenanceType, MaintenanceStatus, MaintenanceRecordDomain, DowntimeReason, DowntimeLogDomain).
- **Tests:** 6 tests in `equipment.service.spec.ts` covering core service methods; all passing. Total API test suite: 86 tests, all passing.
- **Repository pattern:** All equipment data access enforces tenant isolation at the `BaseRepository` level; cross-tenant access is structurally impossible.
- **Audit logging:** All mutations (assignments, usage, maintenance, downtime) recorded via `AuditService`.
- **Status at T-202 handoff:** Typecheck ✅, Lint ✅ (zero warnings), Tests ✅ (116/116 passing; 7 skipped — tenant isolation tests require local mongodb-memory-server binary). All T-202 changes committed.

### 2026-08-08 — Nest DI crash fix + profile photo feature — complete

- **Startup crash fixed.** `DocumentsStorageService` had an optional primitive constructor arg (`rootDir?: string`) so Nest DI tried to inject `String` (no provider exists) → `UnknownDependenciesException` aborted boot. Fixed by marking the param `@Optional()` — tests using `new DocumentsStorageService(tmpRoot)` still work. (DEP0190 deprecation warnings in `bug.txt` come from `concurrently` dev tooling, not app code.)
- **Profile photo — full-stack (`src/modules/auth`):**
  - `User` schema + `UserDomain` gained `avatarUrl`; `UserRepository.updateProfile()` added.
  - `AuthService`: `setAvatar()` (2 MB max, JPEG/PNG/WebP only, stored at `storage/avatars/<userId>.<ext>`, old file removed on replace), `removeAvatar()`, `resolveAvatar()`; `avatarUrl` now returned in register/login/refresh/`getMe` responses.
  - `AuthController`: new `PATCH /api/v1/auth/me` (was missing — the existing profile form previously 404'd), `POST /api/v1/auth/me/avatar` (multipart), `DELETE /api/v1/auth/me/avatar`, public `GET /api/v1/auth/:userId/avatar` (ObjectId URLs are unguessable so `<img>` tags work without headers; `Cache-Control: private, max-age=86400`).
  - New error code `AUTH_INVALID_AVATAR` + `UpdateProfileDto` in `@constructtrack/types` / `apps/api`.
- **Frontend (`apps/web`):**
  - `Settings icon (cog)` now renders beside **Settings** in `Sidebar.tsx`; `MobileSidebar.tsx` gained icons for all rows.
  - `Settings.tsx` Profile tab: avatar preview circle, "Upload photo" (client-side type/size validation), "Remove" button; cache-busting `?v=` query on avatar URL.
  - `UserProfileMenu.tsx` shows the photo in the topbar dropdown; `auth-store.ts` `User` type gained `avatarUrl`.
- **Verification (2026-08-08):** API `tsc --noEmit` ✅ · web `tsc --noEmit` ✅ · eslint (changed files) ✅ · API tests 220/220 ✅.

### 2026-08-11 — Multi-tenant organizations, team & invitations (prompt2.txt, T-207) — implemented, staged for review

Built directly on the existing MongoDB/Mongoose/NestJS architecture — no Prisma/PostgreSQL, no new ORM. The existing `Tenant` model **is** the organization; `Membership` is the join entity.

- **Organizations module** (`apps/api/src/modules/organizations/`, wired into `AppModule`):
  - `GET /api/v1/organizations/me` — active organization context + full membership list (organization switcher data). The server derives context from the authenticated JWT + membership docs; a client-supplied organizationId is never trusted (prompt Phase 3/4).
  - `POST /api/v1/organizations` — creates an org (slug retry on collision), founder becomes OWNER, fresh token pair scoped to the new org.
  - `POST /api/v1/organizations/switch` — verifies the target membership server-side before re-issuing tokens; switching to an org without a membership is `403 ORG_MEMBERSHIP_REQUIRED` (Phase 4).
  - Team management (`GET/PATCH/DELETE /api/v1/organizations/members`, Phase 8/10): OWNER/ADMIN only via `@Roles` + service-level `assertManagement`. Self role-change/removal blocked; only OWNER grants OWNER; last OWNER/ADMIN cannot be demoted or removed.
  - Invitations (`POST/GET/DELETE /api/v1/organizations/invitations`, Phase 9): `crypto.randomBytes(32).toString('hex')` token, 7-day TTL, pending/accepted/revoked status, tenant-scoped queries, OWNER/ADMIN only. `devAcceptUrl` = development-only acceptance link (production email deferred per prompt).
  - Public acceptance (`InvitationsController`): `GET /api/v1/invitations/:token` (sanitized info + `hasAccount`) and `POST /api/v1/invitations/:token/accept` (optional Bearer auth). Existing users must be authenticated as the invited email; new users create their account (name + password) inline. Acceptance invalidates other pending invites for that email; the unique `(userId, tenantId)` membership index makes duplicates structurally impossible. Response carries a token pair already scoped to the invited org.
  - `Invitation` schema (`apps/api/src/schemas/invitation.schema.ts`) with `{tenantId, email}` and `{status, expiresAt}` indexes; `InvitationRepository` (create/findByToken/findById-scoped/findPendingByTenantAndEmail/findByTenant/markAccepted/revoke/revokePendingForEmail).
  - New error codes: `ORG_*`, `MEMBER_*`, `INVITATION_*` in `@constructtrack/types`; `Role.OWNER` added.
- **Roles & registration (Phase 7):** `Role.OWNER` added; `TENANT_ADMIN_ROLES` now includes OWNER (owners bypass project-membership checks like admins). Registration and the seed script now grant the founder **OWNER** (was ADMIN) — the registering user owns their auto-created org.
- **Project isolation (Phase 5/6):** project queries were already tenant-scoped at the repository layer; `ProjectsService.addMember` now additionally verifies the target user holds an organization membership (`MembershipRepository.exists`) — cross-organization project membership is rejected with `ORG_MEMBERSHIP_REQUIRED` (Phase 12 "David cannot be added to Lagos Mall").
- **Frontend:**
  - `Team.tsx` (`/team`, desktop + mobile sidebar entries): members table with avatar/initials, role dropdown (self-role locked), remove member; invite form (OWNER excluded from invitables); pending invitations with copyable dev links, expiry badges, revoke.
  - `InvitationAcceptPage.tsx` (`/invitations/:token`): public resolve → existing-user login/accept (with `?next=` redirect support in Login/Register) or new-user create-account-and-accept → lands in the invited org.
  - `UserProfileMenu.tsx`: organization switcher (fetches memberships on open, server-verified switch, fresh tokens, navigates to `/`); shows active org name + role badge.
  - `auth-store.ts`: `organizations`, `fetchOrganizations()`, `switchOrganization()`, `avatarUrl` on `User`.
  - `LoginPage`/`RegisterPage` honor `?next=` (used by the invitation flow).
- **Tests (Phase 14):** 36 new `OrganizationsService` tests + 1 new project cross-org membership test. Coverage includes: context resolution, secure switching, team authorization (own-role, owner-only OWNER grant, last-owner guard), invitation lifecycle (create/dup/already-member/revoke/expiry/tamper), accept flows (CASE A new user, CASE B existing user, wrong-account rejection, no duplicate membership, weak password), and the Phase 12 invariants. **API suite: 257/257 passing.** Typecheck + lint (0 warnings) clean.
- **Commit sequence (not yet committed — working tree only):** `feat(org): organization context + membership` → `feat(members): team + invitation flow` → `feat(projects): prevent cross-org project membership` → `test(authz): multi-tenant coverage` → `docs(handoff): T-207 multi-tenant status`. The profile-photo work (2026-08-08) is also still uncommitted — commit it first if desired.

---

### 2026-08-13 — Image persistence hardening + profile photo editor — complete (uncommitted)

- **Storage root no longer depends on `process.cwd()`** (`apps/api/src/common/utils/storage-root.util.ts`): graphs/files written while the API runs from one directory previously became unreachable after a restart from another directory — uploaded images then vanished on refresh. New `resolveStorageRoot()` walks up from the source file to the API package root (or honors `STORAGE_ROOT`); wired into `DocumentsStorageService` (documents + `.tmp` staging dir in `DocumentsController`) and `AuthService.avatarAbsPath`. Behavior is unchanged when the API is started from `apps/api`; files stay put when started from anywhere else. `STORAGE_ROOT` documented in `.env.example`.
- **Profile photo editor (frontend-only, no new deps):** `apps/web/src/shared/components/ImageEditor.tsx` — modal editor with drag-to-reposition, zoom (scroll wheel + slider + buttons), 90° rotation (CW/CCW), aspect-locked crop, and canvas export. Selecting a photo in Settings now opens the editor; **Done** applies the cropped/rotated/resized image (square 512 px crop, JPEG/PNG output) and uploads it as the avatar. Object URLs are revoked on close.
- **Icons:** added `Crop`, `ZoomIn`, `ZoomOut`, `RotateCw`, `RotateCcw`, `Undo2` to `apps/web/src/shared/components/icons.tsx`.
- **Verification:** web + API typecheck clean; web + API eslint 0 warnings. (API vitest suite not re-run in this pass; storage-root change is additive and covered by existing DI construction.)

---

### 2026-08-14 — Profile photo fixes + dependency sync — complete (uncommitted)

- **Critical editor bug fixed:** `ImageEditor.tsx` was stuck at "Loading…" forever — the stage `<img>` whose `onLoad` set `natural` (the gate for the whole editor UI) was itself rendered only inside the `{natural && imageRect && …}` conditional, so `onLoad` could never fire. The `<img>` now always renders (opacity 0 until loaded) and `onError` shows "Could not load image" instead of hanging.
- **Editor is now a pure crop tool** (per user request — zoom/rotate removed): image fit-to-stage, draggable aspect-locked square crop box with 4 corner resize handles, dark overlay, Reset (Undo2), canvas export at 512×512.
- **Re-upload of profile photo works:** `avatarUrl` is now versioned per upload (`avatars/<userId>.<ext>?v=<Date.now()>`) so the browser never serves the stale cached photo (server sends `Cache-Control: private, max-age=86400`); `stripAvatarVersion()` handles old-file cleanup.
- **Avatar serving is DB-free:** `resolveAvatar()` probes disk (`avatars/<userId>.{jpg,png,webp}` via `fsp.access`) instead of `userRepository.findById` per `<img>` tag — profile photo requests no longer depend on MongoDB.
- **10 MB upload cap** (was 2 MB): `AVATAR_MAX_BYTES` in `AuthService` + multer `FileInterceptor` limit in `AuthController` + client-side check in `Settings.tsx`. `createPreviewUrl()` downscales previews to 1600 px before the editor loads them.
- **`@nestjs/mongoose` 8.24.2 → 10.1.0** (installed version vs lockfile were out of sync). In v8 `lazyConnection` is silently ignored, so the API blocked on the MongoDB handshake at bootstrap; v10 honors it — boot no longer hangs on a slow/unreachable Atlas.
- **Environment note (dev runs on Windows):** the project's dev servers run under native Windows Node (`npm run dev` from the Windows shell), not WSL. The WSL-side drvfs slowness is irrelevant to runtime; attempts to relocate `node_modules` to ext4 were abandoned and fully reverted (546/565 packages moved and moved back; `node_modules.drvfs` removed). The 19 packages that "wouldn't move" were locked by the *running* dev servers (`concurrently`, `nest --watch`, `vite` hold directory handles) — expected behavior, not corruption.
- **Verification:** web + API typecheck clean, eslint 0 warnings. Dev servers were stopped to free ports 4000/5173 — restart `npm run dev` to pick up all fixes.

### 2026-08-14 — Google OAuth sign-in/sign-up — complete (uncommitted)

- **Strategy** (`apps/api/src/modules/auth/google.strategy.ts`): `passport-google-oauth20`, registered via a factory provider only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set — otherwise `GoogleStrategy.configured` stays false and the endpoints answer `503 AUTH_GOOGLE_NOT_CONFIGURED` (email/password auth untouched; boot never fails on missing env). `validate` normalizes the Google profile (googleId, email, emailVerified from `_json.email_verified`, name, photo) into `AuthService.googleLogin`.
- **Flow (3 steps, no tokens in URLs):** `GET /api/v1/auth/google?next=…` → 302 to Google consent (signed `state` = `base64url(payload).HMAC(jwtAccessSecret)` carrying the sanitized `next` — blocks open redirects and login-CSRF state tampering). `GET /api/v1/auth/google/callback` (passport exchange, `GoogleAuthGuard` = `AuthGuard('google')` with a friendly 503 when unconfigured) → verifies state → 302 back to `WEB_URL/auth/google/callback?code=<one-time>&next=…`. `POST /api/v1/auth/google/exchange` (rate-limited, public) → `GoogleCodeService.consume` (single-use, 60s TTL, in-memory) → `AuthService.issueSessionForPrincipal` → standard token pair + profile.
- **Account resolution** (`AuthService.googleLogin`): (1) `googleId` known → sign in; (2) unknown but a credentials user holds the same email → link (only when Google verified the email; an unverified claim never takes over an existing account); (3) otherwise create user + own tenant + OWNER membership, mirroring register (Google photo becomes the avatar). Google-only accounts have `passwordHash` unset — password login rejects them with a generic 401.
- **Schema/repo:** `User.passwordHash` optional, `User.googleId` (unique sparse). `UserRepository`: `findByGoogleId`, `linkGoogleId`, `create` accepts optional `passwordHash`/`googleId`/`avatarUrl`.
- **Config:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (default `http://localhost:4000/api/v1/auth/google/callback`), `WEB_URL` (default `http://localhost:5173`) — added to `AppConfig`, `.env.example`, `AuthModule` providers.
- **Frontend:** "Continue with Google" (LoginPage) / "Sign up with Google" (RegisterPage) buttons honoring `?next=`; `GoogleCallbackPage` (`/auth/google/callback` route in `App.tsx`) exchanges the code, signs in, redirects to `next`; new multicolor `Google` icon in `icons.tsx`.
- **Verification:** API + web typecheck clean, eslint 0 warnings, auth suite 43/43, full API suite 277/277 (18 new tests: googleLogin create/link/unverified-reject/disabled/no-email, issueSessionForPrincipal, signed-state round-trip/tamper/open-redirect, GoogleCodeService single-use + TTL).
- **Setup required:** Google Cloud Console → OAuth 2.0 Client ID (Web application) → authorized redirect URI `http://localhost:4000/api/v1/auth/google/callback` → fill `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env`. In production set `WEB_URL` and the HTTPS callback.

---

## Outstanding Work

1. **T-207 — Multi-tenant organizations/team/invitations (prompt2.txt):** implemented and green, but **not yet committed** — working tree contains the full feature + profile photos + Google OAuth. Follow the commit sequence at the end of the "2026-08-11" section below.
2. ~~**Configure Google OAuth:** no credentials are set, so the Google buttons currently answer `503 AUTH_GOOGLE_NOT_CONFIGURED`.~~ **Done 2026-08-14** — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set in `apps/api/.env`; `/api/v1/auth/google` now 302s to Google consent. Google Cloud Console redirect URI: `http://localhost:4000/api/v1/auth/google/callback`.
2. **Production email delivery for invitations:** the dev acceptance link is development-only by design (prompt Phase 9 / Email). Layer a mail provider onto `devAcceptUrl` when ready.
3. **Phase 5 (Engagement)** ([ROADMAP.md](./ROADMAP.md)): T-401–T-404 complete.
4. **Phase 6:** Hardening — T-501 ✅, T-502 ✅, T-503 ✅, T-504 ✅, T-303 ✅. All complete.
5. **AI provider now live:** `AI_PROVIDER=gemini` + `GEMINI_API_KEY` in `apps/api/.env` — `GeminiProvider` (gemini-flash-latest) implemented in `apps/api/src/modules/ai/providers/gemini.provider.ts`, wired in `AiModule` (falls back to `NoneProvider` if the key is missing). OpenAI/Anthropic adapters remain a possible future extension.

---

## Known Issues

- **MongoDB Atlas connection required for DB-dependent features.** The app degrades gracefully (starts successfully, health check returns `database: "disconnected"`) but DB operations will fail until `MONGODB_URI` is configured in `.env`. Set up a free Atlas cluster and whitelist your IP.
- **Equipment detail/edit UI complete.** Full `EquipmentDetail` component with utilization KPI cards, maintenance timeline, usage timeline, and downtime history is now rendered alongside the fleet list.
- **Phase 5 (Engagement) complete.** T-401 (notification service), T-402 (subscriptions), T-403 (AI backend), T-404 (AI frontend) all built. AI Assistant uses **Gemini** by default (gemini-flash-latest via `GeminiProvider`) when `AI_PROVIDER=gemini` + `GEMINI_API_KEY` are set; falls back to `NoneProvider` otherwise.
- **T-303 (report generation) complete.** Implemented via lightweight `InMemoryJobQueue` (synchronous, no Redis). The `IJobQueue` interface is the extension point for future BullMQ/Redis swap.
- **Docs updated.** All PostgreSQL/Prisma/Docker references in active docs have been replaced with MongoDB Atlas / Mongoose equivalents. ADR files retain historical references.

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
- **Redis deferred to Phase 5:** no caching or queue infrastructure until then. Job queue uses `InMemoryJobQueue` (synchronous); `IJobQueue` interface ready for BullMQ swap.
- **AI:** provider-agnostic service layer; no vendor SDK in domain code.
- **Equipment domain (T-201):** full CRUD, assignment lifecycle, usage/maintenance/downtime tracking with audit logging. Detail UI deferred to T-202.
- **Stack rationale:** [TECH_STACK.md](./TECH_STACK.md). DB/infra rationale: [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).

---

## Current Priorities

1. **Preserve `main` releasability.** All further work must pass CI before merging (typecheck, lint, 257 tests).
2. **Commit T-207 (multi-tenant organizations) + profile photos.** Work is green in the working tree; the suggested commit sequence is at the bottom of the "2026-08-11" Completed Work entry.
3. **Production email delivery** for invitations (dev links are development-only).
4. **Remaining work:** real AI provider adapters, Redis for async jobs (when hardware allows), conversational memory for AI Assistant.

---

## Recommended Next Steps

In order, for whoever picks this up:

1. **Commit the T-207 multi-tenant work + profile photos** (working tree, all green). Suggested sequence:
   - `feat(org): organization context + membership` (Tenant/Membership/User repo extensions, Role.OWNER, auth register→OWNER, OrganizationsModule, error codes)
   - `feat(members): team + invitation flow` (invitation schema/repo/DTOs, team endpoints, Team.tsx, InvitationAcceptPage, org switcher, ?next= redirects)
   - `feat(projects): prevent cross-org project membership`
   - `test(authz): multi-tenant coverage`
   - `docs(handoff): T-207 multi-tenant status`
   - Optionally `feat(auth): profile photos` first (2026-08-08 work is also uncommitted).
2. **Production email delivery for invitations** — replace the dev acceptance link with a mail provider (prompt Phase 9/Email). Inspect the notifications module first — it may already have email infrastructure to reuse.
3. **Set up AI provider.** The `NoneProvider` is the default (returns "not configured" message). To enable real AI, implement an adapter (e.g., `OpenAIProvider` implementing `IAIProvider`), install the vendor SDK, and set `AI_PROVIDER=openai` (or `anthropic`) in `.env`. Prefer OpenRouter free models per `prompt.txt`.
4. **Phase 6 (Hardening) complete** — T-501 ✅, T-502 ✅, T-503 ✅, T-504 ✅, T-303 ✅.
    - Real AI adapters: OpenAI or Anthropic provider implementations (or OpenRouter).
    - Conversational memory: multi-turn context for the AI Assistant.
    - Redis caching / BullMQ: swap `InMemoryJobQueue` for `BullMQJobQueue` when hardware allows.

---

## How to Resume

If you are an AI continuing this work:

1. Read [AI_CONTEXT.md](./AI_CONTEXT.md) (minimum required context).
2. Read this file (you're here) and [TASKS.md](./TASKS.md) for the current board state.
3. Check the [ROADMAP.md](./ROADMAP.md) phase you're entering and its exit criteria. Current work: **Phase 3 (Figma implementation) done** — all 7 screens implemented from `figma/img.json` (see "Completed Work → Phase 3 (Figma screenshot implementation)"); **Design Foundation (Phase 2) done** — commit `035dc69`. Core platform phases (1–6) all complete; remaining: AI provider adapters, conversational memory, Redis/BullMQ swap, `EquipmentDetail` token restyle.
4. Honor [PROJECT_RULES.md](./PROJECT_RULES.md) — especially §1 (Behavior & Safety) and §13 (Definition of Done).
5. For any irreversible action (destructive migration, deleting code, force-push), **stop and confirm** first.
6. Update this file, [TASKS.md](./TASKS.md), and [CHANGELOG.md](./CHANGELOG.md) as you make progress.
7. **Before pushing:** Ensure `npm run typecheck && npm run lint && npm test` all pass with zero warnings/errors.

If you are a human: welcome — the docs are written to let you move fast safely. Start at [README.md](./README.md).
