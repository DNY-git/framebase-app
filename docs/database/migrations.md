# Database Migrations

> How ConstructTrack evolves its PostgreSQL schema safely: Prisma-driven, append-only, reviewed, and never destructive without explicit, confirmed steps.

Companion docs: [../architecture/database.md](../architecture/database.md), [schema.md](./schema.md), [security.md](./security.md), [PROJECT_RULES.md §6](../../PROJECT_RULES.md#6-database-rules).

---

## Table of Contents

- [Principles](#principles)
- [Workflow](#workflow)
- [Naming & History](#naming--history)
- [Safe vs. Destructive Changes](#safe-vs-destructive-changes)
- [Multi-Step Expansive Migrations](#multi-step-expansive-migrations)
- [Backfills & Large Tables](#backfills--large-tables)
- [Shadow Database & CI](#shadow-database--ci)
- [Production Releases](#production-releases)
- [Rollback Policy](#rollback-policy)

---

## Principles

1. **`schema.prisma` is authoritative.** We edit the schema, then generate a migration — we do not write SQL by hand to change shape.
2. **Migrations are append-only.** Once a migration is applied anywhere shared (a PR merged, a dev DB synced, any non-local environment), it is immutable. Corrections are new migrations.
3. **Never destructive without explicit confirmation.** Dropping a column/table, narrowing a type, or removing data requires sign-off and a documented plan ([PROJECT_RULES.md §1](../../PROJECT_RULES.md#1-behavior--safety)).
4. **Forward-only.** We design migrations to be safe to apply in sequence; "rollback" means a new forward migration that reverses the effect, not editing history.
5. **Zero-downtime where possible.** Expansive changes land first; contractive changes land later, after code no longer depends on the old shape.

---

## Workflow

### Local development

1. Edit `prisma/schema.prisma` to reflect the new model.
2. Generate and apply a dev migration:

   ```bash
   npx prisma migrate dev --name <descriptive_snake_name>
   ```

   This creates `prisma/migrations/<timestamp>_<name>/migration.sql`, applies it to the dev DB, and regenerates the client.

3. Inspect the generated SQL. If it does anything unexpected (a destructive drop, a type narrow), rethink the approach (see [Multi-Step Expansive Migrations](#multi-step-expansive-migrations)).
4. Commit the schema **and** the migration together in the same PR. One concern per migration.

### Rules

- **One concern per migration name.** `add_equipment_utilization_index`, not `july_updates`.
- **Never edit an applied migration.** If you catch an error before merge, `prisma migrate resolve` / local reset is acceptable; after merge, write a corrective migration.
- **Regenerate the client** (`npx prisma generate`) whenever the schema changes — the typed client is committed and consumed across packages.

---

## Naming & History

- Migration folders are `<YYYYMMDDHHMMSS>_<name>` — Prisma's default, kept intact.
- Names are lowercase snake_case, verb-first: `add_x`, `rename_y_to_z`, `backfill_project_codes`.
- The migration history (`prisma/migrations/`) is linear and reviewed; a messy history is a smell, not normality.

---

## Safe vs. Destructive Changes

| Change | Risk | Policy |
| --- | --- | --- |
| Add table | safe | generate normally |
| Add nullable column | safe | generate normally |
| Add column with default | mostly safe | prefer `@default`; backfill large tables separately (see Backfills) |
| Add index (non-concurrent) | locks | create indexes `CONCURRENTLY` on large tables via a custom step |
| Drop column | **destructive** | two-phase: (1) stop writing to it in code, (2) drop in a later migration after a cooldown |
| Rename column | **breaking** | prefer add-new → backfill → switch reads → drop-old |
| Narrow type (e.g., text→int) | **breaking** | add new column, backfill, switch, drop old |
| Drop table | **destructive** | requires explicit confirmation; data exported/backed up first |

When in doubt, prefer the expansive path.

---

## Multi-Step Expansive Migrations

The canonical safe pattern for breaking changes, spread across releases:

1. **Expand:** add the new column/table (nullable or with default). Deploy code that writes to *both* old and new.
2. **Backfill:** populate the new shape for existing rows (see Backfills).
3. **Switch:** deploy code that reads/writes only the new shape.
4. **Contract:** after a cooldown confirming nothing reads the old shape, remove it.

Each step is its own migration and its own deployment, keeping every intermediate state production-safe.

---

## Backfills & Large Tables

- **Never backfill inside a transaction that locks a large table.** Run backfills in batches with bounded row counts and short transactions, or as a one-off job on the queue.
- **Idempotent backfills** can be safely retried; design the update so re-running is harmless.
- **Track progress** for large backfills (e.g., a `backfill_state` table or job status).
- **Verify counts** before and after; a backfill is a data change and is auditable.

---

## Shadow Database & CI

- Prisma's **shadow database** (`SHADOW_DATABASE_URL`, [.env.example](../../.env.example)) is used in CI to detect migration drift — i.e., cases where `schema.prisma` and the migration history disagree.
- **CI step:** `prisma migrate diff` (or `prisma migrate deploy --shadow-...`) fails the build if the schema and migrations are out of sync, so a half-applied change can't merge.
- **Migration apply in CI/staging** uses `prisma migrate deploy` (never `dev`) — apply pending, never generate.

---

## Production Releases

- **Apply migrations as part of deployment**, before the new code serves traffic, using `prisma migrate deploy`.
- **Migrations must be backward-compatible** with the currently-running code. A migration that breaks the live app is a bug — use the expansive pattern.
- **Review every migration in PR** by a second person for destructiveness, locking, and index choices.
- **Destructive/contractive migrations** are scheduled, announced, and run during a maintenance window if locking is a concern.

---

## Rollback Policy

- We do **not** rewind migration history. Rollback = a new forward migration that reverses the change.
- Because migrations are designed to be backward-compatible with the previous code version, *deploying the previous code version* is usually a safe rollback after a bad release; the migration remains applied.
- For truly catastrophic migrations (rare, and a sign of a broken process), point-in-time recovery of PostgreSQL ([../architecture/database.md → Backups & Recovery](../architecture/database.md#backups--recovery)) is the safety net — tested in restore drills ([ROADMAP.md](../../ROADMAP.md) Phase 6).

---

*If a migration feels risky, slow down and write the plan down. Schema changes are the changes most likely to take a platform down — they deserve the most deliberate process we have.*
