# Testing Strategy

> The testing philosophy and tooling for ConstructTrack: what we test, where in the stack, and why. Tests describe behavior, guard regressions, and prove that our security model holds. Coverage is a signal, not a target — the right tests in the right places beat high numbers every time.

Companion docs: [frontend.md](./frontend.md), [backend.md](./backend.md), [../deployment/ci-cd.md](../deployment/ci-cd.md), [PROJECT_RULES.md §9](../../PROJECT_RULES.md#9-testing-rules), [BIBLE.md §9](../../BIBLE.md#9-development-philosophy).

---

## Table of Contents

- [Philosophy](#philosophy)
- [Testing Pyramid](#testing-pyramid)
- [Tooling](#tooling)
- [Test Types & Scope](#test-types--scope)
- [What We Test](#what-we-test)
- [What We Don't Test (Much)](#what-we-dont-test-much)
- [Determinism & Flakiness](#determinism--flakiness)
- [Test Data & Fixtures](#test-data--fixtures)
- [Coverage as Signal](#coverage-as-signal)
- [CI Integration](#ci-integration)
- [E2E Tests](#e2e-tests)

---

## Philosophy

1. **Tests describe behavior, not implementation.** A test named `should deny cross-tenant task read` tells you the rule; a test named `repository.where.tenantId.eq` tells you the ORM call — the first is useful to a future developer, the second is brittle and noisy.
2. **The right test in the right layer.** Validate DOM behavior in component tests, business rules in unit tests, and full flows in integration tests — don't test everything everywhere.
3. **Every bug ships with a regression test.** The test that would have caught it, written before the fix.
4. **Deterministic by construction.** No flaky tests in the main suite. Time, randomness, and network are stubbed or controlled.
5. **Real DBs for integration.** Mocking the ORM hides tenant-isolation bugs; integration tests use disposable Postgres ([PROJECT_RULES.md §9](../../PROJECT_RULES.md#9-testing-rules)).

## Testing Pyramid

```
              /  E2E (Playwright)  \          ← few, slow, high confidence
             /  Integration (Vitest) \        ← service-level, real DB/Redis
            /  Unit (Vitest + Testing Library) \  ← many, fast, focused
```

- **Unit** (broad base): components, services, pure functions — fast, isolated.
- **Integration** (middle): services against a real Postgres/Redis — validates queries, transactions, migrations.
- **E2E** (top): Playwright against a running app — validates the full stack end-to-end.

## Tooling

| Layer | Tool | Why |
| --- | --- | --- |
| **Unit** | Vitest | Jest-compatible, Vite-native, fast, shared config across monorepo |
| **Component** | Vitest + Testing Library + jsdom | User-centric assertions; accessible queries (`getByRole`) |
| **Integration** | Vitest + disposable Docker (Postgres, Redis) | Real DBs, not mocks — catches schema/isolation bugs |
| **E2E** | Playwright | Cross-browser, reliable traces, time-travel debugging |

All tests share TypeScript strict, the same type imports, and the same lint/format config.

## Test Types & Scope

| Type | Scope | Runs in | Speed |
| --- | --- | --- | --- |
| **Unit — component** | Renders a React component; asserts on output, interactions, and accessible names. | jsdom (in-memory) | <100ms |
| **Unit — service** | Calls a service method with mocked repositories; asserts on business logic and errors. | Node (in-memory) | <50ms |
| **Unit — utility** | Pure function in → out. | Node | <10ms |
| **Integration** | Calls a real service against a real Postgres/Redis; applies migrations first. | Docker (disposable) | 1–5s |
| **E2E** | Browser drives the full app (API + web) through a user flow. | Docker (full stack) | 5–30s |

## What We Test

**Every feature must test:**

- **Happy path:** the primary user flow works (create, read, update, delete).
- **Authorization:** each role is correctly allowed or denied (see [../security/authorization.md → Testing Authorization](../security/authorization.md#testing-authorization)).
- **Tenant isolation:** cross-tenant access is impossible — a dedicated test per feature that must fail for the attacker.
- **Validation:** invalid input produces the correct error shape and field-level messages.
- **Edge cases:** empty collections, boundary values, missing relations, concurrent conflicts.
- **Error paths:** service/domain errors map to the correct HTTP status and envelope code.

**Specific mandates:**

- Every public service method has at least one test.
- Every non-trivial React component has a test (render + key interactions).
- Every mutating API endpoint has a test (happy + error + auth).
- Every schema change has a migration test (apply + rollback).

## What We Don't Test (Much)

- **Prisma internals** — we trust the ORM; we test our queries, not the query builder.
- **React internals** — we trust the framework; we test user-visible behavior, not state updates.
- **NestJS boilerplate** — module wiring is tested implicitly by integration; we don't unit-test every `@Injectable`.
- **Third-party libraries** — we wrap them and test our wrappers; we don't test the library.
- **Pure presentation** — trivial static renders don't always need a test.

## Determinism & Flakiness

- **No `Date.now()` in tests** — use a controllable clock (Vitest's `vi.useFakeTimers`).
- **No `Math.random()` in tests** — seed or stub.
- **No real network in tests** — services are called directly or via test harness; external calls are stubbed.
- **Disposable databases** — each integration test suite spins up a fresh Postgres/Redis; nothing is shared.
- **Parallelism-safe:** Vitest runs files in parallel; tests must not share mutable state or collide on ports.
- **Flaky tests are fixed immediately** — a flaky test is a bug in the test, not a fact of life. Move it to a serial file or fix the isolation, then re-enable.

## Test Data & Fixtures

- **Factory functions** (`src/__tests__/factories/`) create valid test entities with minimal, overridable defaults. Factories call Prisma directly in integration tests.
- **Seed data** (`prisma/seed.ts`) creates the baseline local-dev dataset (a tenant, projects, tasks, users). CI uses its own minimal seed.
- **Test users** include one per role (`adminUser`, `managerUser`, `crewUser`, `viewerUser`) so every test can grab the right persona.
- **Cross-tenant test fixtures** create two tenants with data; the test asserts one cannot see the other.

## Coverage as Signal

- Coverage is **collected but not a hard gate.** A file with 90% coverage and no auth/isolation tests is worse than a file with 60% coverage that tests the critical paths.
- **Coverage as a signal, not a target** ([PROJECT_RULES.md §9](../../PROJECT_RULES.md#9-testing-rules)): look at uncovered lines and ask whether the missing behavior matters.
- Areas where coverage **must** be high: auth guards, authorization checks, tenant isolation, audit logging, validation, and error handling.

## CI Integration

- **Unit + component:** run on every PR and push; fast (< 30s total).
- **Integration:** runs on every PR with disposable DB (service containers); ~1–2 min.
- **E2E:** runs on `main` pushes and release tags against a full-stack environment; ~2–5 min.
- **All must be green to merge.** Flaky tests block the pipeline — fix or quarantine with a comment and a deadline.
- Pipeline detail: [../deployment/ci-cd.md](../deployment/ci-cd.md).

## E2E Tests

E2E tests are **Playwright** scenarios against the full running stack:

- **Critical paths only:** register → login → create project → create task → complete task → view dashboard → logout.
- **Cross-browser:** Chromium by default; Firefox/Webkit for critical paths.
- **Traces & screenshots:** on failure, Playwright captures a trace for time-travel debugging.
- **Auth-isolation scenario:** one E2E test runs a full flow in tenant A, then switches to tenant B and confirms tenant A's data is invisible.

E2E is the smallest test count but the highest-confidence layer — it proves the stack wires correctly.
