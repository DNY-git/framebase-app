# Feature Spec: Organizations, Team & Invitations

> Multi-tenant organization management: every user belongs to one or more organizations (companies), each organization has a role-bearing membership, and members are invited via secure token links. This is the organizational spine described in `prompt2.txt` — built on the existing MongoDB `Tenant` + `Membership` models (no new data layer).

Companion docs: [../api/endpoints.md](../api/endpoints.md#organizations--team), [../api/authentication.md](../api/authentication.md), [../security/authorization.md](../security/authorization.md), [../database/tenancy.md](../database/tenancy.md). Roadmap: T-207.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Concepts](#concepts)
- [Data Model](#data-model)
- [Roles](#roles)
- [API Surface](#api-surface)
- [Invitation Flow](#invitation-flow)
- [Security Invariants](#security-invariants)
- [Edge Cases & Rules](#edge-cases--rules)

---

## Overview

Framebase serves **multiple construction companies** from one application. A user is not tied to a company email address — the relationship is stored as:

```
User ──▶ Membership ──▶ Organization (Tenant)
```

A user may belong to several organizations with a different role in each. Exactly one organization is **active** at a time (carried in the JWT), and switching is server-verified. Projects live under organizations; a project may only contain members of that organization.

The organization concept **is** the existing `Tenant` model; `Membership` is the join entity. No duplicate models were introduced (prompt Phase 1–2 audit).

## User Stories

- **As a founder**, I register and become the `owner` of my own organization.
- **As an owner**, I can create additional organizations and switch between them.
- **As an owner/admin**, I can see my team, invite members by email, change roles, and remove members.
- **As an invitee with an account**, I can accept an invitation without creating a duplicate user.
- **As an invitee without an account**, I can create my account inline while accepting, landing directly in the inviting organization.
- **As a project manager**, I can assign only my organization's members to a project.
- **As a viewer**, I can use the app within my organization but cannot manage the team.

## Concepts

**Organization membership** — "what company does this user belong to, and what is their organization-level role?" (e.g., David → BuildRight → `SITE_ENGINEER`).

**Project membership** — "what projects is this user assigned to?" (e.g., David → Central Plaza → project member). These are separate concepts; see [projects.md](./projects.md) for project-level roles.

## Data Model

Existing models (no schema duplication):

- `Tenant` (organization) — name, slug, status. Collection `tenants`.
- `Membership` — `{ userId, tenantId, role }` with a **unique** `(userId, tenantId)` index, so one role per (user, organization) is structurally guaranteed. Collection `memberships`.
- `User` — global identity (email, name, password hash, avatar). Users are **not** company-scoped.

New model (added for invitations):

Collection `invitations` (see [../database/schema.md](../database/schema.md)):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | ObjectId (string) | Identifier |
| `tenantId` | string | The inviting organization |
| `email` | string | Normalized (lowercased, trimmed) invitee email |
| `role` | string | Invited organization role (`owner` is not invitable) |
| `token` | string | `crypto.randomBytes(32).toString('hex')` — unique, non-guessable |
| `status` | enum | `pending` / `accepted` / `revoked` |
| `expiresAt` | Date | 7 days after creation |
| `invitedBy` | string | User ID of the inviter |
| `acceptedAt?` / `acceptedBy?` | Date / string | Set on acceptance |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ tenantId, email }`, `{ status, expiresAt }`, unique `{ token }`.

## Roles

Organization-level roles (`Role` enum in `@constructtrack/types`): `owner`, `admin`, `project_manager`, `site_engineer`, `crew`, `procurement`, `fleet_manager`, `viewer`.

- The **founder** of an organization (registration or `POST /organizations`) becomes `owner`.
- `owner` and `admin` are tenant admins (bypass project-membership checks) and may manage the team.
- Only an `owner` can grant the `owner` role; the OWNER role is never granted via invitation.
- The last `owner`/`admin` of an organization cannot be demoted or removed.

See [../security/authorization.md](../security/authorization.md) for the full matrix.

## API Surface

Full catalog: [../api/endpoints.md](../api/endpoints.md#organizations--team). Summary:

| Endpoint | Access |
| --- | --- |
| `GET /organizations/me` | Any authenticated user — active org context + all memberships |
| `POST /organizations` | Any authenticated user — create org, become owner |
| `POST /organizations/switch` | Any authenticated user — switch (membership verified server-side) |
| `GET /organizations/members` | `owner` / `admin` |
| `GET /organizations/directory` | `owner` / `admin` / `project_manager` — read-only, for project assignment |
| `PATCH /organizations/members/:userId` | `owner` / `admin` (OWNER grant requires `owner`) |
| `DELETE /organizations/members/:userId` | `owner` / `admin` |
| `POST /organizations/invitations` | `owner` / `admin` |
| `GET /organizations/invitations` | `owner` / `admin` |
| `DELETE /organizations/invitations/:id` | `owner` / `admin` |
| `GET /invitations/:token` | Public (sanitized info only) |
| `POST /invitations/:token/accept` | Public (optional Bearer token) |

The server always derives the organization from the authenticated JWT + membership — a client-supplied `tenantId` is never trusted for authorization.

## Invitation Flow

**CASE A — invitee has no account:** the acceptance page shows the invitation summary; the invitee enters name + password, the account is created, the membership is created, and a token pair scoped to the inviting organization is returned.

**CASE B — invitee already has an account:** the invitee must be logged in as the invited email (a bare link never grants membership to a stranger's account). On accept, the membership is created without a duplicate `User`.

Acceptance marks the invitation `accepted`, invalidates other pending invitations for that (organization, email), and is idempotent — the unique membership index prevents duplicates.

**Delivery:** the `devAcceptUrl` returned by the create/list endpoints is a **development-only** acceptance link (clearly labeled in the UI). Production email delivery is deferred; see [HANDOFF.md → Outstanding Work](../../HANDOFF.md#outstanding-work).

## Security Invariants

Verified by `organizations.service.spec.ts` (39 tests) + `projects.service.spec.ts`:

1. Organization context resolves from authenticated identity + membership only.
2. A user cannot switch to an organization without a membership.
3. A user cannot access another organization's projects (repository-level `tenantId` scoping + `assertProjectAccess`).
4. A member cannot change their own role or remove themselves.
5. Only an `owner` can grant the `owner` role.
6. The last `owner`/`admin` cannot be demoted or removed.
7. Invitations always belong to the caller's organization (tenant-scoped lookups).
8. Expired, revoked, tampered, or already-accepted tokens are rejected.
9. Cross-organization project membership is structurally impossible (`addMember` verifies organization membership).
10. A viewer/site-engineer cannot list the team or directory.

## Edge Cases & Rules

- **Duplicate invitations:** a pending invitation for the same (org, email) → `409 INVITATION_DUPLICATE`; an already-member email → `409 INVITATION_ALREADY_MEMBER`.
- **OWNER via invitation:** rejected (`INVITATION_INVALID_ROLE`) — ownership is granted by an existing owner only.
- **Organization name collisions:** slug generation retries on collision, then fails with `409 ORG_NAME_TAKEN`.
- **Accepting while already a member:** idempotent — no duplicate membership; the invitation is still marked accepted.
- **Wrong-account acceptance:** an invitee logged in as a different email gets `401 INVITATION_LOGIN_REQUIRED` with a clear message.
- **Registration vs. invitation:** registration always creates a new organization (`<name> Organization`); joining an existing organization always goes through the invitation flow.
