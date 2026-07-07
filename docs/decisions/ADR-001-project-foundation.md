# ADR-001: Project Foundation — Modular Monolith with Shared TypeScript

**Status:** Accepted
**Date:** 2026-07-03
**Deciders:** Project leads / architecture team
**Related:** [BIBLE.md](../../BIBLE.md), [TECH_STACK.md](../../TECH_STACK.md), [ROADMAP.md](../../ROADMAP.md)

---

## Context

ConstructTrack is a multi-tenant Construction Tracking Platform that will be developed over a long period by multiple contributors, including AI models (GLM, Claude, GPT, Gemini, DeepSeek, Qwen, etc.). The platform must be production-grade, mobile-first, and capable of hosting 100+ projects per tenant with plans for future scale (IoT, offline, native apps).

We need a foundation that is:

- **Comprehensible** to any new contributor (human or AI) — the documentation-first mandate in [BIBLE.md §16](../../BIBLE.md#16-documentation-standards).
- **Consistent** across the stack (one language, one set of types, one error model).
- **Evolvable** — able to grow for years without a ground-up rewrite.
- **Secure by structure** — tenant isolation and least-privilege baked into the architecture, not bolted on.
- **Documented before built** — specs, ADRs, and a living constitution govern all changes.

Several architectural and technology choices were at stake. This ADR records the foundational decisions and the alternatives considered.

---

## Decision

### 1. Modular Monolith (not microservices on day one)

We chose a **single NestJS application composed of domain modules** with clean boundaries (modules, services, repositories), deployed as one containerized process.

**Why not microservices now:**
- Our domains (projects, tasks, equipment, inventory) are tightly related; cross-domain queries (dashboard, reports) benefit from a single relational database with shared transactions.
- Distributed systems add operational complexity (service mesh, inter-service auth, data consistency) that we don't need yet and can't afford to get wrong at the start.
- The modular structure **preserves extractability**: each module has a clear boundary so it *can* be extracted into a service later if scale demands it.

**Trade-off:** we accept that a very large tenant might eventually need domain isolation at the service level. We'll know when by metrics (queue depth, CPU, DB contention) and address it with an ADR and extraction — not by preempting the complexity.

### 2. Shared TypeScript (strict) across web and API

One language, one type system, shared DTOs via `packages/types`. The API response shape is the frontend's source of truth.

**Why:**
- Eliminates an entire class of bugs: mismatched request/response shapes between frontend and backend.
- Every AI and developer works in the same type world — no context-switching cost.
- `strict: true` everywhere catches bugs at compile time.

**Alternative rejected:** separate languages for frontend and backend (e.g., Python/Django) would break the shared-type principle and require two ecosystems to staff and maintain.

### 3. React 18 SPA with Tailwind + shadcn/ui (not SSR, not native first)

A single-page application built with React 18, Vite, Tailwind CSS, and shadcn/ui (Radix-based), served as static assets behind Nginx.

**Why not Next.js / SSR:**
- The app is authenticated and API-driven; server-side rendering adds complexity (hydration, streaming) without a clear benefit since the data isn't public or SEO-critical.
- A simpler deployment model (static assets + API container) fits our Docker/Nginx infrastructure.

**Why shadcn/ui:**
- We *own* the components (copied into `packages/ui`), not imported from a black-box library — essential for the field-first, mobile-first customization.
- Built on Radix: accessible by default ([BIBLE.md §10](../../BIBLE.md#10-ui-philosophy)).

### 4. PostgreSQL 16 as the single source of truth (not MongoDB, not multi-DB)

One relational database for all tenant data; Redis as cache/queue only.

**Why:**
- Construction domains are inherently relational (projects contain tasks; tasks consume equipment and materials; reports aggregate across everything). ACID guarantees, foreign keys, and constraints enforce integrity.
- Row-level tenant isolation (`tenantId` on every scoped table) maps naturally to a shared-schema model.
- One DB to back up, one to reason about, one to monitor.

**Why not MongoDB:**
- While flexible, MongoDB loses the relational integrity and transactional guarantees our financial/cost data (budgets, inventory valuations, equipment costs) requires.

### 5. Documentation-first (code waits for docs)

The first deliverable is a comprehensive documentation system ([ROADMAP.md Phase 0](../../ROADMAP.md#phase-0--foundation--approval)) — not application code. Every future change must have a spec, an ADR if architectural, and an update to affected docs.

**Why:**
- The project will be built by many hands and AI models over a long period. Without docs, every hand is an archaeologist digging through intent.
- Specs before code catch design mistakes at paper cost, not implementation cost.
- The documentation foundation is what makes "any future AI or developer can immediately understand the project" ([BIBLE.md introduction](../../BIBLE.md)) achievable.

### 6. AI as provider-agnostic enhancement (not core dependency)

The AI assistant talks to a `AIProvider` interface; concrete adapters for OpenAI/Anthropic are configuration-swappable. The platform is fully functional with AI disabled.

**Why:**
- The AI market moves fast; betting on one vendor creates lock-in and rework.
- Field users can't afford a platform that breaks if the AI provider is down — AI is additive, not load-bearing.

---

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Microservices day one | Operational complexity (service mesh, inter-service auth, distributed transactions) outweighs benefits at our current scale |
| GraphQL | REST with a documented envelope is simpler for our CRUD-heavy domains; revisit if client query flexibility becomes a pain point |
| Next.js / SSR | Authenticated API-driven SPA doesn't benefit from SSR; adds complexity without clear ROI |
| MongoDB | Domains are relational; ACID and FK constraints matter for financial/cost data |
| Redux Toolkit | More ceremony than Zustand + TanStack Query; doesn't solve our server-state problem |
| Direct vendor AI SDK in domain code | Vendor lock-in; changing provider becomes a rewrite |

---

## Consequences

### Positive
- **Fast iteration:** one repo, one language, one deploy pipeline — new contributors (and AI) can ship quickly.
- **Shared types eliminate response-shape bugs** between web and API.
- **Modular monolith** keeps the codebase approachable while preserving extractability for future scale.
- **Docs-first** ensures every change is intentional and reviewable before code exists.
- **AI is swappable** without touching domain code.

### Negative
- **Single DB is a single point of failure** — mitigated by managed Postgres HA, PITR, and restore drills (Phase 6).
- **Monolith scaling ceiling** — we will eventually hit a point where a module needs its own process; the extraction path is prepared but not free.
- **SPA without SSR** means first-load performance depends on bundle size and code splitting discipline.
- **Docs-first slows initial velocity** — but pays compound interest as the project grows.

### Neutral
- The architecture is opinionated and will not suit every team's preference — that's intentional. Consistency is more valuable than everyone's favorite tool.

---

## Compliance with BIBLE.md Principles

| Principle | How this ADR upholds it |
| --- | --- |
| One source of truth | PostgreSQL is the single DB; `schema.prisma` is the single schema; docs precede code |
| Simplicity over cleverness | Modular monolith, not distributed systems; REST, not GraphQL |
| Composition over inheritance | NestJS modules + shared services; React feature folders |
| Mobile-first | Field-first design; accessible by default |
| Reversibility | Modular monolith preserves extractability; ADRs record irreversible decisions |
| Security is a feature | Tenant isolation by structure; auth + authz as load-bearing concerns |

---

## Template for Future ADRs

Copy this structure for new decisions:

```markdown
# ADR-NNN: <Short Title>

**Status:** Proposed / Accepted / Deprecated / Superseded by ADR-MMM
**Date:** YYYY-MM-DD
**Deciders:** <who>
**Related:** <links to BIBLE, other ADRs, relevant specs>

---

## Context
(What situation requires a decision? What constraints exist?)

## Decision
(What was decided, and why? Include alternatives.)

## Alternatives Considered
(What else was evaluated and rejected?)

## Consequences
(Positive, negative, neutral impacts.)

## Compliance with BIBLE.md Principles
(How this decision aligns with or departs from the constitution.)
```
