# API Authentication

> How ConstructTrack authenticates callers: JWT access/refresh token pair, password hashing with pepper, secure cookie transport, and token lifecycle management. This document covers the **API authentication mechanism** — for role-based authorization, see [../security/authorization.md](../security/authorization.md).

Companion docs: [standards.md](./standards.md) (response envelopes), [endpoints.md](./endpoints.md) (route catalog), [../security/authentication.md](../security/authentication.md) (full security policy), [../architecture/backend.md](../architecture/backend.md).

---

## Table of Contents

- [Overview](#overview)
- [Auth Flow](#auth-flow)
- [Registration](#registration)
- [Login](#login)
- [Token Pair (Access + Refresh)](#token-pair-access--refresh)
- [Refresh](#refresh)
- [Logout](#logout)
- [Password Reset](#password-reset)
- [Session Tracking](#session-tracking)
- [Transport & Storage](#transport--storage)
- [Rate Limiting](#rate-limiting)

---

## Overview

ConstructTrack uses **stateless JWT access tokens** for API authentication, backed by **refresh tokens** stored server-side (Redis + DB mirror) to allow rotation and revocation. Passwords are hashed with bcrypt and a per-deployment pepper ([.env.example](../../.env.example) → `PASSWORD_PEPPER`).

The token pair is the sole authentication mechanism. API keys, SSO, and MFA are future candidates ([ROADMAP.md](../../ROADMAP.md) ideas list).

## Auth Flow

```
1. Register          POST /api/v1/auth/register    →  201 + tokens
2. Login             POST /api/v1/auth/login        →  200 + tokens
3. Authenticated     Bearer <access_token>          →  guarded routes
4. Access expired    401 → auto-refresh             →  POST /api/v1/auth/refresh → 200 + new pair
5. Refresh expired   401 → redirect to login
6. Logout            POST /api/v1/auth/logout       →  204 (refresh token revoked)
```

## Registration

**`POST /api/v1/auth/register`**

Request body:
```json
{
  "email": "user@example.com",
  "password": "S3cureP@ss!",
  "name": "Jane Doe"
}
```

Validations: email format + uniqueness, password strength (minimum 8 characters, mixed case + digit), name non-empty.

Response: `201 Created` with the token pair (same envelope as login).

Side effects: creates `user`, initial `membership` (default role, e.g., `admin` for the first user in a new tenant; `viewer` otherwise), and audit record.

## Login

**`POST /api/v1/auth/login`**

Request body:
```json
{
  "email": "user@example.com",
  "password": "S3cureP@ss!"
}
```

Response: `200 OK` with token pair.

On invalid credentials: `401 Unauthorized` with a generic message (no "user not found" vs "wrong password" distinction to prevent enumeration).

## Token Pair (Access + Refresh)

Both tokens are signed JWTs (HS256) with distinct secrets ([.env.example](../../.env.example) → `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

| Token | TTL | Contains | Purpose |
| --- | --- | --- | --- |
| **Access** | 15 min (`JWT_ACCESS_TTL`) | `sub` (userId), `tenantId`, `role`, `exp`, `iat` | Authenticate every API request |
| **Refresh** | 7 days (`JWT_REFRESH_TTL`) | `sub`, `tid` (token id), `exp`, `iat` | Obtain a new access token without re-login |

**Access tokens are small and short-lived** — they carry no sensitive data beyond identity. The refresh token is the session handle.

## Refresh

**`POST /api/v1/auth/refresh`**

Request body (or cookie):
```json
{
  "refreshToken": "<token>"
}
```

Behavior:
1. Verify refresh token signature and expiry.
2. Look up `tid` in Redis/DB; reject if revoked or missing.
3. Issue a **new access + refresh pair** and **revoke the old refresh token** (rotation). This limits the window of a stolen refresh token to one use.
4. `200 OK` with new tokens.

Rotation failure (reused a revoked token) indicates possible theft — revoke the entire session and force re-login.

## Logout

**`POST /api/v1/auth/logout`** (requires valid access token)

Revokes the caller's refresh token and clears the session in Redis. The short-lived access token naturally expires; logout is primarily about invalidating the refresh token so a stolen token pair can't persist.

Response: `204 No Content`.

## Password Reset

**`POST /api/v1/auth/forgot-password`**

Accepts an email; sends a time-limited, single-use reset token via email (backed by Redis, TTL 1 hour). Generic success response ("if the email exists, a reset link was sent") to prevent enumeration.

**`POST /api/v1/auth/reset-password`**

Accepts the reset token + new password; validates the token, updates the hash, revokes all sessions, forces re-login. Response: `200 OK`.

## Session Tracking

- Refresh tokens are stored in Redis (fast lookup for revocation) and mirrored to the DB (`session` table) for durability.
- A user may have multiple active sessions (phone, tablet, desktop); sessions are visible and revocable from the user settings screen.
- Session metadata (IP, user-agent, last active) is captured on login/refresh.

## Transport & Storage

- **Access token:** sent as `Authorization: Bearer <token>` header on every request. Stored in memory by the frontend (never `localStorage` — vulnerable to XSS).
- **Refresh token:** sent in the request body or a secure, `HttpOnly`, `SameSite=Strict` cookie. Not accessible to frontend JavaScript.
- All auth endpoints are HTTPS-only in production; `COOKIE_SECURE=true` enforces this.

## Rate Limiting

Auth endpoints are rate-limited aggressively (per IP + per email) to prevent brute-force and enumeration:

| Endpoint | Limit | Window |
| --- | --- | --- |
| `POST /auth/login` | 10 req | 1 min |
| `POST /auth/register` | 3 req | 1 min |
| `POST /auth/forgot-password` | 3 req | 15 min |
| `POST /auth/reset-password` | 5 req | 15 min |
| `POST /auth/refresh` | 30 req | 1 min |

Rate-limit counters live in Redis with sliding windows. Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.
