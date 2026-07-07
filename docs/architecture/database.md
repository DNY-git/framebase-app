# Database Architecture

> How ConstructTrack persists and protects its data: PostgreSQL 16 as the single source of truth, Prisma as the authoritative schema and typed client, row-level multi-tenancy enforced in the data layer, and a disciplined append-only migration discipline.

Companion docs: [system.md](./system.md), [backend.md](./backend.md), [docs/database/schema.md](../database/schema.md) (entity reference), [docs/database/migrations.md](../database/migrations.md), [docs/database/security.md](../database/security.md), [BIBLE.md §12](../../BIBLE.md#12-database-philosophy).

---

## Table of Contents

- [Overview](#overview)
- [Source of Truth](#source-of-truth)
- [Multi-Tenancy Strategy](#multi-tenancy-strategy)
- [Schema Conventions](#schema-conventions)
- [Indexing Strategy](#indexing-strategy)
- [Transactions & Consistency](#transactions--consistency)
- [Soft Deletes & History](#soft-deletes--history)
- [Caching Boundary](#caching-boundary)
- [Performance & Scaling](#performance--scaling)
- [Backups & Recovery](#backups--recovery)

---

## Overview

ConstructTrack treats PostgreSQL as the **system of record** — the one place a project fact is authoritative. Redis exists only for cache and queue, never as truth ([BIBLE.md §12](../../BIBLE.md#12-database-philosophy)). The schema is relational because the domains are: projects contain tasks, tasks consume equipment hours and materials, reports aggregate across all of them. ACID guarantees, foreign keys, and check constraints are foundational, not optional.

Access is mediated exclusively by **Prisma**. The `prisma/schema.prisma` file is the contract: it generates the typed client, drives migrations, and documents the model. App code never writes raw SQL by default — when it must (for performance), the query is reviewed and documented.

## Source of Truth

- **`schema.prisma` is authoritative.** Models defined there are the canonical shape; the generated client is what services import. See [docs/database/schema.md](../database/schema.md) for the human-readable entity reference.
- **Migrations follow the schema**, not the other way around: we edit `schema.prisma`, then generate a migration with `prisma migrate dev`. We never edit an applied migration's intent — if a migration is wrong, we write a corrective one.
- **Constraints are real.** Foreign keys, `NOT NULL`, `UNIQUE`, and `CHECK` constraints are enforced in the DB, not merely validated in the app. The app validates early for good UX; the DB guarantees integrity regardless of caller.

## Multi-Tenancy Strategy

**Shared database, shared schema, row-level isolation** — the right trade-off for our scale, balancing operational simplicity (one DB to back up and reason about) against tenant isolation.

Every tenant-scoped table:

- has a **`tenantId UUID NOT NULL`** column with a foreign key to `tenant`;
- has a **covering composite index** that leads with `tenantId` so tenant-scoped queries are index-only;
- is queried through a Prisma client extension that **injects `tenantId`** from the request context and **fails closed** if it's missing — a query without a tenant filter is a bug, not a shortcut.

Isolation is **verified by tests**: every feature suite includes a cross-tenant access test that must fail. See [docs/database/security.md](../database/security.md) and [docs/security/authorization.md](../security/authorization.md).

Tables that are inherently global (e.g., a system lookup table) intentionally omit `tenantId` and are documented as such.

## Schema Conventions

- **Names:** `snake_case` for tables and columns (`project`, `created_at`); join tables as `a_b` (`project_member`).
- **Primary keys:** `id UUID @default(uuid())` (or `@default(cuid())`); stable, opaque, URL-safe.
- **Timestamps:** every table has `created_at` and `updated_at`; `updated_at` is maintained by Prisma's `@updatedAt`.
- **Money/quantities:** stored as integers in the smallest unit (cents, grams) or as `@db.Decimal` where exactness matters — never floating point.
- **Enums:** modeled as Postgres enums for status/type fields (`TaskStatus`, `ProjectPhase`).
- **Flexible fields:** `Json?` (`@db.JsonB`) for genuinely unstructured metadata (e.g., report template config) — not as a substitute for proper columns.
- **Soft-delete column:** `deleted_at Timestamp?` only on tables that require history (see below).

## Indexing Strategy

- **Tenant-leading indexes:** every tenant-scoped table's primary access path is `(tenantId, <natural-sort-column>)`, so the common "list within a tenant" query is fast and paginated.
- **Foreign keys are indexed.** Every FK gets a B-tree index to keep joins and cascades cheap.
- **Partial indexes** for common filtered queries (e.g., `WHERE deleted_at IS NULL`).
- **Composite indexes** ordered by selectivity and query patterns; we add them from real query analysis, not speculation.
- **Avoid over-indexing:** every index slows writes. New indexes are justified by a slow query or a documented access pattern.

## Transactions & Consistency

- **Multi-write operations are wrapped in a Prisma transaction** (`$transaction`). The audit record is written inside the same transaction, so it never drifts from the mutation it describes.
- **Read-modify-write sequences** that must be atomic (e.g., decrementing inventory on allocation) use a transaction with a row lock or an atomic conditional update — never a naive read-then-write.
- **Isolation:** the default read-committed level is correct for almost all flows; we escalate to serializable only where a specific anomaly demands it, and document why.
- **Idempotency:** operations that may be retried (report generation, webhook delivery) carry an idempotency key so a replay cannot create duplicate effects.

## Soft Deletes & History

Soft deletes are used **sparingly and intentionally**, only where history or referential integrity demands it:

- **Hard delete** by default for genuinely removable records (e.g., a draft that was never published).
- **Soft delete (`deleted_at`)** where the row must remain queryable for audit/history (e.g., a completed project, an equipment downtime record).
- **Audit tables are append-only** and never deleted — they are the durable history of mutations, written within the mutation's transaction.

The choice is documented per table in [docs/database/schema.md](../database/schema.md).

## Caching Boundary

Redis is a **cache and queue**, never the source of truth:

- **Hot reads** (dashboard aggregates) use stale-while-revalidate with explicit invalidation on write.
- **Cache is disposable.** Losing Redis never loses data — it only slows reads until the cache repopulates.
- **No business decisions from cache alone.** Authoritative reads hit PostgreSQL; the cache is an optimization layer over the DB.

## Performance & Scaling

- **Pagination by default** on every list endpoint (cursor-based for large tables, offset for modest ones — see [docs/api/standards.md](../api/standards.md)).
- **Stream large exports** rather than loading them into memory.
- **Materialized views** for expensive dashboard aggregates, refreshed on a schedule or on write events.
- **Query analysis** is part of Phase 6 hardening ([ROADMAP.md](../../ROADMAP.md)); we measure, then optimize — never guess.

If a tenant's data volume eventually justifies it, the modular boundaries let us extract a domain (e.g., `reports`) into its own database with an [ADR](../decisions/), preserving the system's shape.

## Backups & Recovery

- **Point-in-time recovery** enabled on managed PostgreSQL in production ([docs/deployment/production.md](../deployment/production.md)).
- **Restore drills** are a Phase 6 exit criterion — a backup untested is a backup assumed broken.
- **Tenant data export** (for contractual portability) and **tenant deletion** (for compliance) are first-class operations, handled with full audit, never ad-hoc SQL.
