# .cline/workflow.md — Standard Workflows for AI Agents

> Repeatable step-by-step procedures for the most common tasks in ConstructTrack. Follow these unless the user explicitly directs otherwise. Each workflow ends with the [Definition of Done](../PROJECT_RULES.md#13-definition-of-done-checklist) check.

Companion files: [instructions.md](./instructions.md) (rules), [prompts.md](./prompts.md) (ready-to-use prompts), [TASKS.md](../TASKS.md) (board).

---

## Table of Contents

- [Universal Pre-Flight](#universal-pre-flight)
- [Workflow A: Pick Up a Task](#workflow-a-pick-up-a-task)
- [Workflow B: Implement a Feature](#workflow-b-implement-a-feature)
- [Workflow C: Fix a Bug](#workflow-c-fix-a-bug)
- [Workflow D: Add or Update Documentation](#workflow-d-add-or-update-documentation)
- [Workflow E: Propose an Architecture Decision (ADR)](#workflow-e-propose-an-architecture-decision-adr)
- [Workflow F: Dependency / Tech-Stack Change](#workflow-f-dependency--tech-stack-change)
- [Universal Wrap-Up](#universal-wrap-up)

---

## Universal Pre-Flight

Run at the start of **every** task, no exceptions:

1. Load [AI_CONTEXT.md](../AI_CONTEXT.md).
2. Check [TASKS.md](../TASKS.md) and the current [ROADMAP.md](../ROADMAP.md) phase.
3. Re-read [PROJECT_RULES.md](../PROJECT_RULES.md) §1 (Behavior & Safety).
4. Confirm the shell/tools you need actually work in this environment (see [instructions.md §8](./instructions.md#8-tooling-constraints-in-this-environment)).
5. If the task is irreversible or ambiguous → **stop and ask** before acting.

---

## Workflow A: Pick Up a Task

1. In [TASKS.md](../TASKS.md), find a `Backlog` or `In Progress` item within the current phase.
2. Move it to **In Progress** with your name/role as owner and today's date.
3. Read its linked spec under [docs/features/](../docs/features/).
4. Branch from `main`: `<prefix>/<task-id>-<slug>` (e.g., `feat/t-105-task-wbs`).
5. Proceed to the matching workflow below (B for features, C for bugs, D for docs).

---

## Workflow B: Implement a Feature

1. **Spec check.** Confirm a spec exists in `docs/features/<domain>.md`. If not, write it first (Workflow D).
2. **Types first.** Define shared DTOs/types in `packages/types`; update Prisma schema (`prisma/schema.prisma`) if the data model changes.
3. **Migration.** Generate with `npx prisma migrate dev --name <slug>`; never hand-edit an applied migration.
4. **Backend.** DTO + validation → service (business logic + authorization) → controller (thin). Add unit + integration tests.
5. **Frontend.** Hook (TanStack Query) → UI (design-system components) → route + permission guard. Add component tests.
6. **Tenancy & auth.** Add tests proving tenant isolation and correct role behavior for the feature.
7. **Docs.** Update the feature spec and any architecture/API pages touched.
8. **Verify.** `npm run lint && npm run typecheck && npm run test` for the affected area.
9. **Universal Wrap-Up** below.

---

## Workflow C: Fix a Bug

1. **Reproduce.** Capture minimal, deterministic reproduction steps in the issue.
2. **Root cause.** Find the actual source; don't patch a symptom.
3. **Regression test.** Write a failing test that reproduces the bug.
4. **Fix.** Make the test pass with the smallest correct change.
5. **Verify.** Re-run the full affected test suite; confirm no regressions.
6. **Docs/CHANGELOG.** Note behavior changes and any spec update.
7. **Universal Wrap-Up** below.

---

## Workflow D: Add or Update Documentation

1. **Locate the right file.** Use [README.md → Documentation Map](../README.md#documentation-map) to find where it belongs.
2. **State purpose up top.** Every markdown file leads with a one-line purpose.
3. **No placeholders.** Write real, meaningful content — no "TODO"/"lorem"/"coming soon".
4. **Cross-link.** Add relative links to related docs; update those docs to link back.
5. **Verify links.** Confirm every cross-reference resolves.
6. **Update [CHANGELOG.md](../CHANGELOG.md)** under `[Unreleased]`.
7. If the doc describes a decision, also follow Workflow E.

---

## Workflow E: Propose an Architecture Decision (ADR)

Use when introducing or changing a foundational technology, pattern, or cross-cutting design.

1. Copy the template at the bottom of [ADR-001](../docs/decisions/ADR-001-project-foundation.md) (or an existing ADR) to `docs/decisions/ADR-0NN-<slug>.md`.
2. Fill in: Context, Decision, Alternatives Considered, Consequences, Compliance with [BIBLE.md](../BIBLE.md) principles.
3. Update [TECH_STACK.md](../TECH_STACK.md) if the decision changes the stack.
4. Reference the ADR from affected [docs/architecture/](../docs/architecture/) or [docs/features/](../docs/features/) pages.
5. Add a [CHANGELOG.md](../CHANGELOG.md) entry.

---

## Workflow F: Dependency / Tech-Stack Change

1. Justify in an ADR (Workflow E) — why can't existing tools do this? License check included.
2. Pin the **major** version; review transitive deps in the lockfile.
3. Update [TECH_STACK.md](../TECH_STACK.md) and any affected configs in `packages/config`.
4. Run the full lint/type-check/test/build to confirm no breakage.
5. Flag the change in the PR description for explicit reviewer attention.

---

## Universal Wrap-Up

At the end of every task, before declaring done:

1. **Run quality gates:** `lint`, `typecheck`, `test` for affected areas. Report real output.
2. **Definition of Done** checklist — go through [PROJECT_RULES.md §13](../PROJECT_RULES.md#13-definition-of-done-checklist) item by item.
3. **Update tracking:** move the [TASKS.md](../TASKS.md) item to the right column; update [HANDOFF.md](../HANDOFF.md) Current Status; add a [CHANGELOG.md](../CHANGELOG.md) entry.
4. **Commit & PR:** one concern, branch prefix correct, imperative commit message, references the task ID.
5. **Summarize** for the user: what changed, what's verified, what's outstanding, what needs human review.

If **anything** in the checklist is not true, the task is **not done** — say so explicitly.
