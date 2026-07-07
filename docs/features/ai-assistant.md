# Feature Spec: AI Assistant

> The AI Assistant lets users ask questions in natural language and get grounded, cited answers from their tenant's data; it drafts reports and surfaces risks. It's an enhancement layer — never a dependency — and it never fabricates facts outside the data it can cite.

Companion docs: [../architecture/ai.md](../architecture/ai.md) (the provider-agnostic design), [../api/endpoints.md → AI Assistant](../api/endpoints.md#ai-assistant), [../security/data-protection.md](../security/data-protection.md). Roadmap: Phase 5.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Capabilities](#capabilities)
- [Grounding & Citations](#grounding--citations)
- [Data Model](#data-model)
- [Permissions & Tenant Scoping](#permissions--tenant-scoping)
- [Interaction Modes (Sync vs Async)](#interaction-modes-sync-vs-async)
- [Safety, Cost & Rate Limits](#safety-cost--rate-limits)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

The AI Assistant is a ConstructTrack module that turns "what's at risk this week?" into a grounded, sourced answer. It does **retrieval first** — querying the tenant's structured data through normal domain services — then asks the model to **synthesize** over that grounding. It is provider-agnostic ([../architecture/ai.md](../architecture/ai.md)): OpenAI or Anthropic today, swappable tomorrow.

Crucially, the assistant is **optional and degradable** — set `AI_PROVIDER=none` and the platform works fully without it ([../architecture/ai.md → Failure Modes](../architecture/ai.md#failure-modes--degradation)).

## User Stories

- **As a PM**, I ask "What's at risk this week?" and get a concise answer citing the specific overdue/critical tasks.
- **As a PM**, I ask the assistant to draft a weekly summary I can review and edit.
- **As an executive**, I ask "Which projects are over budget?" and get a grounded list.
- **As a site engineer**, I ask about a project's open blockers without hunting through the task board.
- **As any user**, I can give thumbs-up/down feedback to improve answer quality over time.

## Capabilities

| Capability | What it does | Mode |
| --- | --- | --- |
| **Q&A** | Answer natural-language questions over tenant data | sync (short) / async (long) |
| **Summarize** | Generate a project/week/etc. summary | async |
| **Draft report** | Draft a report from parameters (reviewable, editable) | async |
| **Risk surfacing** | Proactively flag overdues, anomalies, blocked chains | async (future) |

Drafting never auto-publishes; a draft is a starting point the user reviews, edits, and then saves/shares.

## Grounding & Citations

The assistant never free-forms facts from the model's weights. Pipeline (full detail in [../architecture/ai.md](../architecture/ai.md)):

1. **Retrieve** structured tenant data relevant to the query, through normal domain services (tenant- and permission-scoped).
2. **Assemble a grounding pack** — the only facts the model may reason over.
3. **Synthesize** with a controlled prompt that forbids fabrication outside the pack.
4. **Cite** — the answer references grounding items; citations resolve back to real tenant records (tasks, projects, materials).
5. **Post-process** — drop or flag any unresolvable claim.

If retrieval returns nothing relevant, the assistant says so rather than inventing. This keeps answers **truthful and inspectable**.

## Data Model

- **`ai_conversation`** / **`ai_message`** (future) — for multi-turn Q&A sessions; tenant- and user-scoped.
- **`ai_job`** — tracks async jobs (summarize, draft, long Q&A): `type`, `status`, `params`, `result`, `cost`, `provider`, `model`.
- **`ai_feedback`** — thumbs-up/down + optional comment, linked to the answer/job for quality analytics.

AI data is tenant-scoped; a job/answer never references another tenant's data.

## Permissions & Tenant Scoping

- Every AI request carries the caller's `tenantId` and role; **retrieval uses the same authorization rules as the rest of the API** ([../security/authorization.md](../security/authorization.md)).
- The model **never sees** another tenant's data — the grounding pack is built from tenant-scoped queries only ([../architecture/ai.md → Tenant Scoping](../architecture/ai.md#tenant-scoping--data-protection)).
- A `viewer` asking a question gets an answer scoped to what they can read; an `admin` gets the org-wide view.

## Interaction Modes (Sync vs Async)

- **Sync** (`POST /ai/query`) — for short, cheap Q&A expected to answer within a few seconds. Bounded by `AI_REQUEST_TIMEOUT_MS`.
- **Async** (`POST /ai/summarize`, `/ai/draft-report`, long Q&A) — enqueued on the `ai` queue; returns a job reference; client polls `GET /ai/jobs/:id` or is notified on completion.
- The boundary is conservative: when in doubt, enqueue. No request hangs waiting on a slow model.

## Safety, Cost & Rate Limits

Per [../architecture/ai.md → Cost, Latency & Safety Bounds](../architecture/ai.md#cost-latency--safety-bounds):

- **Token cap** (`AI_MAX_TOKENS`), **timeout** (`AI_REQUEST_TIMEOUT_MS`), per-tenant **cost quotas** with alerts.
- **Rate limiting** on AI endpoints (per-user + per-tenant), returning `429` with `Retry-After`.
- **Safety:** input/output length checks; provider safety settings applied; no sensitive payloads logged beyond configurable policy.
- **Cost accounting** per tenant feeds dashboards and quota enforcement.

## API Surface

See [../api/endpoints.md → AI Assistant](../api/endpoints.md#ai-assistant).

- `POST /ai/query` — grounded Q&A (sync or returns a job).
- `POST /ai/summarize`, `POST /ai/draft-report` — async generation.
- `GET /ai/jobs/:id` — poll an async job.
- `POST /ai/feedback` — thumbs-up/down + comment.

Responses follow the [standard envelope](../api/standards.md); answers include `citations` referencing tenant records.

## UI / UX

- **Assistant panel** — a slide-over/chat surface; type a question, get a grounded answer with clickable citations.
- **Citations** — each cited item links to its source (task/project/material) for verification.
- **Drafts** — when the assistant drafts a report or summary, it opens in an editor for review before saving.
- **Loading states** — short Q&A shows a thinking indicator; long jobs show "working…" with a link to the job.
- **Feedback** — thumbs-up/down on every answer, with an optional comment.
- **Disabled state** — if `AI_PROVIDER=none` or quota exceeded, the panel is hidden or shows a clear message; the rest of the app is unaffected.
- Accessible: the chat surface is keyboard-operable and screen-reader friendly per [../ui/accessibility.md](../ui/accessibility.md).

## Edge Cases & Rules

- **Empty grounding** → assistant responds "I couldn't find relevant data," not a fabrication.
- **Provider error/timeout** → user sees a clear failure with a correlation id and a retry; never a partial/hallucinated answer.
- **Ambiguous permission** → retrieval errs toward less data (the caller's guaranteed scope).
- **Feedback** is treated as product analytics for improvement, **not** as silent model training.
- **No PII to provider beyond what's needed** to answer, per [../security/data-protection.md](../security/data-protection.md); sensitive tenants can disable AI entirely.

## Non-Functional Requirements

- **Latency:** short Q&A answers within `AI_REQUEST_TIMEOUT_MS`; async jobs progressed on the queue.
- **Cost:** bounded per request and per tenant; no runaway spend.
- **Reliability:** failures degrade gracefully (clear message + retry), never silently wrong.
- **Privacy:** tenant-scoped retrieval; configurable data handling; AI off-capable.

## Open Questions

- **Conversational memory:** do we support multi-turn context in v1, or single-turn Q&A first? (Leaning single-turn for v1; multi-turn soon after.)
- **Proactive risk alerts:** the assistant surfacing risks unprompted — valuable but needs careful UX to avoid noise; candidate for a fast-follow.
- **Per-tenant model choice:** letting a tenant pick a provider/model for cost or residency — attractive; depends on demand.
- **Evaluation harness:** building an offline eval set for answer quality — essential before scaling capabilities; tracked as infrastructure.
