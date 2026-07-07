# Backend Architecture

> How the ConstructTrack API is structured: a NestJS modular monolith with strict layering — controllers translate HTTP, services hold business logic, Prisma owns data access — enforced by TypeScript strict mode, validation at the edge, and authorization in the service layer.

Companion docs: [system.md](./system.md) (whole-system view), [database.md](./database.md) (persistence detail), [docs/api/](../api/) (HTTP contract), [../security/authentication.md](../security/authentication.md), [../security/authorization.md](../security/authorization.md), [BIBLE.md §6](../../BIBLE.md#6-architecture-overview).

---

## Table of Contents

- [Overview](#overview)
- [Module Structure](#module-structure)
- [Layering & Dependency Rule](#layering--dependency-rule)
- [Request Pipeline](#request-pipeline)
- [Domain Modules](#domain-modules)
- [Cross-Cutting Services](#cross-cutting-services)
- [Data Access (Prisma)](#data-access-prisma)
- [Background Processing](#background-processing)
- [Events & Notifications](#events--notifications)
- [Error Handling](#error-handling)
- [Logging & Observability](#logging--observability)
- [Configuration](#configuration)

---

## Overview

The backend is a single NestJS application (Node.js 20 LTS, TypeScript strict) composed of independently developed **domain modules**. We chose NestJS for its opinionated, dependency-injected structure — modules, providers, controllers, and pipes are first-class — which keeps a long-lived project built by many hands and AI models consistent ([TECH_STACK.md](../../TECH_STACK.md)).

Design tenets (mirrored from [PROJECT_RULES.md §5](../../PROJECT_RULES.md#5-backend-rules)):

- **Validation at the edge** — DTOs + class-validator; controllers trust nothing raw.
- **Authorization in the service** — re-checked on every mutation, never only in the controller.
- **Business logic in services** — controllers translate HTTP ↔ domain, nothing more.
- **Background work to a queue** (BullMQ), never in-process `setTimeout`.
- **Every mutation auditable.**

## Module Structure

Each domain is a self-contained NestJS module under `apps/api/src/modules/<domain>/`:

```
modules/projects/
├── projects.module.ts        # Wires controllers, services, providers
├── projects.controller.ts    # HTTP layer (thin)
├── projects.service.ts       # Business logic + authorization
├── dto/                      # Request/response DTOs + class-validator rules
│   ├── create-project.dto.ts
│   └── project.query.dto.ts
├── entities/                 # Domain entity types (mapped from Prisma models)
├── events/                   # Domain event emitters
├── projects.repository.ts    # Prisma access scoped to this module
└── __tests__/                # Unit + integration tests
```

A module declares its public API via its `.module.ts` `exports` and may consume other modules only through their exported services. Direct cross-module repository access is forbidden — this preserves the extractability described in [system.md → Scalability Path](./system.md#scalability-path).

## Layering & Dependency Rule

Dependencies point **inward**, one direction:

```
   Controller  ──▶  Service  ──▶  Repository  ──▶  Prisma  ──▶  PostgreSQL
   (HTTP)          (domain)       (data access)                (truth)
```

- **Controller** parses and validates input, calls a service, shapes the response envelope. No business rules.
- **Service** enforces authorization, runs business logic inside transactions where needed, emits domain events, writes the audit log. This is where decisions live.
- **Repository** isolates Prisma queries for one domain, making them mockable and consistent.
- **Prisma** is the single ORM; the schema is authoritative ([database.md](./database.md)).

A service may call another module's *exported service*, but never another module's repository or controller. This single rule prevents the tangle that ages most monoliths.

## Request Pipeline

NestJS composes the request through a deterministic pipeline. Order matters:

1. **Middleware** — request id injection, body parsing, CORS.
2. **Global guards** — JWT verification → attaches `user` and `tenantId` to the request context. Unauthenticated requests stop here (401).
3. **Global pipes** — `ValidationPipe` maps the body/query to the DTO and runs class-validator rules. Invalid input stops here (400).
4. **Controller** — route handler, thin.
5. **Service** — authorization check (role + tenant + record ownership), business logic, persistence, audit, event emission.
6. **Interceptors** — response shaping, cache writes for hot reads, logging.
7. **Exception filter** — maps domain and unexpected errors to the standard envelope.

Every layer can short-circuit the request with a structured error ([docs/api/standards.md](../api/standards.md)).

## Domain Modules

| Module | Key responsibilities | Phase |
| --- | --- | --- |
| `auth` | Registration, login, refresh tokens, password hashing (bcrypt + pepper), sessions | 2 |
| `projects` | CRUD, phases, milestones, budget, schedule, team membership | 2 |
| `tasks` | WBS, assignment, status, priority, dependencies, completion | 2 |
| `equipment` | Registry, assignment, utilization hours, maintenance schedule, downtime | 3 |
| `inventory` | Catalog, stock levels, reorder points, allocations, delivery receipts | 3 |
| `reports` | Templates, scheduled/one-off generation, export (PDF/CSV) via queue | 4 |
| `dashboard` | Aggregated KPIs across modules (read-only, cache-heavy) | 4 |
| `notifications` | Subscriptions, delivery channels (in-app/email/push) via queue | 5 |
| `ai-assistant` | NL queries, summaries, drafting — provider-agnostic | 5 |

Behavioral specs: [docs/features/](../features/).

## Cross-Cutting Services

Shared infrastructure available to every module:

- **`AuditService`** — writes an immutable audit record (actor, action, entity, before/after) on mutating calls.
- **`AuthService` / `AuthorizationService`** — current user, role resolution, permission checks, tenant context.
- **`LoggerService`** — structured JSON logger with request/tenant/user correlation ids; never secrets/PII.
- **`CacheService`** — Redis wrapper with stale-while-revalidate for hot aggregates.
- **`QueueService`** — BullMQ producer wrapper for enqueuing jobs with idempotency keys.
- **`EventBus`** — lightweight in-process event emitter for domain events (consumed by `notifications`, cache invalidation, audit).

## Data Access (Prisma)

Prisma is the **sole** ORM; the `schema.prisma` file is the source of truth ([docs/database/schema.md](../database/schema.md)). The generated client is fully typed, eliminating an entire class of query-shape bugs.

Conventions ([PROJECT_RULES.md §6](../../PROJECT_RULES.md#6-database-rules)):

- **Tenant isolation** is enforced by a Prisma client extension that injects `tenantId` from the request context into every query and fails closed if absent. See [system.md → Multi-Tenancy Model](./system.md#multi-tenancy-model) and [docs/database/security.md](../database/security.md).
- **No `SELECT *`** — repositories select the columns they consume, keeping responses lean and intentional.
- **Transactions** wrap multi-write operations; the audit entry is written within the same transaction so it never drifts from the mutation it records.
- **Migrations are append-only** and generated from the schema; never hand-edit an applied migration ([docs/database/migrations.md](../database/migrations.md)).

## Background Processing

Asynchronous work runs on **BullMQ** (Redis-backed). Producers use the `QueueService`; workers are registered per queue in a dedicated `workers/` entrypoint so they can be scaled independently of the API.

| Queue | Example jobs | Notes |
| --- | --- | --- |
| `reports` | generate weekly summary, render PDF | idempotency key required |
| `notifications` | send email, fan-out push | retries with backoff |
| `ai` | long-running LLM synthesis | per-request timeout + token cap |

Jobs log start/success/failure with a correlation id and are visible in the queue admin for debugging. Long-running or expensive operations (report rendering, AI synthesis) are **never** run inline in a request — they enqueue and return a job reference the client polls or receives via push.

## Events & Notifications

Modules emit **domain events** through the in-process `EventBus` (e.g., `task.completed`, `inventory.below-reorder`). The `notifications` module subscribes, resolves user subscriptions/preferences, and enqueues delivery jobs. This decouples producers from delivery and keeps modules unaware of notification mechanics.

Events are also used to invalidate cache entries and to drive audit for derived state. Heavy fan-out work always lands in the `notifications` queue, not the synchronous emitter.

## Error Handling

Errors are **typed** and map cleanly to the response envelope:

- **Domain errors** (`NotFoundException`, `ForbiddenException`, `ValidationException`, `ConflictException`) carry a stable error code and an optional field map; the exception filter renders them with the correct HTTP status.
- **Unexpected errors** are logged with the correlation id and returned as a generic 500 with that id — never a stack trace.

Controllers and services **do not** swallow promise rejections. Every `await` is either expected (and its failure handled) or a bug (and logged). Per [PROJECT_RULES.md §3](../../PROJECT_RULES.md#3-typescript--code-quality), no silent `catch` without a `// reason:`.

## Logging & Observability

- **Structured JSON logs** with correlation ids (request, tenant, user), level, module, and message. Configurable via `LOG_LEVEL` ([.env.example](../../.env.example)).
- **Never secrets or PII** beyond what compliance requires ([docs/security/data-protection.md](../security/data-protection.md)).
- **Health endpoint** reports DB/Redis/queue connectivity for load balancer and uptime checks.
- **Tracing/metrics** (OTLP/Sentry hooks) are wired at bootstrap; full dashboards land in [ROADMAP.md](../../ROADMAP.md) Phase 6.

## Configuration

All runtime configuration is **environment-driven**, validated at boot. The app refuses to start if a required variable is missing or malformed — fail fast over silent misconfiguration. The complete variable list with defaults and `[REQUIRED]` markers lives in [.env.example](../../.env.example). Secrets are never hardcoded ([PROJECT_RULES.md §8](../../PROJECT_RULES.md#8-security-rules)).
