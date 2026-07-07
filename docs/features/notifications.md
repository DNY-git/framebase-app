# Feature Spec: Notifications

> The Notifications domain reaches out to users when something needs their attention: an assignment, an overdue task, a low-stock alert, a completed report. It's event-driven, multi-channel (in-app, email, push), and respects per-user subscriptions so people get signal, not noise.

Companion docs: [../api/endpoints.md → Notifications](../api/endpoints.md#notifications), [../architecture/system.md → Events & Notifications](../architecture/system.md#background-jobs), [reports.md](./reports.md). Roadmap: Phase 5.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Notification Types](#notification-types)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Event-Driven Flow](#event-driven-flow)
- [Channels & Delivery](#channels--delivery)
- [Subscriptions & Preferences](#subscriptions--preferences)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

A **Notification** is a message to a user about a domain event they care about. Modules emit **domain events** (`task.assigned`, `inventory.below-reorder`, `report.completed`); the notifications module subscribes, resolves who should be notified and via which channel per their preferences, and delivers — without the producing module knowing anything about delivery mechanics.

Notifications are tenant- and user-scoped. They are a convenience layer, never a critical control path — the underlying state change still happens regardless of whether a notification is delivered.

## User Stories

- **As a crew member**, I get notified when a task is assigned to me or is due soon.
- **As a PM**, I'm alerted when a task I own becomes blocked or overdue.
- **As an inventory manager**, I receive a low-stock alert the moment a material crosses its reorder point.
- **As any user**, I choose which events reach me via email vs. in-app vs. push.
- **As a user**, I can mark notifications read and clear the noise.

## Notification Types

A non-exhaustive set, each tied to a domain event:

| Type | Trigger | Default audience |
| --- | --- | --- |
| `task.assigned` | a task is assigned/reassigned | the assignee |
| `task.due_soon` | a task is due within N hours | the assignee |
| `task.blocked` | a task moves to `blocked` | assignee + PM |
| `task.overdue` | a task passes due date incomplete | assignee + PM |
| `dependency.completed` | a task's predecessor completes | successor's assignee |
| `inventory.below_reorder` | stock crosses reorder point | inventory managers |
| `equipment.maintenance_due` | maintenance within N days | fleet manager |
| `report.completed` | a report run succeeds | requester |
| `report.failed` | a report run fails | requester |
| `project.status_changed` | a project is held/completed/archived | project members |

New types are added as domains grow; each declares its trigger and default audience.

## Data Model

See [../database/schema.md → Notifications Domain](../database/schema.md#notifications-domain).

- **`notification`** — `userId`, `tenantId`, `type`, `payload` (Json), `readAt`, `createdAt`.
- **`notification_subscription`** — per-user preferences: which event types, which channels (`in_app`, `email`, `push`).

In-app notifications are stored in the DB; email/push delivery state is tracked separately (sent/failed/retried).

## Permissions & Roles

- A user sees **only their own** notifications (`userId` match + `tenantId`).
- Subscriptions are per-user; each user manages their own.
- No role can see another user's notifications. Tenant admins can view aggregate delivery health (counts, not contents) for support — never another user's payloads.

## Event-Driven Flow

```
Domain module emits event  ──▶  EventBus (in-process)
                                    │
                                    ▼
                          Notifications module:
                          1. resolve audience for the event type
                          2. filter by each user's subscription
                          3. enqueue a delivery job per (user, channel)
                                    │
                                    ▼  (notifications queue)
                          Render + deliver; persist in-app row
```

- Producers are **decoupled** — they emit an event and move on; they never know who gets an email.
- Heavy fan-out (many recipients) always lands on the queue, never in the synchronous emitter.
- Delivery is **best-effort with retries**; a failed email is retried with backoff and the failure is logged (not silently dropped).

## Channels & Delivery

| Channel | Transport | Notes |
| --- | --- | --- |
| **In-app** | stored in DB; read via API; bell icon + unread count | always available |
| **Email** | SMTP ([.env.example](../../.env.example)) | templated, per-event |
| **Push** | web push (mobile app future) | opt-in per device |

- **Deduplication:** rapidly-repeated events of the same type to the same user are coalesced (e.g., one "task due soon" per task per day, not one per poll).
- **Templating:** each event type has a render template (subject + body) parameterized by the event payload; templates are plain, accessible, and never include secrets.
- **Quiet hours:** a user preference (future) to batch non-urgent notifications outside chosen hours.

## Subscriptions & Preferences

- Every event type has a **default** channel set (e.g., `task.assigned` → in-app + email by default).
- Users can opt channels **per type** (`PUT /notifications/subscriptions`).
- A global **mute** / digest mode is planned; for v1, per-type channel toggles suffice.
- Subscriptions are tenant-aware (a user in multiple tenants has separate preferences per tenant).

## API Surface

See [../api/endpoints.md → Notifications](../api/endpoints.md#notifications).

- `GET /notifications?unread=true` → list (paginated).
- `POST /notifications/read` → mark read (by id, or all).
- `GET /notifications/subscriptions` → view preferences.
- `PUT /notifications/subscriptions` → update preferences.

An optional WebSocket/SSE stream (future) pushes new in-app notifications in real time; for v1, the client polls or refetches on focus.

## UI / UX

- **Bell icon** with unread badge in the app header; dropdown lists recent notifications.
- **Notifications page** — full list, filters by type/unread, bulk mark-read.
- **Preferences page** — per-type channel toggles in a clear matrix.
- Each notification links to its source (the task, the material, the report) for one-tap drill-down.
- Mobile: push notifications (when enabled) mirror in-app items.

## Edge Cases & Rules

- **No notification spam:** deduplication + subscriptions prevent flooding a user.
- **Failed delivery** is retried and logged; a persistent failure surfaces in delivery health for support, never silently.
- **Tenant isolation:** a notification never crosses tenants; events carry the producing tenant's id.
- **Notification on deletion:** if the source entity is deleted, stale notifications link gracefully (no broken links — show "item removed").
- **Unsubscribes:** email includes a working unsubscribe link that updates `notification_subscription`.

## Non-Functional Requirements

- **Latency:** in-app notification created within seconds of the event; email within a minute.
- **Reliability:** delivery jobs durable + retried; final failures logged.
- **Scale:** fan-out to many recipients uses the queue, never the request thread.
- **Privacy:** payloads may contain project data — email rendering respects the user's right to see it (they're a member).

## Open Questions

- **Real-time delivery:** WebSocket/SSE push for v1, or polling? (Leaning polling for v1, SSE soon after.)
- **Digest mode:** daily/weekly email digests — valuable for noisy roles; candidate for a fast-follow.
- **Mobile push:** deferred until a native app exists; web push may bridge the gap earlier.
