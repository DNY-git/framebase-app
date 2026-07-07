# TECH_STACK.md — Technology Decisions & Rationale

> Every major technology choice in ConstructTrack, with the **why** behind it. New dependencies or stack changes require an [ADR](./docs/decisions/) and an update here.

Companion documents: [BIBLE.md](./BIBLE.md) (principles), [docs/architecture/](./docs/architecture/) (how it fits together), [ADR-001-project-foundation.md](./docs/decisions/ADR-001-project-foundation.md) (the foundational decision record).

---

## Table of Contents

- [At a Glance](#at-a-glance)
- [Frontend](#frontend)
- [Backend](#backend)
- [Data Layer](#data-layer)
- [AI](#ai)
- [Infrastructure & DevOps](#infrastructure--devops)
- [Testing](#testing)
- [Tooling & Quality](#tooling--quality)
- [Rejected Alternatives](#rejected-alternatives)
- [Version Pinning Policy](#version-pinning-policy)

---

## At a Glance

| Area | Choice | One-line why |
| --- | --- | --- |
| Language | **TypeScript** (strict) | One language across web + API; end-to-end type safety. |
| Frontend | **React 18 + Vite** | Mature ecosystem, fast HMR, huge talent pool. |
| UI styling | **Tailwind CSS + shadcn/ui** | Utility speed + accessible, ownable components. |
| Server state | **TanStack Query v5** | Best-in-class caching, invalidation, and loading UX. |
| Client state | **Zustand** | Tiny, predictable, no boilerplate. |
| Backend | **NestJS** | Opinionated modular architecture that scales with the team. |
| ODM | **Mongoose** | Schema validation, middleware, and NestJS integration behind a swappable repository interface. |
| DB | **MongoDB Atlas (managed)** | Zero-ops document database with free tier; source of truth. |
| Cache | **Deferred to Phase 5** | Redis 7 for cache/queue will be introduced when background jobs ship. In-memory for Phase 1–4. |
| AI | **Provider-agnostic layer** | Swap OpenAI/Anthropic without touching domain code. |
| Infra | **GitHub Actions** | CI lives next to code; no container runtime required for dev or CI. |

---

## Frontend

### React 18 + TypeScript (strict)
**Why:** React remains the most widely understood component model, and TypeScript shared with the backend gives us a single source of types ([packages/types](./README.md#repository-structure)). React 18's concurrent features and suspense improve perceived performance for data-heavy dashboards.

**Alternatives considered:** Vue 3 (excellent, smaller talent pool for long-term staffing), Svelte/SvelteKit (fast and ergonomic, but ecosystem depth for complex data grids and accessibility tooling is shallower).

### Vite
**Why:** Sub-second HMR and an ES-module-native dev server keep developers in flow. Its build pipeline (Rollup) produces lean production bundles.

**Alternatives considered:** Next.js (great, but its SSR model adds complexity we don't need for an authenticated SPA behind an API), Webpack (slower, more config).

### Tailwind CSS + shadcn/ui
**Why:** Tailwind's utility classes give consistent spacing/typography and kill CSS-naming debates. shadcn/ui gives us accessible, Radix-based primitives that we **own and can modify** — critical for the field-first, mobile-first experience in [BIBLE.md §10](./BIBLE.md#10-ui-philosophy).

**Alternatives considered:** Material UI (heavy, opinionated visual identity hard to override), plain CSS modules (slower iteration, drift over time).

### TanStack Query v5
**Why:** ConstructTrack is data-dense. TanStack Query's caching, background refetch, and optimistic-update primitives are purpose-built for this, and keep server state out of our global store.

### Zustand
**Why:** For UI/client state (filters, drawers, selections), Zustand is minimal and predictable. We deliberately keep **server state in TanStack Query** to avoid duplication.

### React Router
**Why:** Mature, declarative routing that matches our nested feature areas. Route loaders/guards map cleanly to role-based access.

### React Hook Form + Zod
**Why:** Performant forms with a schema we can **share with the backend** (Zod), enforcing the same validation on both ends.

---

## Backend

### Node.js 20 LTS + NestJS
**Why:** One language across the stack (see TypeScript). NestJS provides the modular, dependency-injected, clean-architecture structure the [PROJECT_RULES.md](./PROJECT_RULES.md) demand — modules, controllers, services, and DTOs are first-class. Node 20 LTS gives long support runway and modern performance.

**Alternatives considered:**
- **Fastify/Express (bare):** more freedom, less structure — risky for a long-lived project built by many hands/AI.
- **Django/Rails:** excellent, but breaks our single-language principle and complicates shared types.
- **Go (.NET/Java):** strong for raw throughput, but over-engineered for our current scale and a second language to staff.

### Mongoose ODM (behind swappable repository interface)
**Why:** Mongoose schemas define the data model with validation, middleware (pre/post hooks for audit trails), and TypeScript integration via `@nestjs/mongoose`. The **repository interface pattern** (`IBaseRepository<T>` → `BaseRepository<T>` → domain repositories) abstracts Mongoose away from business logic, making the database swappable without rewriting services. See [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).

**Alternatives considered:** Prisma MongoDB (newer, less battle-tested for MongoDB; Mongoose has deeper NestJS ecosystem support), raw MongoDB driver (too low-level — would re-implement validation and hooks), TypeORM (primarily relational).

### class-validator + class-transformer
**Why:** DTOs with decorators validate at the edge (controllers), satisfying [PROJECT_RULES.md §5](./PROJECT_RULES.md#5-backend-rules). They pair with NestJS's validation pipe for fail-fast, typed request handling.

### BullMQ (deferred to Phase 5)
**Why:** Reports, notifications, and AI work are asynchronous by nature. BullMQ on Redis gives durable, retryable, scheduled jobs with a small operational footprint. **However, Phase 1–4 have no background work**, so Redis and BullMQ are deferred to Phase 5 (Engagement).

---

## Data Layer

### MongoDB Atlas (managed)
**Why:** The system of record. A managed document database with free-tier support, automatic replication, failover, and point-in-time recovery. Mongoose schemas define document shapes, validation rules, and indexes. Multi-tenant isolation is enforced via `tenantId` on every scoped collection and compound indexes. The repository interface pattern keeps Mongoose behind an abstraction, preserving the option to swap databases. See [ADR-002](./docs/decisions/ADR-002-database-and-infra.md).

**Alternatives considered:** PostgreSQL 16 (requires local install or Docker; managed Postgres adds cost — viable future swap via the repository pattern), MySQL (fewer advanced index/concurrency features).

### Redis 7 (deferred to Phase 5)
**Why:** Cache for hot reads (dashboards), session store, rate-limit counters, and the BullMQ backend. **Deferred** because Phase 1–4 have no caching, queue, or session-store needs. Redis will be introduced in Phase 5 when notifications and AI assistant add background jobs. In-memory cache is sufficient until then.

---

## AI

### Provider-agnostic service layer (OpenAI / Anthropic)
**Why:** The market moves fast and we will not bet the domain on one vendor. All AI calls go through an internal abstraction (`packages/...` service interface) so swapping or combining providers is a configuration change, not a rewrite. See [docs/architecture/ai.md](./docs/architecture/ai.md) and [docs/features/ai-assistant.md](./docs/features/ai-assistant.md).

**Alternatives considered:** Direct SDK coupling (vendor lock-in), self-hosted models (too costly/complex at this stage — revisit for data-residency needs).

---

## Infrastructure & DevOps

### GitHub Actions
**Why:** CI lives next to the code; matrix/parallel jobs are easy. Our pipeline runs lint → type-check → unit → build. No Docker-in-Docker, no service containers — MongoDB Atlas for integration tests and `mongodb-memory-server` for CI isolation. See [docs/deployment/ci-cd.md](./docs/deployment/ci-cd.md).

### No container runtime for development
**Why:** Docker, Docker Compose, and Nginx are intentionally excluded from the development workflow. MongoDB Atlas is a managed service; the API and web are started via `npm run dev`. This eliminates a heavy prerequisite and makes the project runnable on any machine with Node.js. See [ADR-002](./docs/decisions/ADR-002-database-and-infra.md) for the full rationale.

---

## Testing

| Tool | Scope | Why |
| --- | --- | --- |
| **Vitest** | Unit (web + API) | Jest-compatible, Vite-native, fast. |
| **Testing Library** | Component tests | User-centric assertions, accessibility-friendly queries. |
| **Playwright** | E2E | Reliable cross-browser, traces, and time-travel debugging. |
| **Disposable MongoDB (CI)** | Integration | `mongodb-memory-server` provides ephemeral DBs without Docker — matches [PROJECT_RULES.md §9](./PROJECT_RULES.md#9-testing-rules). |

Strategy: [docs/testing/strategy.md](./docs/testing/strategy.md).

---

## Tooling & Quality

- **ESLint + Prettier** — uniform style, zero warnings on `main`.
- **Husky + lint-staged** — validate before commit.
- **commitlint** — enforce conventional, imperative-mood messages.
- **Renovate / Dependabot** — stay current on patch releases; humans review majors.

---

## Rejected Alternatives (so we don't relitigate)

| Option | Rejected because |
| --- | --- |
| Next.js / SSR | Authenticated SPA; SSR adds complexity without clear benefit here. |
| GraphQL | REST with a documented envelope ([docs/api/standards.md](./docs/api/standards.md)) is sufficient and simpler for our CRUD-heavy domains; revisit if client query flexibility becomes a pain. |
| Microservices (day one) | YAGNI; a modular monolith (see [BIBLE.md §6](./BIBLE.md#6-architecture-overview)) preserves extractability without distributed-systems cost now. |
| Redux Toolkit | More ceremony than needed; Zustand + TanStack Query covers our state model. |
| Docker Compose for development | Adds a container runtime dependency; violates "npm scripts only, works on Windows and Linux without Docker" directive — see [ADR-002](./docs/decisions/ADR-002-database-and-infra.md). |
| Prisma MongoDB | Newer and less battle-tested than Mongoose for MongoDB; fewer NestJS integration patterns — see [ADR-002](./docs/decisions/ADR-002-database-and-infra.md). |

---

## Version Pinning Policy

- Pin **major** versions of all dependencies; allow minor/patch upgrades through Dependabot with review.
- Node is pinned to **LTS** releases. MongoDB Atlas version is managed by the provider.
- Lockfiles (`package-lock.json`) are committed and reviewed for transitive surprises.
- A major-version bump of any *foundational* library (React, NestJS, Mongoose, MongoDB) requires an ADR.
