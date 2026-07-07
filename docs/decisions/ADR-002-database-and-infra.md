# ADR-002: MongoDB Atlas, Mongoose, and Docker-Free Development

**Status:** Accepted
**Date:** 2026-07-03
**Deciders:** Project leads / architecture team
**Supersedes:** [ADR-001 §4 (PostgreSQL 16)](./ADR-001-project-foundation.md#4-postgresql-16-as-the-single-source-of-truth-not-mongodb-not-multi-db) and §5 (Docker/Nginx infrastructure)
**Related:** [BIBLE.md](../../BIBLE.md), [TECH_STACK.md](../../TECH_STACK.md), [ROADMAP.md](../../ROADMAP.md)

---

## Context

ADR-001 established PostgreSQL 16 as the system of record and Docker Compose + Nginx as the development/deployment infrastructure. During Phase 1 planning, the following constraints and directives emerged that invalidate those specific choices:

1. **No Docker for development.** The project must be fully runnable with `npm install && npm run dev` on any machine (Windows or Linux) without requiring Docker, Docker Compose, or any container runtime.
2. **MongoDB Atlas as the database.** A managed MongoDB Atlas cluster replaces a local PostgreSQL instance. This eliminates the need for local DB installation and operations.
3. **Swappable database layer.** The persistence layer must be abstracted behind a repository interface so the database can be swapped in the future (e.g., to PostgreSQL) without rewriting business logic.
4. **Redis deferred to Phase 5.** No caching or queue infrastructure in Phase 1–4. Background work (reports, notifications, AI) will use an in-process or lightweight alternative until Phase 5 introduces Redis.
5. **npm workspaces** (not pnpm) for the monorepo.

These directives are driven by a desire for zero-infrastructure onboarding: a new contributor clones the repo, runs `npm install`, sets one environment variable (the Atlas connection string), and is productive immediately.

---

## Decision

### 1. MongoDB Atlas as the system of record

All tenant-scoped data is stored in MongoDB Atlas. Documents are organized in collections with Mongoose schemas defining the shape, validation, and indexes.

**Why:**
- **Managed service:** no local DB installation, no backups to configure, no version upgrades to run. Atlas handles replication, automatic failover, and PITR.
- **Free tier available:** the M0 cluster is sufficient for development and early staging, keeping the barrier to entry at zero.
- **Flexible schema:** construction domains have heterogeneous data shapes (daily logs, equipment telemetry, report metadata). MongoDB's document model accommodates this without migrations for every schema tweak.
- **Swappable:** the repository interface (see §2) means MongoDB is a choice, not a commitment. If relational guarantees become critical (e.g., for complex financial reporting), a `PrismaXxxRepository` can replace the Mongoose implementation without touching services.

**Trade-off:** we lose PostgreSQL's foreign-key enforcement and multi-table transactions. Mitigations:
- Application-level validation via Mongoose schemas and Zod DTOs.
- Compound indexes enforce uniqueness (e.g., userId + tenantId on memberships).
- Multi-document atomic operations via MongoDB transactions where needed (supported on replica sets, which Atlas provides).

### 2. Mongoose ODM behind a repository interface

Every domain module follows the pattern: `XxxModule` → `XxxService` → `XxxRepository` (interface) → `MongooseXxxRepository` (implementation) → Mongoose schema → MongoDB Atlas.

The repository interface is defined in `packages/types` (or per-module) and looks like:

```typescript
interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  find(filter: Partial<T>, options?: PaginationOptions): Promise<PaginatedResult<T>>;
  create(data: CreateDto<T>): Promise<T>;
  update(id: string, data: UpdateDto<T>): Promise<T>;
  delete(id: string): Promise<void>;
  exists(filter: Partial<T>): Promise<boolean>;
  count(filter: Partial<T>): Promise<number>;
}
```

The concrete `BaseRepository<T>` extends this with Mongoose-specific logic (automatic `tenantId` scoping, soft-delete hooks). Domain repositories extend `BaseRepository` with domain-specific queries.

**Why:**
- **Swappability:** swapping MongoDB for PostgreSQL means writing a new `PrismaXxxRepository` per domain — services remain untouched.
- **Testability:** repositories can be mocked or replaced with in-memory implementations for unit tests.
- **Tenant isolation:** the base repository automatically injects `tenantId` on every query, making cross-tenant leakage structurally impossible at the data-access layer.

**Why Mongoose (not Prisma MongoDB, not raw MongoDB driver):**
- Mongoose provides schema validation, middleware (pre/post hooks for audit trails), and TypeScript schema definitions that integrate well with NestJS's `@nestjs/mongoose`.
- Prisma's MongoDB support is newer and less battle-tested than its PostgreSQL support. For our use case, Mongoose's maturity and ecosystem outweigh Prisma's type-safe client advantage.
- Raw driver is too low-level — we'd re-implement validation, hooks, and lifecycle management.

### 3. No Docker, no Docker Compose, no containerized development

The project does not use Docker for development. All services are started via npm scripts:

- `npm run dev` — starts API (NestJS) and web (Vite) concurrently.
- `npm run build` — compiles both apps.
- `npm run test` — runs unit tests.
- `npm run seed` — seeds MongoDB Atlas with dev data.
- `npm run lint` / `npm run typecheck` — quality gates.

**Why:**
- Docker adds a heavy prerequisite (Docker Desktop, daemon management, resource allocation) that is unnecessary when the database is a managed service.
- npm scripts work identically on Windows and Linux without additional tooling.
- CI uses `mongodb-memory-server` for integration tests (no Docker required in GitHub Actions either).

**Trade-off:** local development relies on network access to MongoDB Atlas. If offline, DB-dependent features won't work. The health check endpoint reports this status, and the app degrades gracefully (starts successfully, returns `database: "disconnected"` on the health probe).

### 4. Redis deferred to Phase 5

No Redis, no BullMQ, no session cache in Phase 1–4. Background work (if needed before Phase 5) uses in-process alternatives.

**Why:**
- Redis was chosen in ADR-001 for cache, session store, and BullMQ queue backend. In Phase 1, there are no background jobs, no session caching (JWT stateless auth), and no hot-path caching needs.
- Deferring Redis removes another external service dependency from the Phase 1 stack.
- Phase 5 (Engagement: Notifications, AI Assistant) introduces background jobs that justify Redis + BullMQ. At that point, it can be added as an optional service without restructuring the architecture (the queue interface is already planned).

### 5. npm workspaces monorepo

The monorepo uses npm workspaces (not pnpm). Root `package.json` defines `workspaces: ["apps/*", "packages/*"]`.

**Why:**
- npm is ubiquitous; every Node.js installation includes it. No additional package manager to install or configure.
- npm workspaces support workspaces protocol (`workspace:*`) for intra-monorepo dependencies, matching our needs.
- Consistent with the "zero extra tooling" directive.

---

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| PostgreSQL 16 (local) | Requires local installation or Docker; managed Postgres (RDS/Neon) adds cost and complexity without clear benefit at our current scale. Swappable via repository pattern if needed later. |
| Docker Compose for development | Adds a container runtime dependency. Violates the "npm scripts only, works on Windows and Linux without Docker" directive. |
| Redis in Phase 1 | No caching, queue, or session-store needs in Phase 1. Premature infrastructure. |
| Prisma MongoDB | Newer and less mature than Mongoose for MongoDB. Less community support, fewer NestJS integration patterns. |
| Raw MongoDB driver | Too low-level; we'd re-implement schema validation, lifecycle hooks, and middleware that Mongoose provides for free. |
| pnpm workspaces | Requires installing pnpm. npm is sufficient and pre-installed with Node.js. |
| In-memory DB (e.g., SQLite) | Would complicate the swappable-repository pattern; MongoDB Atlas free tier is zero-cost and zero-ops. |

---

## Consequences

### Positive
- **Zero-infrastructure onboarding:** `npm install && npm run dev` on any machine with Node.js.
- **Managed database:** no local DB to install, configure, back up, or upgrade.
- **Swappable persistence:** the repository interface means MongoDB is a choice, not a commitment.
- **Simpler CI:** no Docker-in-Docker, no service containers — just `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`.
- **Faster Phase 1:** one fewer service (Redis) to wire, one fewer technology (Docker) to learn.

### Negative
- **No foreign keys:** MongoDB does not enforce referential integrity at the database level. We rely on application-level validation and compound indexes.
- **Network dependency:** local development requires internet access to MongoDB Atlas. Offline development degrades gracefully but cannot persist data.
- **Schema flexibility is a double-edged sword:** without migrations enforcing schema contracts, discipline is required to keep Mongoose schemas as the authoritative shape definition.
- **Atlas free-tier limits:** M0 clusters have connection limits and storage caps. These are acceptable for development and early staging but will require upgrading before production.

### Neutral
- The repository pattern adds a thin abstraction layer. This is minimal overhead and aligns with clean architecture principles ([PROJECT_RULES.md §2](../../PROJECT_RULES.md#2-architecture--structure)).

---

## Compliance with BIBLE.md Principles

| Principle | How this ADR upholds it |
| --- | --- |
| One source of truth | MongoDB Atlas is the single DB; Mongoose schemas define the data model; docs precede code |
| Simplicity over cleverness | No Docker, no extra services; `npm run dev` and you're running |
| Reversibility | Repository interface preserves the option to swap to PostgreSQL or any other DB |
| Security is a feature | Tenant isolation enforced in the base repository layer, verified by tests |
| Documentation is the foundation | ADR-002 documents the change before any code is written |

---

## Impact on ADR-001

ADR-001's §4 (PostgreSQL 16) and its infrastructure references (Docker, Nginx, Redis) are superseded by this decision. ADR-001's other sections remain valid:

- §1 (Modular Monolith) — unchanged.
- §2 (Shared TypeScript) — unchanged.
- §3 (React 18 SPA) — unchanged; "behind Nginx" becomes "served as static assets" in production.
- §5 (Documentation-first) — unchanged.
- §6 (AI as provider-agnostic enhancement) — unchanged.
