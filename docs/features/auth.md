# Feature Spec: Authentication

> The Auth domain handles user identity, session management, and security primitives. Every other module depends on it — it is the first spine feature and must be bulletproof.

Companion docs: [../security/authentication.md](../security/authentication.md), [../security/authorization.md](../security/authorization.md), [../api/authentication.md](../api/authentication.md), [../database/schema.md → Identity & Access](../database/schema.md#identity--access), [../architecture/backend.md](../architecture/backend.md). Roadmap: Phase 2 ([ROADMAP.md](../../ROADMAP.md)).

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Lifecycle & States](#lifecycle--states)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

Authentication establishes user identity and issues tokens that every subsequent request uses. The first user to register in a new organization becomes the admin; subsequent users join via invitation or self-registration with role assignment. Sessions are tracked server-side via refresh tokens; access tokens are short-lived JWTs.

## User Stories

- **As a new user**, I register with my email and password so I can access the platform.
- **As a returning user**, I log in with email/password and receive a token pair.
- **As a logged-in user**, my session persists across browser restarts via refresh tokens.
- **As an admin**, I can manage user roles and disable accounts.
- **As a security-conscious user**, I know that refresh token theft is detected and all sessions are revoked.

## Data Model

See [../database/schema.md → Identity & Access](../database/schema.md#identity--access). Core entities:

- **`user`** — `id`, `email` (unique globally), `passwordHash` (bcrypt + pepper), `name`, `status` (`active`/`disabled`), `lastLoginAt`, timestamps.
- **`membership`** — join table linking `user` ↔ `tenant` with a `role` (admin, project_manager, engineer, crew, viewer). Unique constraint on `(userId, tenantId)`.
- **`session`** — tracks active refresh tokens with `userId`, hashed refresh token, `userAgent`, `ipAddress`, `expiresAt`, `revokedAt`.

## Permissions & Roles

| Role | Auth Actions |
| --- | --- |
| `admin` | Full access. Can disable users, manage roles. |
| `project_manager` | Can manage project membership. Cannot disable users. |
| `engineer` | Standard access. Cannot manage users. |
| `crew` | Limited access. Cannot manage projects or users. |
| `viewer` | Read-only. Cannot create or modify anything. |

See [../security/authorization.md](../security/authorization.md) for the full role matrix.

## Lifecycle & States

### User States
- **active** — can authenticate and access the platform.
- **disabled** — cannot authenticate; existing sessions are revoked on next refresh.

### Session Lifecycle
1. **Created** on register, login, or refresh.
2. **Active** — the refresh token is valid and the session has not expired.
3. **Revoked** — on logout, on refresh (rotation), or on theft detection (all sessions revoked).

### Token Rotation
- Access tokens expire in 15 minutes (configurable via `JWT_ACCESS_TTL`).
- Refresh tokens expire in 7 days (configurable via `JWT_REFRESH_TTL`).
- On each refresh, the old session is revoked and a new one is created (rotation).
- If a revoked refresh token is reused, **all sessions for that user are revoked** (theft signal).

## API Surface

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Register a new user + tenant |
| `POST` | `/api/v1/auth/login` | Public | Authenticate and receive token pair |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token, receive new pair |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke session |
| `GET` | `/api/v1/auth/me` | Authenticated | Return current user profile |

Rate limits: register/login = 10/60s, refresh = 20/60s (per `@RateLimit()` decorator).

## UI / UX

- **Register page** — email, password, name fields. Password strength indicator.
- **Login page** — email and password. Generic error on failure (no enumeration).
- **Forgot password** / **Reset password** — placeholder pages (future implementation).
- **App shell** — after login, the user sees the dashboard with their name and role in the header.

## Edge Cases & Rules

- **Duplicate email** — returns generic 401 (no enumeration of whether the email exists).
- **Weak password** — rejected at DTO level AND service level (defense-in-depth).
- **Disabled account** — login returns 401; refresh returns 401.
- **No membership** — user exists but has no tenant membership → 401.
- **Token theft** — reuse of a revoked refresh token revokes ALL sessions for that user.
- **Generic 401** — all credential failures return the same error shape to prevent enumeration.

## Non-Functional Requirements

- Passwords are hashed with bcrypt (12 rounds) + per-deployment pepper.
- Refresh tokens are stored as SHA-256 hashes, never plaintext.
- All auth mutations are audit-logged (actor, action, entity, IP, user-agent).
- Tokens use distinct signing secrets for access and refresh (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
- Global `JwtAuthGuard` protects all routes unless explicitly marked `@Public()`.

## Open Questions

- Should multi-tenant users choose their active tenant, or is the first membership always active?
- Password reset flow — email-based reset tokens vs. admin-initiated reset?
- OAuth/SSO support — planned for enterprise tenants?
