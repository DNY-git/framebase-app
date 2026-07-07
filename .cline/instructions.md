# .cline/instructions.md — AI Operating Instructions

> Binding instructions for any AI assistant (Cline, Claude, GPT, Gemini, GLM, DeepSeek, Qwen, etc.) working inside the ConstructTrack repository. These complement — and never weaken — [PROJECT_RULES.md](../PROJECT_RULES.md) and [BIBLE.md](../BIBLE.md).

---

## Table of Contents

- [1. Read Before You Act](#1-read-before-you-act)
- [2. What You May and May Not Do](#2-what-you-may-and-may-not-do)
- [3. Workflow Discipline](#3-workflow-discipline)
- [4. Code Standards](#4-code-standards)
- [5. Documentation Standards](#5-documentation-standards)
- [6. Communication Norms](#6-communication-norms)
- [7. Security & Privacy](#7-security--privacy)
- [8. Tooling Constraints in This Environment](#8-tooling-constraints-in-this-environment)

---

## 1. Read Before You Act

Before making any change, load context in this order:

1. [AI_CONTEXT.md](../AI_CONTEXT.md) — minimum required context (project summary, stack, rules, priorities).
2. [TASKS.md](../TASKS.md) — current board state; find your task.
3. The relevant spec under [docs/features/](../docs/features/) for your task.
4. [PROJECT_RULES.md](../PROJECT_RULES.md) — especially §1 (Behavior & Safety) and §13 (Definition of Done).

If your work touches architecture or security, also read the matching [docs/architecture/](../docs/architecture/) or [docs/security/](../docs/security/) page. **Do not guess** when a doc exists.

## 2. What You May and May Not Do

**You may:**
- Implement tasks from [TASKS.md](../TASKS.md) that are `In Progress` or `Backlog` and within the current roadmap phase.
- Write tests, docs, and refactorings that follow the one-concern rule.
- Update [TASKS.md](../TASKS.md), [CHANGELOG.md](../CHANGELOG.md), and [HANDOFF.md](../HANDOFF.md) to reflect your progress.

**You must NOT:**
- Delete working functionality without explicit human approval.
- Disable or weaken authentication, authorization, or tenant isolation.
- Commit secrets, real credentials, or the `.env` file.
- Perform irreversible actions (destructive migrations, dropping tables/columns, force-push to `main`, deleting production data) without explicit confirmation.
- Introduce a new dependency without an [ADR](../docs/decisions/) and a license check.
- Write code that contradicts the docs — update the doc first.
- Bundle a refactor with a feature in the same PR.

## 3. Workflow Discipline

- **One concern per change.** If the work splits into two ideas, do two PRs.
- **Spec-first.** No feature without a spec; update the spec when the design evolves.
- **Branch prefix:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` + kebab slug.
- **Run lint + type-check + tests** for the area you touched; report the actual result.
- **Definition of Done** ([PROJECT_RULES.md §13](../PROJECT_RULES.md#13-definition-of-done-checklist)) must be fully satisfied before declaring a task complete.

## 4. Code Standards

- TypeScript `strict: true` everywhere; no `any` without a `// reason:` comment.
- Match the surrounding style — naming, formatting, comment density.
- Functions do one thing; pure where possible; side effects at the edges.
- Validate at the edge (DTOs + class-validator); authorize in the service layer.
- Business logic in services, not controllers or components.
- Background work goes through BullMQ, never `setTimeout`.
- No `console.log`/`debugger` in committed code — use the logging service.

## 5. Documentation Standards

- Update the docs you touch **in the same change** as the code.
- No placeholder text ("TODO", "lorem", "coming soon") in shipped docs.
- Use relative links; verify they resolve before finishing.
- Cross-reference related docs; every file states its purpose up top.

## 6. Communication Norms

- **Report truthfully.** If a step was skipped or a test failed, say so plainly. Do not claim success without evidence.
- **Surface uncertainty.** If a requirement is ambiguous or a decision is irreversible, stop and ask.
- **Summarize at the end** of a task: what changed, what's verified, what's outstanding, what needs human review.
- **Cite the spec** and the task ID in your summary.

## 7. Security & Privacy

- Treat all input as untrusted; validate everything.
- Never log secrets or PII beyond what compliance requires.
- Every mutating operation must be auditable (actor, action, entity, before/after).
- Cross-tenant access must be impossible — and proven by tests.
- For suspected security issues, follow the private disclosure path in [docs/security/data-protection.md](../docs/security/data-protection.md), not a public issue.

## 8. Tooling Constraints in This Environment

- The sandboxed shell in this environment has had an **empty PATH** and missing core Unix utilities (`ls`, `tr`, `head`, `where`, `cmd.exe`). Prefer the dedicated file/search tools (Read, Write, Edit, Glob, Grep).
- Before relying on a shell command (`git`, `npm`, `docker`, `prisma`), verify it actually runs here; if not, fall back to the dedicated tools or ask the user to run it.
- Never assume a command succeeded from its presence alone — check its output.

---

*When in doubt, the order of authority is: human instruction → [BIBLE.md](../BIBLE.md) → [PROJECT_RULES.md](../PROJECT_RULES.md) → this file → everything else.*
