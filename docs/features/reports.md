# Feature Spec: Reports

> The Reports domain turns the data captured across ConstructTrack into decision-grade output: structured, schedulable, exportable documents — daily logs, weekly summaries, safety reports, and custom templates. Reports are generated asynchronously and never block the request thread.

Companion docs: [dashboard.md](./dashboard.md), [../api/endpoints.md → Reports](../api/endpoints.md#reports), [../architecture/system.md → Background Jobs](../architecture/system.md#background-jobs). Roadmap: Phase 4.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Report Types](#report-types)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Generation Lifecycle](#generation-lifecycle)
- [Scheduling](#scheduling)
- [Export & Delivery](#export--delivery)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

A **Report** is a structured document generated from tenant data over a parameterset (date range, project, scope). Reports are defined by reusable **templates** and materialized as **runs**. Because generation can be slow (aggregation + rendering), it runs on the `reports` queue; the client polls or is notified.

Reports are tenant-scoped; a run's data never crosses tenants.

## User Stories

- **As a PM**, I generate a weekly summary for a project to share with stakeholders.
- **As a site engineer**, I fill and submit a daily log from the field.
- **As a PM**, I schedule a report to generate and email every Monday morning automatically.
- **As an executive**, I export a portfolio report to PDF for a board meeting.
- **As a safety officer**, I produce a safety report from logged observations.

## Report Types

Built-in templates (extensible):

| Type | Content | Typical cadence |
| --- | --- | --- |
| **Daily log** | tasks done/started/blocked, equipment on site, weather note, safety observations | daily |
| **Weekly summary** | progress vs. plan, overdues, utilization, inventory consumed, risks | weekly |
| **Safety report** | observations, incidents, open items, resolutions | as needed |
| **Custom** | user-defined parameters over the standard data set | as needed |

Each type maps to a template that defines parameters, layout, and data sources.

## Data Model

See [../database/schema.md → Reports Domain](../database/schema.md#reports-domain).

- **`report_template`** — `type`, `name`, `parameters` (Json), `ownerId`, `schedule` (cron), `tenantId`.
- **`report_run`** — `templateId`, `parameters`, `status`, `generatedAt`, `format` (`pdf`/`csv`), storage reference, `idempotencyKey`.

Runs are immutable once `succeeded`; a re-generation creates a new run.

## Permissions & Roles

| Role | View runs | Generate | Manage templates | Schedule |
| --- | --- | --- | --- | --- |
| `viewer` | ✅ (shared) | ❌ | ❌ | ❌ |
| `engineer` | own + shared | ✅ | ❌ | ❌ |
| `manager`+ | all | ✅ | ✅ | ✅ |

A user can view reports shared within their tenant scope (project or org). Generation requires at least engineer; templates/scheduling are manager+. All access is tenant-scoped and audit-logged.

## Generation Lifecycle

```
POST /reports ──▶ 202 (run created, status=pending)
                     │
                     ▼  (reports queue)
                  worker: aggregate data → render → store
                     │
                     ▼
            status: running ──▶ succeeded (artifact stored)
                            └──▶ failed (error stored, retryable)
```

- **Async by default.** The API returns a run reference immediately; the client polls `GET /reports/:id` or receives a push notification on completion.
- **Idempotency.** Generation accepts an `Idempotency-Key`; retrying with the same key returns the existing run rather than creating a duplicate.
- **Deterministic where possible:** same parameters → same report content (timestamps excepted), enabling safe retries and diffing.
- **Worker isolation:** report workers scale independently of the API ([system.md](../architecture/system.md)).

## Scheduling

- A template may carry a `schedule` (cron expression); a scheduled job enqueues a run at each tick.
- Scheduled runs use a deterministic idempotency key (template + scheduled time) so a retried tick doesn't duplicate.
- Schedule changes are audit-logged; failed scheduled runs alert the owner via [notifications.md](./notifications.md).

## Export & Delivery

- **Formats:** PDF (primary, for sharing) and CSV (for data export/spreadsheet use).
- **Storage:** generated artifacts stored via the object-storage driver ([.env.example](../../.env.example) → `UPLOAD_DRIVER`); the API issues a download link scoped to the authorized user.
- **Delivery:** scheduled reports can be emailed to a recipient list; in-app notification on completion for on-demand runs.
- **Retention:** artifacts are retained per policy (configurable), then pruned; the run metadata is retained for audit.

## API Surface

See [../api/endpoints.md → Reports](../api/endpoints.md#reports).

- `GET/POST /report-templates` → manage templates.
- `POST /reports` (with `Idempotency-Key`) → enqueue a run → `202`.
- `GET /reports/:id` → poll status / get download link.
- `GET /reports/:id/download` → fetch the artifact (PDF/CSV).

## UI / UX

- **Reports list** — `ResourceTable` of runs (template, period, status, generated-at); filter by type/status.
- **Generate dialog** — pick template → set parameters (project, date range, format) → submit; show a pending state with a link to the run.
- **Run detail** — status, parameters, download button, and (for failed) the error with a retry action.
- **Template manager** — create/edit templates and schedules (manager+).
- **Scheduled view** — upcoming scheduled generations with their recipients.
- Mobile: generation is fully operable on a phone; downloads open in the browser/viewer.

## Edge Cases & Rules

- **Empty data** — a report over a period with no activity still generates, with a clear "no activity" body (not an error).
- **Large date ranges** — aggregation streams/paginates internally; very large ranges may be capped or warned.
- **Concurrent identical runs** — idempotency key collapses them to one.
- **Template deletion** — does not delete past runs; it stops future scheduled generations.
- **Tenancy:** report data is scoped to `tenantId`; cross-tenant data never enters a report and is tested.

## Non-Functional Requirements

- **Performance:** typical report generates in seconds; large reports must not block other work (queue isolation).
- **Reliability:** failed runs are retryable with backoff; final failure is surfaced and audit-logged.
- **Determinism:** same inputs → same content (modulo timestamps) for safe retries.
- **Storage:** artifacts stored durably; download links scoped and time-limited.

## Open Questions

- **Custom report builder:** a visual drag-and-drop builder is attractive but heavy; defer beyond v1 (start with parameterized built-in templates).
- **Branding/white-label** on PDFs — defer until needed.
- **Comparison reports** (this week vs. last) — candidate for a near-term enhancement.
