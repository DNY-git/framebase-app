# Security: Authorization

> ConstructTrack's policy for **what an authenticated user may do**: a role-based, tenant-scoped, ownership-aware model. Authentication proves *who*; authorization decides *what they may touch*. Every request is checked — at the edge and again in the service — and tenant isolation is verified by tests.

Companion docs: [authentication.md](./authentication.md), [data-protection.md](./data-protection.md), [../database/security.md](../database/security.md), [BIBLE.md §11](../../BIBLE.md#11-security-philosophy), [PROJECT_RULES.md §8](../../PROJECT_RULES.md#8-security-rules), feature specs for per-domain rules.

---

## Table of Contents

- [Principles](#principles)
- [Three Axes of Access](#three-axes-of-access)
- [Roles](#roles)
- [Role Permissions Matrix](#role-permissions-matrix)
- [Project-Level Roles](#project-level-roles)
- [Enforcement Layers](#enforcement-layers)
- [Tenant Isolation](#tenant-isolation)
- [Ownership & Assignment](#ownership--assignment)
- [Admin & Bootstrap](#admin--bootstrap)
- [Testing Authorization](#testing-authorization)

---

## Principles

1. **Least privilege.** A role gets the minimum access needed to do its job.
2. **Deny by default.** Anything not explicitly allowed is forbidden.
3. **Check on every request**, scoped to tenant, role, and the specific record.
4. **Fail closed.** Ambiguous ownership or missing context → deny.
5. **Tenant isolation is absolute** and verified by tests, not assumed.

---

## Three Axes of Access

Every authorization decision evaluates three independent axes:

1. **Tenant** — does the user's `tenantId` match the resource's `tenantId`? (Cross-tenant → 404, never 200.)
2. **Role** — does the user's (tenant-level, and optionally project-level) role permit the action?
3. **Ownership/membership** — is the user the resource's owner/assignee, or a member of its project?

All three must pass; failure of any denies access.

---

## Roles

Tenant-level roles (the `role` on `membership`):

| Role | Intent |
| --- | --- |
| `admin` | Full tenant control: users, settings, billing-relevant actions, all data. |
| `manager` | Create/manage projects and resources, manage project members, generate/schedule reports. |
| `engineer` | Day-to-day project work: edit tasks, assign equipment, record inventory. |
| `crew` | Field execution: update their own assigned tasks, log usage. Limited scope. |
| `viewer` | Read-only access for stakeholders/observers. |

Roles are assigned per-tenant (a user can be an `engineer` in tenant A and a `viewer` in tenant B).

---

## Role Permissions Matrix

General capabilities (per-domain detail lives in each [feature spec](../features/)):

| Capability | viewer | crew | engineer | manager | admin |
| --- | --- | --- | --- | --- | --- |
| View (within scope) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update own task status | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create/edit tasks | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign resources | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create/manage projects | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage project members | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage catalog/registry | ❌ | ❌ | ❌ | ✅ | ✅ |
| Schedule/manage reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Adjust inventory | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tenant admin (users/settings) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete/archived data | ❌ | ❌ | ❌ | archive | ✅ |

A `crew` member's write access is **further constrained by ownership** (their assigned tasks only) — see [Ownership & Assignment](#ownership--assignment).

---

## Project-Level Roles

For finer control, project membership can carry a project-scoped role that may narrow (never widen) the tenant-level role. A user who is a tenant `engineer` can be a `viewer` on a specific sensitive project. Project-level access cannot exceed the tenant role.

A user **not** a member of a project cannot see it — requests return `404` (not `403`) to avoid leaking existence.

---

## Enforcement Layers

Authorization is enforced in **multiple places**, defense-in-depth:

1. **Route guard (edge):** verifies authentication; attaches `user`, `tenantId`, role.
2. **Service layer (decision):** the authoritative check — role + tenant + record ownership — on every operation, especially mutations ([PROJECT_RULES.md §5](../../PROJECT_RULES.md#5-backend-rules)).
3. **Data layer (scoping):** BaseRepository injects `tenantId` into queries and fails closed; see [Tenant Isolation](#tenant-isolation) and [../database/security.md](../database/security.md).

The service-layer check is the load-bearing one — controllers are deliberately thin, and the DB layer is a backstop, not the primary gate.

---

## Tenant Isolation

- **Shared DB, shared schema, row-level isolation** via `tenantId` on every tenant-scoped table ([../database/security.md](../database/security.md)).
- `BaseRepository` **injects `tenantId`** from the request context into every query; a query lacking a tenant scope **fails closed**.
- **Existence is hidden:** a request for a resource in another tenant returns `404`, indistinguishable from "doesn't exist," so attackers can't enumerate.
- **Verified by tests:** every feature suite includes cross-tenant tests that must fail (see [Testing Authorization](#testing-authorization)).
- **Global tables** (rare, non-tenant lookups) omit `tenantId` and are documented as explicit exceptions.

---

## Ownership & Assignment

For resources with an owner/assignee (tasks, created records), the model grants scoped write access beyond the role baseline:

- A `crew` member can update **status** and **comment** on tasks **assigned to them**, even though their role doesn't grant general task editing.
- The check is `task.assigneeId === user.id` (within the same tenant and project).
- Ownership never widens access beyond the role's ceiling — it only adds narrowly-scoped permissions.

---

## Admin & Bootstrap

- The **first user** to register becomes the initial `admin` of a new tenant, enabling them to invite the rest of the team.
- Admins can **promote/demote** other users' roles within their tenant (audit-logged).
- **Tenant suspension** (`tenant.status = suspended`) blocks all access for that tenant's users while preserving data ([../database/security.md](../database/security.md)).
- Admin actions that are destructive (deleting a tenant, bulk data removal) are **double-confirmed** and heavily audit-logged.

---

## Testing Authorization

Authorization is **proven, not assumed**. Every feature must include:

- **Role tests:** for each mutating endpoint, assert each role is allowed or denied as the matrix specifies.
- **Cross-tenant test:** create a resource in tenant A; attempt to read/update/delete it as a user of tenant B → must fail with `404` (never return tenant A's data).
- **Ownership test:** for ownership-scoped capabilities, assert a non-owner/ non-assignee (same role) is denied.
- **Project-membership test:** a non-member's access to a project's resources returns `404`.

These run against the real DB in CI ([../testing/strategy.md](../testing/strategy.md)); mocking the ORM would hide the bugs we guard against.

---

*Authorization bugs in a multi-tenant system are the most damaging kind — they break the core promise that one tenant can't see another's data. Every rule here exists to make that promise verifiable, not aspirational.*
