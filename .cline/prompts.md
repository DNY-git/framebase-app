# .cline/prompts.md — Ready-to-Use Prompts

> A library of tested prompts for kicking off common tasks in ConstructTrack. Paste the relevant prompt into your AI assistant (Cline, Claude, GPT, Gemini, GLM, DeepSeek, Qwen, etc.). Each prompt assumes the assistant has already read [AI_CONTEXT.md](../AI_CONTEXT.md).

Guidance on writing new prompts is at the bottom.

---

## Table of Contents

- [Onboarding](#onboarding)
- [Start a Phase](#start-a-phase)
- [Implement a Feature](#implement-a-feature)
- [Fix a Bug](#fix-a-bug)
- [Write Tests for an Area](#write-tests-for-an-area)
- [Write or Update a Spec](#write-or-update-a-spec)
- [Draft an ADR](#draft-an-adr)
- [Review a Pull Request](#review-a-pull-request)
- [Adding a Dependency](#adding-a-dependency)
- [Writing New Prompts](#writing-new-prompts)

---

## Onboarding

```
You are joining the ConstructTrack project. Read AI_CONTEXT.md, then BIBLE.md
sections 4 (Core Principles) and 15 (AI Operating Rules), then PROJECT_RULES.md.
Summarize back: (1) the project in two sentences, (2) the current phase and its
exit criteria from ROADMAP.md, (3) the top three current tasks from TASKS.md,
and (4) the three rules you are most likely to violate if you're not careful.
Do not write any code yet.
```

---

## Start a Phase

```
We are entering Phase <N> of ROADMAP.md ("<Theme>"). Read the phase's scope and
exit criteria, then:
1. List the TASKS.md IDs that belong to this phase.
2. Propose the order to tackle them (dependencies first) and why.
3. Identify the single first task to begin, branch name, and the spec it
   implements.
Do not start coding until I confirm the order.
```

---

## Implement a Feature

```
Implement task <T-###> from TASKS.md.

Constraints:
- Follow .cline/workflow.md "Workflow B: Implement a Feature".
- One concern per change; do not bundle a refactor.
- TypeScript strict; validate at the edge; authorize in the service layer.
- Add tests including tenant-isolation and role checks.
- Update the relevant docs/features/<domain>.md in the same change.

Start by confirming the spec and the data-model changes you'll need, and stop
for my approval before writing application code.
```

---

## Fix a Bug

```
Fix the bug described below using .cline/workflow.md "Workflow C: Fix a Bug".

<reproduction steps / error / link to issue>

Requirements:
- Write a failing regression test first.
- Fix the root cause, not a symptom.
- Run the affected suite and report the real output.
- Note any spec or doc that must change.

Do not mark it done until the Definition of Done checklist passes.
```

---

## Write Tests for an Area

```
Add tests for <area: module/component/file>. Goals:
- Cover public behaviors and edge cases, not line coverage for its own sake.
- Include a cross-tenant access test that must FAIL (proving isolation).
- Include role/permission tests for each mutating operation.
- Tests must be deterministic (stub time/random/network).

Identify any gaps in the spec or behavior you find along the way, and list them
rather than silently changing behavior.
```

---

## Write or Update a Spec

```
Write/update the feature spec at docs/features/<domain>.md using the structure
of an existing spec in that folder as a template. Include: Overview, User
Stories, Data Model (entities + key fields), Permissions/Roles, API surface,
UI/UX notes, Edge Cases, Non-functional requirements, and Open Questions.
No placeholder text — every section must carry real content. Cross-link related
docs (architecture, database schema, api endpoints). Verify all links resolve.
```

---

## Draft an ADR

```
Draft an ADR for this decision: "<one-line description>".
File: docs/decisions/ADR-0NN-<slug>.md, using ADR-001 as the template.
Include: Context, Decision, Alternatives Considered (with trade-offs),
Consequences (positive/negative/neutral), and Compliance with BIBLE.md
principles. If it changes the stack, note the required TECH_STACK.md edit.
Present the draft for review; do not commit until I approve.
```

---

## Review a Pull Request

```
Review this PR against PROJECT_RULES.md and the Definition of Done (§13).
Check specifically:
- Spec exists/updated and referenced; one concern only.
- Tenant isolation and authorization tests present and passing.
- No secrets, console.log/debugger, dead code, or `any` without a reason.
- Docs updated; CHANGELOG entry present; no broken links.
- Lint, typecheck, and tests green (report actual CI output).
Return: APPROVE / REQUEST CHANGES with a numbered list, each item blocking or
non-blocking.
```

---

## Adding a Dependency

```
Evaluate adding "<package>" for "<use case>".
- Can existing stack tools do this? Show the closest alternative.
- License? Bundle/runtime cost? Maintenance health?
- If justified, draft the ADR (Workflow E) and the TECH_STACK.md edit.
Do not install anything until I approve the ADR.
```

---

## Writing New Prompts

Good prompts in this repo:

- **Name a concrete task ID or file** so the assistant doesn't guess scope.
- **Reference the governing doc** (`PROJECT_RULES.md`, `BIBLE.md`, the spec) by name.
- **State hard constraints** up front (strict TS, one concern, tenant isolation tests).
- **Build in a stop point** ("stop for my approval before…") for irreversible work.
- **Demand truthfulness** ("report the real output," "do not mark done until…").
- **Forbid shortcuts** the rules already forbid (no placeholders, no `any`, no bundled refactors).

Add new prompts to this file as repeatable patterns emerge, so the next contributor (human or AI) starts from a tested baseline.
