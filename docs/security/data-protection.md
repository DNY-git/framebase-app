# Security: Data Protection

> How ConstructTrack protects data throughout its lifecycle: in transit, at rest, in logs, in backups, and when leaving the system (to AI providers, exports, or deletion). Protection is layered and never relies on a single control.

Companion docs: [authentication.md](./authentication.md), [authorization.md](./authorization.md), [../database/security.md](../database/security.md), [../architecture/ai.md](../architecture/ai.md), [../deployment/production.md](../deployment/production.md), [BIBLE.md §11](../../BIBLE.md#11-security-philosophy).

---

## Table of Contents

- [Principles](#principles)
- [Data Classification](#data-classification)
- [Encryption (Transit & Rest)](#encryption-transit--rest)
- [Secrets Management](#secrets-management)
- [Logging & PII](#logging--pii)
- [AI Data Handling](#ai-data-handling)
- [Backups & Retention](#backups--retention)
- [Tenant Data Export & Deletion](#tenant-data-export--deletion)
- [Vulnerability & Disclosure](#vulnerability--disclosure)
- [Compliance Posture](#compliance-posture)

---

## Principles

1. **Least data.** Collect and expose only what's needed; minimize what flows to logs, backups-extras, and external services.
2. **Layered protection.** Encryption, isolation, access control, and audit each stand alone — no single point of failure.
3. **Secrets stay in the environment**, never in code, configs, or logs.
4. **Tenant isolation is the core promise** — see [authorization.md → Tenant Isolation](./authorization.md#tenant-isolation) and [../database/security.md](../database/security.md).
5. **Recoverable and revocable.** Data can be restored after loss and erased on request.

---

## Data Classification

| Class | Examples | Handling baseline |
| --- | --- | --- |
| **Public** | product docs, marketing | no restriction |
| **Internal** | aggregate KPIs, schema | auth required; tenant-scoped |
| **Confidential** | project data, tasks, equipment, inventory | auth + authorization + tenant isolation + audit |
| **Restricted** | credentials, PII (emails, names), AI inputs | encrypted at rest; minimal logging; strict access |

Most operational data is **Confidential** (tenant-scoped business data). **Restricted** data gets the strictest handling: encryption, no logging of values, and explicit consent/need for any external transmission (including to AI providers).

---

## Encryption (Transit & Rest)

- **In transit:** TLS for all client ↔ Nginx traffic (HSTS enforced); TLS between API ↔ PostgreSQL and API ↔ Redis in production; HTTPS for outbound calls (SMTP, object storage, AI providers).
- **At rest:** managed PostgreSQL disk encryption (platform-managed key); object storage encryption for uploads/artifacts.
- **Column-level encryption:** highly sensitive fields (e.g., stored integration credentials, provider API keys held on behalf of a tenant) are encrypted at the application layer with keys from the environment — **never** stored as plaintext columns.
- **Redis:** ephemeral data only (cache/sessions/queues); no sensitive data rests there without a documented need and short TTL.

Encryption complements isolation and access control — it is not a substitute.

---

## Secrets Management

- **Secrets come from the environment** (or a secrets manager in production) — `JWT_*_SECRET`, `PASSWORD_PEPPER`, `DATABASE_URL`, `COOKIE_SECRET`, provider API keys, S3 credentials ([.env.example](../../.env.example)).
- **`.env` is gitignored**; `.env.example` contains only placeholders; CI rejects known `change-me-*` placeholders on deploy.
- **Rotation:** secrets are rotatable via environment swap; rotated on a schedule and after suspected exposure.
- **Least privilege:** each environment has its own credentials; the app DB user lacks destructive privileges in production ([../database/security.md](../database/security.md)).
- **No secrets in logs:** structured logging scrubs connection strings, tokens, and passwords before emission.

---

## Logging & PII

- **Structured JSON logs** carry correlation ids (request, tenant, user), level, and message — the data needed to debug without leaking values.
- **Never log:** passwords, tokens, full connection strings, payment data, or **Restricted**-class payloads. Auth events log *that* a login happened, not the credential.
- **PII minimized:** names/emails appear only where operationally necessary (e.g., audit actor identity); aggregated metrics avoid personal identifiers.
- **Retention:** logs are retained per a defined policy and access-restricted; log shipping respects data-residency needs.
- **AI payloads:** request/response bodies are logged only under a configurable, off-by-default policy ([AI Data Handling](#ai-data-handling)).

---

## AI Data Handling

The AI assistant sends tenant data to an external model provider, so this is a specially-controlled path ([../architecture/ai.md](../architecture/ai.md)):

- **Minimum necessary:** only the fields needed to answer are included in the grounding pack — never a raw data dump.
- **Tenant-scoped:** retrieval uses the caller's authorization scope; another tenant's data cannot enter the prompt.
- **Provider selection is configurable** (`AI_PROVIDER`); tenants with stricter residency/privacy needs can disable AI entirely (`none`) or route to an approved provider.
- **No logging of sensitive payloads** unless an explicit, auditable debug policy is enabled for a short window.
- **AI is optional:** the platform is fully functional with AI disabled — data protection never depends on a vendor relationship.
- **Feedback is analytics, not training:** thumbs-up/down improves our prompts/evals; we do not silently funnel tenant data into model training.

---

## Backups & Retention

- **PostgreSQL:** automated backups + point-in-time recovery (managed) — see [../deployment/production.md](../deployment/production.md).
- **Encrypted and access-restricted:** backups are full copies of tenant data and are protected as such.
- **Restore drills** prove recoverability; an untested backup is assumed broken ([ROADMAP.md](../../ROADMAP.md) Phase 6).
- **Retention balances recoverability** against storage cost and compliance obligations; retention windows are documented per data class.
- **Object storage** for uploads/artifacts uses versioning + replication; deletion is reversible within a window.

---

## Tenant Data Export & Deletion

Tenants can get their data out and have it removed — these are first-class operations, never ad-hoc SQL:

- **Export:** produces a complete, structured dump of a tenant's data for portability or contract end. Admin-initiated; audit-logged.
- **Deletion:** irreversible, **double-confirmed**, processed as a job that removes all tenant-scoped rows in dependency order, then records the deletion in a retained audit trail.
- **Suspend vs. delete:** suspending a tenant blocks access while preserving data; deletion is the permanent, separate, heavily-guarded step.
- **Right-to-be-forgotten** for an individual user is supported via account deletion with the same rigor.

---

## Vulnerability & Disclosure

- **Private disclosure:** suspected security issues are reported privately (not via public issues) to a monitored address; see the security policy in the repository.
- **No punitive disclosure:** we respond cooperatively to good-faith reports and credit researchers.
- **Response process:** acknowledge → triage → fix (with tests) → coordinated disclosure → post-mortem.
- **Dependency hygiene:** automated scanning for known-vulnerable dependencies; majors reviewed manually ([TECH_STACK.md → Version Pinning Policy](../../TECH_STACK.md#version-pinning-policy)).
- **Penetration testing** in [ROADMAP.md](../../ROADMAP.md) Phase 6, with findings remediated.

---

## Compliance Posture

ConstructTrack is built to make compliance achievable rather than to claim specific certifications:

- **Data residency:** configurable providers and infrastructure selection support regional requirements.
- **Auditability:** every mutation is recorded (actor, action, before/after, correlation id) — the foundation for any compliance evidence.
- **Access control & least privilege** are built in, not retrofitted.
- **Tenant isolation** is verifiable by tests, supporting the multi-tenancy obligations common to enterprise customers.

Specific certifications (SOC 2, ISO 27001, etc.) are pursued as the business requires and tracked against this baseline.

---

*Data protection is a property of the whole system, not a feature. Every layer — transport, storage, access, logs, AI, backups — has to uphold it, or the weakest one defines the real posture.*
