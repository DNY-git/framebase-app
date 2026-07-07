# System Architecture

> Bird's-eye view of how ConstructTrack fits together: a multi-tenant modular monolith serving a feature-based SPA, backed by PostgreSQL as the source of truth, Redis for cache/queue, and a provider-agnostic AI layer.

This is the entry point to the architecture docs. Drill into [frontend.md](./frontend.md), [backend.md](./backend.md), [database.md](./database.md), and [ai.md](./ai.md) for depth. For the *why*, see [BIBLE.md §6](../../BIBLE.md#6-architecture-overview) and [TECH_STACK.md](../../TECH_STACK.md).

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [System Context Diagram](#system-context-diagram)
- [Component Inventory](#component-inventory)
- [Module Dependencies](#module-dependencies)
- [Request Lifecycle & Data Flow](#request-lifecycle--data-flow)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [Background Jobs](#background-jobs)
- [AI Integration](#ai-integration)
- [Cross-Cutting Concerns](#cross-cutting-concerns)
- [Scalability Path](#scalability-path)

---

## High-Level Overview

ConstructTrack is a **modular monolith**: a single NestJS application composed of domain modules with strictly bounded responsibilities. We chose this over microservices on day one because the domains are tightly related (projects → tasks → equipment → inventory), a single relational database gives us transactional integrity across them, and a distributed system's operational cost isn't justified at our scale.

The modular structure preserves the *option* to extract a module into a service later — boundaries are enforced by module interfaces today, not by accidental coupling. This is a deliberate [BIBLE.md §4](../../BIBLE.md#4-core-principles) "reversibility" decision; see [TECH_STACK.md → Rejected Alternatives](../../TECH_STACK.md#rejected-alternatives).

The frontend is a **feature-based SPA** (React) that consumes a versioned REST API. Every interactive surface is mobile-first and role-aware.

## System Context Diagram

```
                       ┌──────────────────────────────────────────────┐
   Browser / Mobile ──▶│  Nginx                                        │
   (field crew, PM,    │  • TLS termination                            │
    admin, exec)       │  • Static SPA hosting                         │
                       │  • Reverse proxy → /api/*                      │
                       │  • Gzip, security headers, rate limiting       │
                       └──────────────────────┬───────────────────────┘
                                              │ HTTPS
                       ┌──────────────────────▼───────────────────────┐
                       │  API — NestJS Modular Monolith                │
                       │  ┌─────────────────────────────────────────┐ │
                       │  │ Modules:                                │ │
                       │  │  auth · projects · tasks · equipment    │ │
                       │  │  inventory · reports · notifications    │ │
                       │  │  ai-assistant · dashboard               │ │
                       │  └─────────────────────────────────────────┘ │
                       │  Shared: validation · authz · audit · logger │
                       └─────┬────────────┬───────────────┬───────────┘
                             │            │               │
                  ┌──────────▼──┐  ┌──────▼──────┐  ┌──────▼──────────────┐
                  │ PostgreSQL  │  │   Redis 7   │  │  AI Provider(s)     │
                  │   16        │  │ • cache     │  │  (OpenAI/Anthropic) │
                  │ (truth)     │  │ • sessions  │  │  via abstraction    │
                  └─────────────┘  │ • BullMQ    │  └─────────────────────┘
                                   └─────────────┘
```

External (out-of-process) integrations: SMTP for email, S3-compatible storage for uploads, Sentry/OTLP for observability — all configured via environment (see [.env.example](../../.env.example)).

## Component Inventory

| Module | Responsibility | Phase |
| --- | --- | --- |
| `auth` | Registration, login, JWT access/refresh, sessions, password hashing | 2 |
| `projects` | Project lifecycle: phases, milestones, budget, schedule, membership | 2 |
| `tasks` | Hierarchical work breakdown, assignment, status, dependencies | 2 |
| `equipment` | Fleet registry, assignment, utilization, maintenance, downtime | 3 |
| `inventory` | Materials catalog, stock levels, reorder points, allocations | 3 |
| `reports` | Template-based report builder, scheduling, export (PDF/CSV) | 4 |
| `dashboard` | Org-wide KPIs aggregated from all modules | 4 |
| `notifications` | In-app, email, push driven by domain events + subscriptions | 5 |
| `ai-assistant` | NL Q&A, summaries, risk surfacing, report drafting | 5 |

Shared cross-cutting services (not domain modules): validation, authorization, audit logging, structured logger, error handling, rate limiter, cache manager.

Each module's behavior is specified under [docs/features/](../features/).

## Module Dependencies

Dependencies point inward toward the foundational modules. A module may not depend on a later-phase module.

```
        ┌──────────┐
        │   auth   │ ◀──── foundational (every module depends on auth + tenancy)
        └────┬─────┘
             │
   ┌─────────▼─────────┐
   │     projects      │ ◀──── depends on auth
   └───┬──────┬────────┘
       │      │
   ┌───▼──┐ ┌─▼──────────┐ ┌────────────┐
   │ tasks│ │ equipment  │ │ inventory  │  ◀── depend on projects (+ auth)
   └──────┘ └─────┬──────┘ └─────┬──────┘
                  │              │
                  └──────┬───────┘
                         │  (tasks may reference equipment/material usage)
            ┌────────────▼────────────┐
            │ reports · dashboard     │ ◀── read across tasks/equipment/inventory
            │ notifications           │ ◀── reacts to events from all modules
            │ ai-assistant            │ ◀── reads across all tenant data
            └─────────────────────────┘
```

**Rule:** no circular dependencies. If one forms, extract a shared service into a common module.

## Request Lifecycle & Data Flow

A typical authenticated mutation (e.g., "create task"):

```
1. Browser  ── HTTPS POST /api/v1/projects/42/tasks ──▶  Nginx
2. Nginx    ── reverse proxy ──▶  NestJS controller
3. Global guards     → JWT verified, user + tenantId attached to request
4. Validation pipe   → DTO + class-validator; reject invalid input (400)
5. Controller        → thin; calls service
6. Service           → authorization check (role + tenant + record ownership)
                     → business logic
                     → Prisma transaction → PostgreSQL
                     → audit log entry written (actor, action, before/after)
7. Response          → standard envelope (see api/standards.md)
8. Side effects      → emit domain event → notifications module may enqueue
                     → cache invalidation via Redis if applicable
```

Reads follow the same path through guard/validate/service, but may short-circuit via the Redis cache layer with a stale-while-revalidate policy for hot dashboard aggregates.

## Multi-Tenancy Model

- **Strategy:** shared database, shared schema, row-level isolation via `tenantId`.
- **Every tenant-scoped table** has a `tenantId` column (FK to `tenant`), a covering index, and a NOT NULL constraint.
- **Enforcement:** Prisma client extension injects `tenantId` into every query based on the request context. A query missing a `tenantId` filter is a bug — the extension fails closed.
- **Verification:** every feature's test suite includes a **cross-tenant access test** that must fail. See [docs/security/authorization.md](../security/authorization.md) and [docs/database/security.md](../database/security.md).

This model trades some query complexity for operational simplicity (one DB to back up, one to reason about) and is appropriate until a tenant's data volume justifies dedicated infrastructure.

## Background Jobs

Asynchronous work runs on **BullMQ** backed by Redis. Jobs are durable, retryable, and idempotent.

| Queue | Producers | Work | Phase |
| --- | --- | --- | --- |
| `reports` | reports module | Generate PDF/CSV, store, notify requester | 4 |
| `notifications` | any module via domain events | Render + deliver (in-app, email, push) | 5 |
| `ai` | ai-assistant module | Long-running LLM calls, summarization, drafting | 5 |

**Idempotency:** unsafe jobs (e.g., report generation) require an idempotency key so retries don't duplicate outputs. **Observability:** every job logs start/success/failure with a correlation id.

## AI Integration

The AI assistant never calls a vendor SDK directly. Domain code talks to a **provider-agnostic service interface** (`AIProvider`), with concrete adapters for OpenAI/Anthropic selected by configuration. See [ai.md](./ai.md).

Key properties:
- **Swap-friendly:** changing providers is a config + adapter change, not a rewrite.
- **Grounded:** the assistant queries structured tenant data first, then asks the LLM to synthesize — never free-form generation over raw tenant data without grounding.
- **Tenant-scoped:** every AI query carries the caller's `tenantId`; the model never sees another tenant's data.
- **Cost-bounded:** per-request token limits and timeouts ([.env.example](../../.env.example)).

## Cross-Cutting Concerns

- **Structured logging:** JSON logs with request id, tenant id, user id, level, and context. Never secrets/PII.
- **Audit trail:** every mutating service call records actor, action, entity id, and a before/after diff. See [docs/database/security.md](../database/security.md).
- **Error handling:** a global exception filter maps domain errors to the standard response envelope ([docs/api/standards.md](../api/standards.md)). Unexpected errors are logged and returned as a generic 500 with a correlation id.
- **Rate limiting:** configurable per route, backed by Redis counters.
- **Validation:** centralized `ValidationPipe` enforces DTOs at the edge.

## Scalability Path

The modular monolith is designed to extract, not rewrite:

1. **Vertical read scaling:** caching, indexes, materialized views for dashboard aggregates.
2. **Horizontal API scaling:** the API is stateless (sessions in Redis); scale behind the load balancer.
3. **Worker scaling:** scale BullMQ workers independently of the API.
4. **Module extraction:** if a module (e.g., `reports`) becomes a bottleneck, its module boundary is already clean — extract it behind its own process/database with an ADR.

Each step is taken only when metrics justify it, and each extraction requires an [ADR](../decisions/).
