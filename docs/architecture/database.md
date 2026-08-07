# Database Architecture

> How ConstructTrack persists and protects its data: MongoDB Atlas as the single source of truth, Mongoose ODM as the schema layer, row-level multi-tenancy enforced in the data layer, and a disciplined additive-schema evolution approach.

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

ConstructTrack treats MongoDB Atlas as the **system of record** — the one place a project fact is authoritative. Redis exists only for cache and queue, never as truth ([BIBLE.md §12](../../BIBLE.md#12-database-philosophy)). The schema is document-oriented because the domains map naturally to documents: a project embeds its phases, tasks reference projects, and reports aggregate across collections.

Access is mediated exclusively by **Mongoose ODM**. Mongoose schemas define the data model, enforce validation, and provide the typed interface for all data operations. App code never writes raw MongoDB queries by default — when it must (for performance), the query is reviewed and documented.

## Source of Truth

- **Mongoose schemas are authoritative.** Models defined in `apps/api/src/schemas/` are the canonical shape; the Mongoose Model is what repositories import. See [docs/database/schema.md](../database/schema.md) for the human-readable entity reference.
- **Schema evolution is additive.** New fields are added with defaults; existing documents are not migrated. Destructive changes (renaming, removing fields) ship in a later release after code stops using the old shape.
- **Indexes are explicit.** Mongoose schema `index` definitions and explicit `createIndex` calls ensure query performance. Indexes are reviewed in PR for necessity and selectivity.

## Multi-Tenancy Strategy

**Shared database, shared schema, row-level isolation** — the right trade-off for our scale, balancing operational simplicity (one DB to back up and reason about) against tenant isolation.

Every tenant-scoped collection:

- has a **`tenantId` field** on every document;
- has a **covering index** that leads with `tenantId` so tenant-scoped queries are efficient;
- is queried through the `BaseRepository` which **injects `tenantId`** from the request context and **fails closed** if it's missing — a query without a tenant filter is a bug, not a shortcut.

Isolation is **verified by tests**: every feature suite includes a cross-tenant access test that must fail. See [docs/database/security.md](../database/security.md) and [docs/security/authorization.md](../security/authorization.md).

Collections that are inherently global intentionally omit `tenantId` and are documented as such.

## Schema Conventions

- **Names:** `snake_case` for collection and field names (`project`, `created_at`).
- **Primary keys:** MongoDB `ObjectId` (auto-generated); stable, opaque, URL-safe.
- **Timestamps:** every document has `createdAt` and `updatedAt`; maintained by Mongoose `timestamps: true`.
- **Money/quantities:** stored as integers in the smallest unit (cents, grams) where exactness matters — never floating point.
- **Enums:** modeled as string enums in Mongoose schemas for status/type fields (`TaskStatus`, `ProjectPhase`).
- **Flexible fields:** `Mixed` / `Map` for genuinely unstructured metadata (e.g., report template config) — not as a substitute for proper fields.
- **Soft-delete:** `deletedAt` field only on documents that require history (see below).

## Indexing Strategy

- **Tenant-leading indexes:** every tenant-scoped collection's primary access path is `(tenantId, <natural-sort-field>)`, so the common "list within a tenant" query is fast and paginated.
- **Foreign key references are indexed.** Every reference field gets an index to keep lookups cheap.
- **Sparse indexes** for optional fields (e.g., `deletedAt`).
- **Compound indexes** ordered by selectivity and query patterns; we add them from real query analysis, not speculation.
- **Avoid over-indexing:** every index slows writes. New indexes are justified by a slow query or a documented access pattern.

## Transactions & Consistency

- **Multi-write operations use Mongoose sessions** where atomicity is required. The audit record is written alongside the mutation so it never drifts from the change it describes.
- **Read-modify-write sequences** that must be atomic (e.g., decrementing inventory on allocation) use `$inc` with conditions orfindOneAndUpdate with `new: true` — never a naive read-then-write.
- **Idempotency:** operations that may be retried (report generation, webhook delivery) carry an idempotency key so a replay cannot create duplicate effects.

## Soft Deletes & History

Soft deletes are used **sparingly and intentionally**, only where history or referential integrity demands it:

- **Hard delete** by default for genuinely removable records (e.g., a draft that was never published).
- **Soft delete (`deletedAt`)** where the document must remain queryable for audit/history (e.g., a completed project, an equipment downtime record).
- **Audit collections are append-only** and never deleted — they are the durable history of mutations, written alongside the mutation.

The choice is documented per collection in [docs/database/schema.md](../database/schema.md).

## Caching Boundary

Redis is a **cache and queue**, never the source of truth (deferred to a future phase):

- **Hot reads** (dashboard aggregates) use stale-while-revalidate with explicit invalidation on write.
- **Cache is disposable.** Losing Redis never loses data — it only slows reads until the cache repopulates.
- **No business decisions from cache alone.** Authoritative reads hit MongoDB; the cache is an optimization layer over the DB.

## Performance & Scaling

- **Pagination by default** on every list endpoint (cursor-based for large collections, offset for modest ones — see [docs/api/standards.md](../api/standards.md)).
- **Stream large exports** rather than loading them into memory.
- **Denormalized aggregates** for expensive dashboard queries, refreshed on a schedule or on write events.
- **Query analysis** is part of Phase 6 hardening ([ROADMAP.md](../../ROADMAP.md)); we measure, then optimize — never guess.

If a tenant's data volume eventually justifies it, the modular boundaries let us extract a domain (e.g., `reports`) into its own database with an [ADR](../decisions/), preserving the system's shape.

## Backups & Recovery

- **MongoDB Atlas Cloud Backups with PITR** enabled in production ([docs/deployment/production.md](../deployment/production.md)).
- **Restore drills** are a Phase 6 exit criterion — a backup untested is a backup assumed broken.
- **Tenant data export** (for contractual portability) and **tenant deletion** (for compliance) are first-class operations, handled with full audit, never ad-hoc scripts.
