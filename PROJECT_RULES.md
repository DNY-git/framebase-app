# PROJECT_RULES.md — Mandatory Engineering Rules

> These rules are **binding**. Every pull request must satisfy them. They exist to keep ConstructTrack production-grade as it is built across many contributors and AI models. When a rule feels like an obstacle, open a discussion — do not silently ignore it.

The narrative behind these rules lives in [BIBLE.md](./BIBLE.md). This file is the enforceable checklist.

---

## Table of Contents

- [1. Behavior & Safety](#1-behavior--safety)
- [2. Architecture & Structure](#2-architecture--structure)
- [3. TypeScript & Code Quality](#3-typescript--code-quality)
- [4. Frontend Rules](#4-frontend-rules)
- [5. Backend Rules](#5-backend-rules)
- [6. Database Rules](#6-database-rules)
- [7. API Rules](#7-api-rules)
- [8. Security Rules](#8-security-rules)
- [9. Testing Rules](#9-testing-rules)
- [10. Documentation Rules](#10-documentation-rules)
- [11. Dependency Rules](#11-dependency-rules)
- [12. Git & PR Rules](#12-git--pr-rules)
- [13. Definition of Done (Checklist)](#13-definition-of-done-checklist)

---

## 1. Behavior & Safety

1. **Never delete working functionality** without explicit human approval and a recorded test plan.
2. **Never disable or weaken a security control** (auth, authz, tenant isolation, validation) to make a feature work.
3. **Never commit secrets**, real credentials, tokens, or `.env` files. Use `.env.example` for templates.
4. **Never perform irreversible actions** (destructive migrations, force-push to `main`, dropping columns/tables, deleting production data) without explicit confirmation.
5. **Surface uncertainty.** If a requirement is ambiguous, stop and ask — do not guess at irreversible decisions.
6. **Report results truthfully.** If a test was skipped or a step was not run, say so plainly.

## 2. Architecture & Structure

7. **Follow clean architecture.** UI, business logic, and data access live in separate layers; dependencies point inward toward the domain.
8. **Keep business logic out of UI components.** Components present and capture; services decide.
9. **Prefer reusable components.** Before writing a new component, check `packages/ui` and the design system.
10. **One concern per module/file.** A NestJS module owns one domain; a React feature folder owns one capability.
11. **No circular dependencies** between modules. If you feel one forming, extract a shared service.
12. **Introduce a new top-level directory only with an ADR.**

## 3. TypeScript & Code Quality

13. **`strict: true`** in every `tsconfig.json`. No implicit `any`.
14. **No `any` without a `// reason:` comment** and an accompanying `TODO`.
15. **No unused code.** Remove dead imports, variables, and files.
16. **No `console.log` or `debugger`** in committed code. Use the logging service.
17. **Functions do one thing.** If a function name needs "and," split it.
18. **Prefer pure functions.** Isolate side effects in handlers, controllers, and workers.
19. **Match the surrounding style.** Naming, formatting, and comment density follow what's already there.

## 4. Frontend Rules

20. **Mobile-first.** Build for the smallest viewport first; enhance upward.
21. **Strict TypeScript** with shared DTOs/types from `packages/types`. The API response shape is the frontend's source of truth.
22. **Server state via TanStack Query;** client/UI state via Zustand. Do not duplicate server state in Zustand.
23. **Forms use React Hook Form + Zod**, with schemas shared with the backend where possible.
24. **Every interactive element is keyboard-accessible** and meets WCAG 2.1 AA. See [docs/ui/accessibility.md](./docs/ui/accessibility.md).
25. **No inline styles for theming.** Use Tailwind tokens / design-system primitives.
26. **Optimistic updates must include rollback** on error.

## 5. Backend Rules

27. **Validation at the edge.** Every DTO uses `class-validator` decorators; controllers trust nothing raw.
28. **Authorization in the service layer,** not just the controller. Re-check on every mutation.
29. **Business logic in services,** not controllers. Controllers translate HTTP ↔ domain.
30. **Background work goes to a queue** (BullMQ), not an in-process `setTimeout`.
31. **All mutating operations are auditable.** Record actor, action, entity, before/after.
32. **Errors are typed.** Expected errors are domain exceptions; unexpected errors are logged and surfaced as a generic 500.

## 6. Database Rules

33. **Mongoose schemas are authoritative.** They define the document shape, validation, and indexes. Seed scripts initialize dev data.
34. **The repository pattern is mandatory.** Every domain module accesses data through a repository interface (`IBaseRepository<T>` → `BaseRepository<T>` → domain repository). Services never import Mongoose models directly.
35. **Every tenant-scoped collection has `tenantId`**, enforced by the base repository on every query. No exceptions.
36. **Compound indexes enforce uniqueness** (e.g., `userId + tenantId` on memberships). Schema indexes must cover common tenant-scoped query patterns.
37. **No raw `deleteMany` on production data** without a backup step and approval. Prefer soft-delete where history matters.
38. **No unbounded queries.** All list queries must use pagination, filtering, or streaming.
39. **The database is swappable.** The repository interface abstracts Mongoose. If the database changes, only the repository implementation changes — services remain untouched.

## 7. API Rules

40. **Versioned paths:** `/api/v1/...`. Bump the version on a breaking change.
41. **Consistent response envelopes.** Success and error shapes follow [docs/api/standards.md](./docs/api/standards.md).
42. **Pagination, filtering, and sorting** follow the documented conventions on every list endpoint. Do not manually parse pagination query parameters or build pagination metadata objects in controllers. Always use `parsePagination` and `formatPaginatedResponse` utilities from `apps/api/src/common/utils/pagination.util.ts` to ensure consistency and prevent duplication.
43. **Idempotency keys** on unsafe operations that may be retried (e.g., report generation).
44. **Every endpoint is documented** with request/response examples in [docs/api/endpoints.md](./docs/api/endpoints.md).

## 8. Security Rules

45. **Authentication is required by default.** Opt out explicitly, with a comment explaining why.
46. **Authorization checks every request,** scoped to tenant and role.
47. **Tenant isolation is verified by tests** — a cross-tenant access attempt must fail.
48. **Input is untrusted until validated,** including query params, headers, and file uploads.
49. **Secrets come from the environment**; never hardcode. See [docs/security/data-protection.md](./docs/security/data-protection.md).
50. **Logs never contain secrets or PII** beyond what compliance requires.
51. **Rate-limit and size-limit** public and write endpoints.

## 9. Testing Rules

52. **Every bug fix ships with a regression test.**
53. **Every new public service method and non-trivial component has tests.**
54. **Tests must be deterministic.** No flaky time/random/network dependencies without stubbing.
55. **Integration tests use a disposable database,** not mocks of the ORM.
56. **CI must be green on `main`.** Never merge red.
57. **Coverage is a signal, not a target.** Don't write tests purely to hit a number.

## 10. Documentation Rules

58. **No feature ships without a spec** under `docs/features/`.
59. **Update the docs you touch in the same change** that touches the code.
60. **No placeholder text** ("TODO", "lorem", "coming soon") in shipped docs.
61. **Every markdown file states its purpose** in the first lines and cross-links related docs.
62. **No broken links.** Verify cross-references before merge.

## 11. Dependency Rules

63. **Prefer the existing stack.** A new dependency requires an ADR explaining why existing tools can't do it.
64. **No new dependency without a license check.**
65. **Pin major versions; review transitive deps** in lockfiles.
66. **No "left-pad" micro-deps** for trivially implementable logic.

## 12. Git & PR Rules

67. **Trunk-based.** Branch from `main`, PR back to `main`.
68. **Branch prefix:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` + kebab slug.
69. **One concern per PR.** No bundled refactors + features.
70. **PR references a `TASKS.md` item** and adds a `CHANGELOG.md` entry.
71. **Squash-merge** to keep history linear.
72. **`main` is always releasable.**

## 13. Definition of Done (Checklist)

A change is complete only when **all** are true:

- [ ] Spec exists or is updated and referenced.
- [ ] Lint, type-check, and all affected tests pass.
- [ ] New/changed behavior has tests (incl. auth + tenant-isolation tests where relevant).
- [ ] Documentation updated; no broken links.
- [ ] No secrets, debug logs, or dead code.
- [ ] CHANGELOG entry added; PR reviewed and approved.
- [ ] `main` remains deployable.

---

*To propose changing a rule, open a PR editing this file with rationale. Rules evolve — but deliberately.*

## Phase Transition Rule

When a phase is completed:

- Perform a complete architectural review.
- Verify documentation consistency.
- Identify reusable abstractions.
- Reduce duplication.
- Verify quality gates.
- Produce a Phase Review.
- Update HANDOFF.md with the architectural state of the project.

Only then may implementation begin for the next phase.
## Module Consistency Rule

Every new domain module must mirror the existing architecture unless there is a documented reason to differ.

Each module should consistently include:

- Schema
- Repository
- DTOs
- Service
- Controller
- Authorization
- Audit logging
- Validation
- Tests
- Documentation

Avoid introducing new architectural patterns when an existing one already solves the problem.

## Standard Completion Report

Every completed roadmap task MUST produce:

1. Release Summary
2. Verification Matrix
3. Project Progress
4. Metrics
5. Technical Debt Summary
6. Next Task Preview
7. Updated HANDOFF.md

These reports must be generated regardless of the AI model being used.

The repository and documentation are the single source of truth. Previous conversations must never be required to continue development.