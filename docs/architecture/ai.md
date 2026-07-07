# AI Architecture

> How ConstructTrack integrates AI without surrendering its sovereignty to a single vendor: a provider-agnostic service abstraction, grounded synthesis over tenant data, strict tenant scoping, and cost/latency bounds on every call.

Companion docs: [system.md](./system.md), [docs/features/ai-assistant.md](../features/ai-assistant.md) (product behavior), [docs/security/data-protection.md](../security/data-protection.md), [TECH_STACK.md → AI](../../TECH_STACK.md#ai), [.env.example](../../.env.example).

---

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Provider Abstraction](#provider-abstraction)
- [Grounded Synthesis Pipeline](#grounded-synthesis-pipeline)
- [Tenant Scoping & Data Protection](#tenant-scoping--data-protection)
- [Cost, Latency & Safety Bounds](#cost-latency--safety-bounds)
- [Asynchronous AI Work](#asynchronous-ai-work)
- [Observability & Quality](#observability--quality)
- [Failure Modes & Degradation](#failure-modes--degradation)

---

## Overview

The AI assistant is a first-class ConstructTrack module, not a bolt-on. It answers natural-language questions ("What's at risk this week?"), drafts reports, and surfaces anomalies — all grounded in the tenant's own structured data. The architectural commitment is that **no domain or feature code depends on a specific AI vendor**. Swapping or combining providers (OpenAI, Anthropic, or a future model) is a configuration change, never a rewrite.

This decision is recorded in [TECH_STACK.md → AI](../../TECH_STACK.md#ai) and is binding: vendor SDKs live only inside adapter implementations behind the abstraction.

## Design Principles

1. **Vendor independence.** All AI calls go through a single `AIProvider` interface; concrete adapters implement it.
2. **Grounding over generation.** The assistant retrieves and shapes real tenant data first; the model synthesizes and explains — it never free-forms facts from its weights.
3. **Tenant isolation is absolute.** A request carries the caller's `tenantId`; the model never sees another tenant's data, even transitively.
4. **Bounded by design.** Every call has a token cap, a timeout, and a cost ceiling. No unbounded AI work.
5. **Async when slow.** Long-running synthesis runs on the `ai` queue; the API returns a job reference, not a hung request.
6. **Auditable.** AI interactions are logged (without sensitive payloads) so we can reason about cost and quality.

## Provider Abstraction

```
            Domain / feature code
                    │
                    ▼
        ┌────────────────────────┐
        │   AIProvider (interface) │   ← single seam
        │   complete(req): Promise │
        └────────────┬─────────────┘
                     │ implemented by
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
  OpenAIAdapter  AnthropicAdapter  (future adapters)
       │             │              │
       ▼             ▼              ▼
   vendor SDK    vendor SDK      vendor SDK
```

The `AIProvider` interface is intentionally narrow:

- **`complete(request): Promise<AIResponse>`** — the primary method: given a structured prompt (system, instructions, grounded context, user query), return a typed response with content, token usage, and a provider/model identifier.
- **`embed(text): Promise<number[]>`** — for any future retrieval/search features, behind the same seam.

The active provider is selected by configuration (`AI_PROVIDER`, [.env.example](../../.env.example)); adapters translate the interface to their SDK and normalize responses into our internal types. Domain code imports `AIProvider`, never a vendor type.

## Grounded Synthesis Pipeline

A user question never reaches the model as raw text alone. The pipeline:

1. **Intent & retrieval.** The assistant module parses the user's query, maps it to one or more *structured* data fetches against the tenant's data (via the normal domain services, scoped to `tenantId`).
2. **Grounding pack.** The retrieved facts are serialized into a structured "grounding context" — the only data the model is allowed to reason over for facts.
3. **Prompt assembly.** A controlled prompt combines the system instructions, the grounding pack, and the user's question. Instructions forbid fabricating facts outside the grounding pack.
4. **Synthesis.** The `AIProvider.complete()` call returns an answer grounded in the supplied context, ideally with citations referencing the grounding items.
5. **Post-processing.** The response is validated, citations are resolved back to real tenant records, and any unresolvable claim is flagged or dropped.

This keeps the assistant **truthful and inspectable**: every claim traces back to a record the tenant owns.

## Tenant Scoping & Data Protection

- **Every AI request is scoped to the caller's `tenantId`.** Retrieval at step (1) uses the same authorization and tenant-isolation rules as the rest of the API ([system.md → Multi-Tenancy Model](./system.md#multi-tenancy-model)).
- **No cross-tenant data.** The grounding pack is built from tenant-scoped queries only; there is no path by which another tenant's data enters the prompt.
- **Minimal data.** Only the fields needed to answer are included in the grounding pack — not a raw dump of the database.
- **Data handling** follows [docs/security/data-protection.md](../security/data-protection.md): we are explicit about which data is sent to which provider, configurable per environment, and documented for compliance. Tenants with stricter residency needs can disable AI or route to an approved provider.

## Cost, Latency & Safety Bounds

Each call is bounded on multiple axes ([.env.example](../../.env.example)):

| Bound | Mechanism |
| --- | --- |
| **Token cap** | `AI_MAX_TOKENS` limits response size |
| **Timeout** | `AI_REQUEST_TIMEOUT_MS` caps wall time |
| **Cost** | per-tenant usage tracked; soft quotas and alerts |
| **Rate** | AI endpoints are rate-limited like other write endpoints |
| **Safety** | input/output length checks; provider safety settings applied |

These bounds mean a runaway prompt or a degenerate query degrades gracefully instead of inflating cost.

## Asynchronous AI Work

Anything that may exceed a few seconds (multi-step synthesis, report drafting, bulk summarization) is enqueued on the **`ai` queue** (BullMQ), not run inline:

- The API returns a job reference immediately; the client polls or receives a push notification when done.
- Jobs carry an **idempotency key** so retries don't duplicate expensive calls.
- Workers can be scaled independently of the API ([system.md → Background Jobs](./system.md#background-jobs)).

Short, cheap calls (e.g., a single quick Q&A) may run inline within a generous timeout, but the default for anything ambiguous is to enqueue.

## Observability & Quality

- **Structured logs** capture: provider, model, token usage, latency, success/failure, and a correlation id — never the full prompt body where it may contain sensitive detail (configurable).
- **Per-tenant usage accounting** feeds cost dashboards and quota checks (Phase 5/6).
- **Quality signals** (user thumbs-up/down on answers, citation-resolved rate) are captured to drive prompt and retrieval improvements — treated as product analytics, not as a silent training pipeline.

## Failure Modes & Degradation

The assistant fails **safe and visible**, never silently wrong:

- **Provider timeout/error** → the user sees "the assistant couldn't complete this; please retry," with a correlation id. No partial fabricated answer.
- **Grounding empty** → the assistant says it couldn't find relevant data rather than hallucinating.
- **Provider disabled** (`AI_PROVIDER=none`) → the assistant UI is hidden; the platform works fully without AI. AI is an enhancement, not a dependency.
- **Cost/quota exceeded** → the request is rejected with a clear message and a path to resolve it.

This posture keeps AI a trustworthy accelerator rather than a liability.
