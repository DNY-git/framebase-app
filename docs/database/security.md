# Database Security

> How ConstructTrack protects data at rest and in transit, and — critically — guarantees tenant isolation at the data layer. The database is the last line of defense; if a bug lets a query slip past application authorization, the data-layer controls must still prevent cross-tenant access.

Companion docs: [../architecture/database.md](../architecture/database.md) (modeling), [schema.md](./schema.md), [migrations.md](./migrations.md), [../security/authorization.md](../security/authorization.md), [../security/data-protection.md](../security/data-protection.md).

---

## Table of Contents

- [Threat Model & Goals](#threat-model--goals)
- [Tenant Isolation (Row-Level)](#tenant-isolation-row-level)
- [Verification by Testing](#verification-by-testing)
- [Least-Privilege Access](#least-privilege-access)
- [Secrets & Credentials](#secrets--credentials)
- [Encryption](#encryption)
- [Auditing & Tamper-Resistance](#auditing--tamper-resistance)
- [Backups & Retention](#backups--retention)
- [Tenant Lifecycle (Export & Deletion)](#tenant-lifecycle-export--deletion)

---

## Threat Model & Goals

We assume a **trusted application boundary** (our NestJS services) but defend against bugs and mistakes within it. The threats we specifically design against:

1. **Cross-tenant read/write** — an app bug queries/updates without a `tenantId` filter, leaking or corrupting another tenant's data.
2. **Privilege escalation** — a user performs an action their role doesn't permit.
3. **Credential exposure** — DB credentials leak via code, logs, or misconfiguration.
4. **Insider tampering** — someone with DB access attempts to alter history (audit).
5. **Data loss** — accidental deletion, corruption, or a bad migration.

Goals: tenant isolation is **impossible to bypass from the app** without a deliberate, reviewed exception; access is least-privilege; history is tamper-evident; and data is recoverable.

---

## Tenant Isolation (Row-Level)

**Model:** shared database, shared schema, row-level isolation via `tenantId` — see [../architecture/database.md → Multi-Tenancy Strategy](../architecture/database.md#multi-tenancy-strategy).

**Defense in depth — three layers, each must fail for isolation to break:**

1. **Application authorization** — services attach the caller's `tenantId` to the request context; repositories scope every query by it. This is the first, fast layer.
2. **Prisma client extension (enforcement)** — a client extension intercepts every tenant-scoped query and **injects `tenantId`** from the request context. A query missing a tenant filter **fails closed** (throws) rather than running unscoped. This catches the "forgot the `where`" bug.
3. **Schema constraints** — every tenant-scoped table has `tenantId NOT NULL` with a foreign key to `tenant`, so even a raw insert can't create an orphan or mis-tenant row.

**Global tables** (rare lookups not owned by a tenant) intentionally omit `tenantId` and are explicitly documented as exceptions in [schema.md](./schema.md).

> **Postgres Row-Level Security (RLS)** is a future hardening option (set policies by `tenantId` from the session). It is not enabled on day one to keep the dev experience simple; it's a candidate for [ROADMAP.md](../../ROADMAP.md) Phase 6 hardening, behind an [ADR](../decisions/).

---

## Verification by Testing

Isolation is **proven, not assumed**. Every feature suite includes:

- A **cross-tenant access test**: create a record in tenant A, attempt to read/update/delete it as a user of tenant B → the operation must fail (404 or 403, never 200 with tenant A's data).
- A **missing-tenant-filter test**: confirm a repository call made without a tenant context throws (the client extension fails closed).
- A **multi-tenant query test**: with records in both tenants, list queries return only the caller's tenant.

These tests run against a **real PostgreSQL** instance (the disposable Docker DB in CI), not mocks — mocking the ORM would hide the very bugs we're guarding against ([PROJECT_RULES.md §9](../../PROJECT_RULES.md#9-testing-rules)).

---

## Least-Privilege Access

- **The application DB user** has only the privileges it needs (CRUD on application tables, sequence usage) — **not** superuser, **not** `DDL` in production. Migrations run via a separate, elevated role during deploys only.
- **No shared DB credentials** across environments; each environment has its own user and password, from the environment ([.env.example](../../.env.example)).
- **Direct DB access** is restricted to a small number of operators and is audited; routine work goes through the application, never ad-hoc SQL against production.

---

## Secrets & Credentials

- **DB connection string and password** come from the environment or a secrets manager — **never** in code or committed configs ([PROJECT_RULES.md §8](../../PROJECT_RULES.md#8-security-rules)).
- **`.env` is gitignored; `.env.example` carries only placeholders.**
- **Logs never include the full connection string** or credentials. Connection errors are scrubbed before logging.
- **Rotation:** credentials are rotatable without code changes (environment swap) and rotated on a schedule and after any suspected exposure.

---

## Encryption

| Layer | Mechanism |
| --- | --- |
| **In transit** | TLS between API ↔ PostgreSQL and between workers ↔ PostgreSQL. TLS to clients terminates at Nginx. |
| **At rest** | Managed PostgreSQL disk encryption (platform-managed key) in production. |
| **Sensitive columns** | Application-level encryption for highly sensitive fields (e.g., integration credentials) using keys from the environment — never as plain columns. |

Encryption complements, never replaces, isolation and access control.

---

## Auditing & Tamper-Resistance

- **`audit_log` is append-only** ([schema.md](./schema.md)): inserts only, no updates or deletes through the application. The application DB user lacks `UPDATE`/`DELETE` on it.
- Every **mutating** operation writes an audit record **inside the same transaction** as the change, capturing actor, action, entity, before/after, and correlation id.
- **Audit records survive their subject:** when a business row is deleted, its audit history remains.
- **Tamper-evidence** (hash-chaining or append-only storage) is a future hardening candidate for compliance-sensitive tenants; logged in [ROADMAP.md](../../ROADMAP.md) Phase 6.

---

## Backups & Retention

- **Point-in-time recovery** on managed PostgreSQL in production ([../architecture/database.md → Backups & Recovery](../architecture/database.md#backups--recovery)).
- **Restore drills** are a Phase 6 exit criterion — an untested backup is assumed broken.
- **Retention policy** balances recoverability against storage cost and compliance (e.g., data-retention obligations per tenant contract).
- **Backups are encrypted** and access-restricted; a backup is a full copy of tenant data and is treated with the same care as production.

---

## Tenant Lifecycle (Export & Deletion)

- **Tenant data export** (for portability/contract end) is a first-class operation producing a complete, structured dump — never ad-hoc SQL.
- **Tenant deletion** is irreversible and therefore **double-confirmed**, logged in the audit trail (itself retained per policy), and processed via a job that removes all tenant-scoped rows in dependency order.
- **Soft suspend vs. hard delete:** suspending a tenant (`status = suspended`) blocks access while preserving data; deletion is the permanent, separate step.

---

*The database is where data is most concentrated and most exposed. Every rule here exists because the alternative is a class of bug that, in a multi-tenant system, can be catastrophic for trust.*
