# CI/CD

> ConstructTrack's continuous integration and delivery pipeline: every change runs lint, type-check, unit, integration, and build gates before it can merge; `main` is always releasable and deploys automatically to staging, with production releases gated by approval. The pipeline exists so quality is enforced by the system, not by remembering to check.

Companion docs: [local.md](./local.md), [production.md](./production.md), [../testing/strategy.md](../testing/strategy.md), [PROJECT_RULES.md §12](../../PROJECT_RULES.md#12-git--pr-rules).

---

## Table of Contents

- [Goals](#goals)
- [Pipeline Stages](#pipeline-stages)
- [Triggers](#triggers)
- [Jobs in Detail](#jobs-in-detail)
- [Environments & Deploy Gates](#environments--deploy-gates)
- [Branch & Merge Model](#branch--merge-model)
- [Required Status Checks](#required-status-checks)
- [Secrets in CI](#secrets-in-ci)
- [Workflows Conventions](#workflows-conventions)

---

## Goals

1. **`main` is always green and releasable.** A broken `main` is an incident, not normal.
2. **Quality is enforced at the gate** — lint, types, tests, and build run on every PR before merge.
3. **Fast feedback** — stages run in parallel; the critical path stays short.
4. **Reversible deploys** — every deploy is an image tagged by SHA; rollback is redeploy.
5. **No secrets in logs** — CI secrets are scoped and masked.

---

## Pipeline Stages

A PR runs these stages, mostly in parallel where dependencies allow:

```
┌─────────┐   ┌────────────┐   ┌──────────┐   ┌───────────────┐   ┌────────┐
│  lint   │──▶│ typecheck  │──▶│  unit    │──▶│ integration   │──▶│ build  │
└─────────┘   └────────────┘   └──────────┘   └───────────────┘   └────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  e2e (smoke)     │
                                          └──────────────────┘
```

On `main`: all of the above + deploy to staging. On a release tag: deploy to production (gated).

---

## Triggers

| Event | Runs |
| --- | --- |
| Pull request opened/updated | lint, typecheck, unit, integration, build |
| Push to `main` | full suite + deploy to **staging** |
| Tag `v*.*.*` | full suite + deploy to **production** (after approval) |
| Nightly (scheduled) | full suite + e2e against staging (catches drift/flakes) |

---

## Jobs in Detail

### lint
- ESLint + Prettier check across the monorepo (`npm run lint`).
- **Zero warnings policy** on `main` — warnings fail the job.

### typecheck
- `tsc --noEmit` with `strict: true` in every package (`npm run typecheck`).
- Catches type errors the dev may have skipped.

### unit
- Vitest unit tests (`npm run test`).
- Component tests (Testing Library) for the frontend; service/unit tests for the backend.
- Collects coverage as a signal (not a hard gate).

### integration
- Vitest integration tests against a **disposable PostgreSQL + Redis** spun up in the job (service containers).
- Runs migrations, seeds minimal data, exercises real DB/queue behavior.
- Includes the **tenant-isolation tests** that must fail cross-tenant access ([../database/security.md](../database/security.md)).
- Runs `prisma migrate diff` against a shadow DB to catch schema/migration drift ([../database/migrations.md](../database/migrations.md)).

### build
- `npm run build` — produces the web bundle and the API container image.
- Image tagged by git SHA (+ version on release tags); pushed to the registry.
- Verifies the app actually builds cleanly.

### e2e (smoke)
- Playwright smoke tests against a built app (the job brings up the compose stack briefly or targets a preview environment).
- Covers the critical paths: register/login, create project, create/complete task, view dashboard.

---

## Environments & Deploy Gates

| Environment | Trigger | Gate | Purpose |
| --- | --- | --- | --- |
| **preview** | per-PR (optional) | automatic | ephemeral environment for review |
| **staging** | push to `main` | CI green | a releasable mirror of prod |
| **production** | tag `v*.*.*` | manual approval | customer-facing |

Deploy mechanics (full detail in [production.md](./production.md)): apply migrations (`prisma migrate deploy`) → rolling deploy API → redeploy workers → smoke test.

---

## Branch & Merge Model

- **Trunk-based:** short-lived branches off `main`, PRs back to `main`.
- **Branch prefix:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` + kebab slug.
- **Squash-merge** to keep `main` linear; the squash commit message is the PR title (imperative mood).
- **One concern per PR** ([PROJECT_RULES.md §12](../../PROJECT_RULES.md#12-git--pr-rules)) — a PR that bundles a refactor with a feature is rejected.

---

## Required Status Checks

A PR cannot merge to `main` until **all** of these pass:

- `lint`
- `typecheck`
- `unit`
- `integration`
- `build`
- at least one approving review (two for changes touching security/architecture/data model)

Branch protection enforces these; `main` cannot be force-pushed or directly committed to.

---

## Secrets in CI

- Secrets live in GitHub Actions encrypted secrets (or equivalent), scoped to the environments that need them.
- **No secret is ever printed** — jobs mask known secret values; jobs that need credentials use them via environment, never inline.
- **Production deploy secrets** are restricted to the release workflow and require manual approval to run.
- Disposable test credentials (for integration/e2e) are low-privilege and rotated.

---

## Workflows Conventions

- **Caching:** npm/Prisma caches speed up installs; Docker layer caching for image builds.
- **Concurrency:** cancel superseded runs on the same branch to save cycles.
- **Matrix:** where relevant (e.g., Node 20 only for now; expand on need).
- **Failure visibility:** a failing job posts a clear, actionable summary — which check failed, the relevant log excerpt, and how to reproduce locally.
- **Workflow files** live in `.github/workflows/` and are reviewed like any other code change (an [ADR](../decisions/) if the pipeline shape changes materially).

---

*The pipeline is the project's immune system: it makes the rules in [PROJECT_RULES.md](../../PROJECT_RULES.md) automatic rather than aspirational. A green build should mean the change is safe to ship.*
