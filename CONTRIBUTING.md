# CONTRIBUTING.md

> Thanks for contributing to ConstructTrack. This guide explains how to propose changes, from idea to merged PR. **Read [BIBLE.md](./BIBLE.md) and [PROJECT_RULES.md](./PROJECT_RULES.md) first** — every contribution is bound by them.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Before You Start](#before-you-start)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Checklist](#pull-request-checklist)
- [Review Process](#review-process)
- [Updating Documentation](#updating-documentation)
- [Reporting Issues](#reporting-issues)
- [Getting Help](#getting-help)

---

## Code of Conduct

Be professional, direct, and kind. Disagreements are about ideas, never people. Harassment, discrimination, or hostile behavior of any kind is not tolerated.

---

## Before You Start

1. **Check [TASKS.md](./TASKS.md)** for existing work, and [ROADMAP.md](./ROADMAP.md) for direction.
2. **Read the relevant spec** under [docs/features/](./docs/features/) — work must match the spec, or the spec must change.
3. **Open or claim an issue/task** so effort isn't duplicated. For large changes, propose the approach before implementing.

---

## Ways to Contribute

- **Code** — implement a [TASKS.md](./TASKS.md) item or approved issue.
- **Documentation** — clarify, correct, or expand the `docs/` tree (docs are first-class; doc PRs are welcome).
- **Architecture decisions** — propose an [ADR](./docs/decisions/) for significant changes.
- **Tests** — improve coverage, fix flaky tests, add regression tests.
- **Issues** — report bugs, request features, note doc gaps.

---

## Development Setup

> Application code is not yet present. The setup below describes the intended flow once Phase 1 begins. See [docs/deployment/local.md](./docs/deployment/local.md) for the full local environment.

Prerequisites: Node.js 20 LTS, npm 10+ (or pnpm 9+), Docker & Docker Compose.

```bash
git clone <repo-url> construct-track && cd construct-track
npm install
cp .env.example .env       # then fill in required values
docker compose up -d postgres redis
npx prisma migrate dev     # once the schema exists (Phase 1)
npm run dev
```

Common scripts (post Phase 1):

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start web + API in watch mode |
| `npm run lint` | ESLint across the monorepo |
| `npm run typecheck` | TypeScript strict type-check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run build` | Production build of all apps/packages |

---

## Branch & Commit Conventions

- **Trunk-based.** Branch from `main`, PR back to `main`. Keep branches short-lived.
- **Branch prefix** reflects intent, then a kebab slug: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`.
- **Commit messages** are imperative mood, concise: `Add equipment maintenance schedule endpoint`, not `Added ...` or `Adds ...`.
- **One concern per branch.** Don't mix a refactor with a feature.

---

## Pull Request Checklist

A PR is ready for review when **all** are true (mirrors [PROJECT_RULES.md §13](./PROJECT_RULES.md#13-definition-of-done-checklist)):

- [ ] Branch name follows the prefix convention.
- [ ] PR references a [TASKS.md](./TASKS.md) ID or issue.
- [ ] Spec exists or is updated and linked (no feature without a spec).
- [ ] `npm run lint` and `npm run typecheck` pass locally.
- [ ] `npm run test` passes; new behavior has tests (incl. auth + tenant-isolation tests where relevant).
- [ ] Affected [docs](./docs/) updated in this same PR.
- [ ] No secrets, no `console.log`/`debugger`, no dead code.
- [ ] A `CHANGELOG.md` entry is added under `[Unreleased]`.
- [ ] PR description covers: **What**, **Why**, **How to test**.

---

## Review Process

1. Open the PR against `main`; CI runs automatically (lint → type-check → unit → integration → build).
2. At least one approval is required; significant changes (architecture, security, data model) need a domain maintainer.
3. Reviewers focus on: spec compliance, security/tenancy, test coverage, and doc accuracy.
4. Address feedback with new commits (do not force-push during review unless asked).
5. On approval + green CI, **squash-merge**. `main` stays linear and releasable.

Large or controversial changes may be split or paused for broader discussion via an ADR.

---

## Updating Documentation

Docs precede and outlive code; treat them as the source of truth.

- Every markdown file starts with its **purpose** and cross-links related docs.
- Use **relative links** so they work in any clone or preview.
- **No placeholder text** ("TODO", "lorem", "coming soon") in shipped docs.
- Verify links before merge — a broken link fails the spirit of [PROJECT_RULES.md §10](./PROJECT_RULES.md#10-documentation-rules).
- If your change invalidates a doc, **update that doc in the same PR**.

---

## Reporting Issues

When filing an issue, include:

- **Summary** and expected vs. actual behavior.
- **Steps to reproduce** (minimal, deterministic).
- **Environment** (browser/OS, or backend + DB versions).
- **Severity** and which persona/feature it affects.
- For security issues, **do not open a public issue** — see [docs/security/data-protection.md](./docs/security/data-protection.md) for the private disclosure path.

---

## Getting Help

- Start with [AI_CONTEXT.md](./AI_CONTEXT.md) for a fast project orientation.
- Architecture questions → [docs/architecture/](./docs/architecture/).
- "Where does X belong?" → [BIBLE.md §7](./BIBLE.md#7-folder-structure) and the relevant [docs/features/](./docs/features/) spec.
- Continuity → [HANDOFF.md](./HANDOFF.md).

Welcome aboard — let's build something the field can rely on.
