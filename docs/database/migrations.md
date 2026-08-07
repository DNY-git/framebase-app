# Database Migrations

> How ConstructTrack evolves its MongoDB schema safely: Mongoose-driven, additive-only, reviewed, and never destructive without explicit, confirmed steps.

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

1. **Mongoose schemas are authoritative.** We edit the schema in code, then deploy — there is no separate migration file format.
2. **Schema changes are additive.** New fields are added with defaults; existing documents are not migrated. Destructive changes ship in a later release.
3. **Never destructive without explicit confirmation.** Dropping a field, renaming a collection, or removing data requires sign-off and a documented plan ([PROJECT_RULES.md §1](../../PROJECT_RULES.md#1-behavior--safety)).
4. **Forward-only.** We design changes to be safe to apply in sequence; "rollback" means deploying the previous code version, not reverting schema.
5. **Zero-downtime.** New fields have defaults so existing documents work with new code immediately.

---

## Workflow

### Local development

1. Edit the Mongoose schema in `apps/api/src/schemas/` to reflect the new model.
2. Add the field with a default value so existing documents are compatible.
3. Add any new indexes in the schema definition or via `createIndex`.
4. Test locally — the schema change takes effect immediately with `npm run dev`.
5. Commit the schema change in the same PR as the code that uses it. One concern per change.

### Rules

- **One concern per schema change.** `add_equipment_utilization_index`, not `july_updates`.
- **New fields must have defaults** so existing documents work without migration.
- **Never rename a field** — add the new one, migrate code to use it, then remove the old one in a later release.
- **Index changes are reviewed** for performance impact on write operations.

---

## Naming & History

- Names are lowercase snake_case, verb-first: `add_x`, `rename_y_to_z`.
- Schema changes are tracked in version control; a messy change history is a smell, not normality.

---

## Safe vs. Destructive Changes

| Change | Risk | Policy |
| --- | --- | --- |
| Add field with default | safe | add to schema, deploy |
| Add field (nullable) | safe | add to schema, deploy |
| Add index | safe | add to schema or createIndex |
| Rename field | **breaking** | add new → migrate code → remove old in later release |
| Remove field | **destructive** | stop using in code first, remove in later release |
| Rename collection | **breaking** | add new → migrate code → remove old in later release |
| Drop collection | **destructive** | requires explicit confirmation; data exported/backed up first |

When in doubt, prefer the additive path.

---

## Multi-Step Expansive Migrations

The canonical safe pattern for breaking changes, spread across releases:

1. **Expand:** add the new field/collection (with a default or nullable). Deploy code that writes to *both* old and new.
2. **Migrate:** update all reads to use the new field.
3. **Contract:** after a release confirming nothing reads the old shape, remove it.

Each step is its own release, keeping every intermediate state production-safe.

---

## Backfills & Large Collections

- **Never backfill in a blocking operation on large collections.** Run backfills in batches with bounded document counts.
- **Idempotent backfills** can be safely retried; design the update so re-running is harmless.
- **Track progress** for large backfills (e.g., a `backfill_state` collection or job status).
- **Verify counts** before and after; a backfill is a data change and is auditable.

---

## Schema Validation & CI

- Mongoose schema `validate` rules catch invalid data at the application layer.
- **CI step:** typecheck and lint ensure schema definitions are consistent.
- **Schema changes are reviewed in PR** for correctness, index choices, and backward compatibility.

---

## Production Releases

- **Schema changes deploy with the code** — Mongoose handles field creation automatically for new fields with defaults.
- **Schema changes must be backward-compatible** with the currently-running code. A change that breaks the live app is a bug — use the additive pattern.
- **Review every schema change in PR** for index choices, performance, and destructiveness.
- **Destructive changes** are scheduled, announced, and run during a maintenance window if needed.

---

## Rollback Policy

- We do **not** revert schema changes. Rollback = deploy the previous code version.
- Because schema changes are designed to be backward-compatible with the previous code version, *deploying the previous code version* is usually a safe rollback after a bad release.
- For truly catastrophic changes (rare, and a sign of a broken process), MongoDB Atlas point-in-time recovery ([../architecture/database.md → Backups & Recovery](../architecture/database.md#backups--recovery)) is the safety net — tested in restore drills ([ROADMAP.md](../../ROADMAP.md) Phase 6).

---

*If a migration feels risky, slow down and write the plan down. Schema changes are the changes most likely to take a platform down — they deserve the most deliberate process we have.*
