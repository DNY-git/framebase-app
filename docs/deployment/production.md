# Production Deployment

> How ConstructTrack runs in production: containerized API + SPA behind Nginx, managed MongoDB Atlas, environment-driven config, and safety rails around every release. Production is where mistakes are most expensive, so the process is deliberate and reversible.

Companion docs: [local.md](./local.md), [ci-cd.md](./ci-cd.md), [../security/data-protection.md](../security/data-protection.md), [../architecture/system.md](../architecture/system.md), [../database/security.md](../database/security.md).

---

## Table of Contents

- [Target Topology](#target-topology)
- [Components](#components)
- [Configuration & Secrets](#configuration--secrets)
- [Release Process](#release-process)
- [Database Migrations in Production](#database-migrations-in-production)
- [Health Checks & Readiness](#health-checks--readiness)
- [Backups & Recovery](#backups--recovery)
- [Observability](#observability)
- [Scaling](#scaling)
- [Hardening Checklist](#hardening-checklist)

---

## Target Topology

```
                      Internet
                          │
                          ▼  HTTPS (TLS, CDN-capable)
                 ┌────────────────┐
                 │   Nginx / LB   │  (TLS term, static SPA, reverse proxy, headers, rate limit)
                 └───────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     ┌─────────┐   ┌─────────┐   ┌─────────┐   API replicas (stateless)
     │  API 1  │   │  API 2  │   │  API N  │
     └────┬────┘   └────┬────┘   └────┬────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   MongoDB Atlas    Managed Redis   Object Storage   (uploads/artifacts)
   (PITR + snaps)   (future)        (encrypted)
                        │
                        ▼
                  Workers (BullMQ) — reports, notifications, ai queues
```

The API is **stateless** (sessions in Redis), so it scales horizontally behind the load balancer. Workers run as separate processes, scaled independently per queue.

---

## Components

| Component | Production form |
| --- | --- |
| **Web (SPA)** | Static build served by Nginx (or a CDN); hashed assets, long cache headers |
| **API** | Containerized NestJS app; ≥2 replicas for availability |
| **Workers** | Containerized BullMQ workers per queue (`reports`, `notifications`, `ai`) |
| **MongoDB Atlas** | Managed MongoDB with PITR, automated cloud backups, multi-region option |
| **Redis** | Managed Redis 7 (HA) — deferred; cache/sessions/queues when needed |
| **Object storage** | S3-compatible, encrypted, for uploads and report artifacts |
| **Email** | Transactional SMTP provider for notifications |
| **Nginx/LB** | TLS termination, security headers, gzip, rate limiting, static SPA |

---

## Configuration & Secrets

- **All configuration is environment-driven** ([.env.example](../../.env.example)); production values come from a secrets manager, never from committed files.
- **Distinct secrets per environment.** Rotate on a schedule and after any suspected exposure.
- **Fail-fast validation:** the app refuses to boot if a required variable is missing or a secret is a known placeholder (`change-me-*`).
- **Least privilege:** the app DB user has CRUD only; migrations run via a separate elevated role at deploy time ([../database/security.md](../database/security.md)).
- **No secrets in logs** — structured logging scrubs connection strings and credentials ([../security/data-protection.md](../security/data-protection.md)).

---

## Release Process

1. **CI green on `main`** (lint, type-check, unit, integration, build) — see [ci-cd.md](./ci-cd.md).
2. **Build artifacts** — container images tagged by git SHA (+ semantic version for releases).
3. **Schema changes** are additive (new fields, new indexes); no formal migration tool is used. Destructive changes ship in a later release.
4. **Rolling deploy** of API replicas; health checks gate each instance into the pool.
5. **Workers redeployed** after the API is healthy.
6. **Smoke tests** against production post-deploy (auth, health, a representative read/write).
7. **Monitor** for errors/latency; rollback path is the previous image.

**Rollback** = redeploy the previous image. Because schema changes are additive, rolling back the code does not require a DB rollback.

---

## Database Migrations in Production

- Mongoose schemas define the data model — no schema-migration tool is used. New fields are additive and backward-compatible.
- **Destructive changes** (dropping fields, renaming collections) ship in a *later* release than the code that stops using the old shape.
- **Review every schema change** in PR for index choices, performance, and destructiveness.
- **Pre-migration safety**: run `npm run backup:local` before applying schema changes.
- **Point-in-time recovery** is the safety net for catastrophic mistakes, tested in restore drills ([backup-drill.md](./backup-drill.md)).

---

## Health Checks & Readiness

- **`GET /api/v1/health`** returns the app's view of its dependencies (DB, Redis, queues); used by the load balancer to route traffic only to healthy instances.
- **Readiness vs liveness:** readiness checks dependency connectivity (don't route to an instance that can't reach the DB); liveness checks the process is responsive (restart if not).
- **Startup grace period:** migrations and warm-up complete before the instance is marked ready.

---

## Backups & Recovery

- **MongoDB Atlas Cloud Backups** with PITR enabled in production — continuous snapshots with 24-hour PITR window, retained per [backup-drill.md](./backup-drill.md).
- **Restore drills** are a Phase 6 exit criterion — backups are assumed broken until a restore is proven. Full procedure in [backup-drill.md](./backup-drill.md).
- **Pre-deployment safety**: run `npm run backup:local` (or Atlas snapshot download) before destructive operations.
- **Backup verification script**: `npm run backup:verify -- --uri "<MONGODB_URI>"` — validates collection existence, document counts, indexes, and tenant isolation on a restored cluster.

---

## Observability

- **Structured JSON logs** shipped to a log aggregator; correlation ids across request/tenant/user.
- **Metrics** (latency, error rate, queue depth, DB connections) → dashboards + alerting.
- **Tracing** (OTLP) across the request path; Sentry for error capture.
- **Alerting** on: error-rate spikes, latency budget breaches, queue backlog, DB/Redis unavailability, disk/CPU saturation.
- Full observability lands in [ROADMAP.md](../../ROADMAP.md) Phase 6, with baseline logging from day one.

---

## Scaling

- **API:** stateless → scale horizontally behind the LB; autoscale on latency/CPU.
- **Workers:** scale per queue independently (e.g., more `reports` workers at month-end).
- **Database:** vertical first (CPU/RAM/IOPS); read replicas for heavy read paths (dashboard aggregates) if needed; extraction of a domain to its own DB behind an [ADR](../decisions/) if a single tenant demands it.
- **Cache:** tune Redis memory and TTLs by measured hit rates; never let the cache become truth.

---

## Hardening Checklist

Before a production environment is considered ready:

- [ ] TLS everywhere; HSTS enabled; security headers set by Nginx.
- [ ] Distinct, rotated secrets; secrets manager integrated; no `change-me` placeholders.
- [ ] Least-privilege DB roles (app-only CRUD; elevated role for migrations).
- [ ] Atlas Cloud Backup with PITR enabled; a restore drill completed (see [backup-drill.md](./backup-drill.md)).
- [ ] Health checks wired to the LB; rolling deploys verified.
- [ ] Rate limiting and request size limits enforced.
- [ ] Logging/monitoring/alerting operational.
- [ ] Backup verification script passes against restored cluster.
- [ ] Dependency audit clean; pen-test scheduled/remediated ([ROADMAP.md](../../ROADMAP.md) Phase 6).
- [ ] Runbooks for common incidents (deploy rollback, DB failover, queue backlog).

*Production is earned, not assumed. Every item above exists because skipping it has, somewhere, taken a platform down.*
