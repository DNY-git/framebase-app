# Security: Authentication

> ConstructTrack's security policy for **proving identity**: how users register, log in, and maintain sessions securely. This is the policy document; the API mechanics are in [../api/authentication.md](../api/authentication.md), and the role/permission model (what an authenticated user may do) is in [authorization.md](./authorization.md).

Companion docs: [authorization.md](./authorization.md), [data-protection.md](./data-protection.md), [../database/security.md](../database/security.md), [BIBLE.md §11](../../BIBLE.md#11-security-philosophy), [PROJECT_RULES.md §8](../../PROJECT_RULES.md#8-security-rules).

---

## Table of Contents

- [Principles](#principles)
- [Authentication Mechanism](#authentication-mechanism)
- [Password Storage](#password-storage)
- [Token Security](#token-security)
- [Session Management](#session-management)
- [Brute-Force & Enumeration Protection](#brute-force--enumeration-protection)
- [Password Reset](#password-reset)
- [Transport Security](#transport-security)
- [Audit & Monitoring](#audit--monitoring)
- [Future Hardening](#future-hardening)

---

## Principles

1. **Authentication is required by default.** Every route is protected unless explicitly and justifiably public.
2. **Fail closed.** When in doubt about identity, reject — never serve protected data.
3. **Defense in depth.** Identity is verified at the edge (guard), re-checked in the service, and constrained in the DB.
4. **No secrets in code or logs.** Credentials and tokens live in the environment and are never logged.
5. **Users can recover; attackers cannot.** Strong recovery flows for users, hard limits for attackers.

---

## Authentication Mechanism

ConstructTrack authenticates with a **JWT access/refresh token pair** (see [../api/authentication.md](../api/authentication.md) for the flow):

- **Access token** (short-lived, ~15 min) is sent as `Authorization: Bearer <token>` and verified on every request by a global guard, which attaches the authenticated `user` and `tenantId` to the request context.
- **Refresh token** (longer-lived, ~7 days) is used to obtain new access tokens; it is **rotated on each use** and stored server-side (Redis + DB mirror) so it can be revoked.

A request without a valid access token (and without a valid refresh path) is rejected with `401` before reaching any business logic.

---

## Password Storage

- Passwords are hashed with **bcrypt** (configurable cost, default 12 rounds) combined with a **per-deployment pepper** (`PASSWORD_PEPPER`) — the pepper is mixed in before hashing and stored only in the environment, so a DB leak alone is insufficient to crack passwords.
- **Plaintext passwords are never stored, logged, or cached** — not even transiently beyond the hashing call.
- **Password strength** is enforced at registration/reset: minimum length plus character-class requirements, with a denylist of common/breached passwords (extensible).

---

## Token Security

- **Separate signing secrets** for access and refresh tokens (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) — distinct and high-entropy.
- **Short access-token TTL** limits the damage window of a leaked access token; rotation happens silently via refresh.
- **Refresh-token rotation:** each refresh issues a new pair and revokes the old refresh token. **Reusing a revoked refresh token** is treated as a possible theft signal → the entire session is revoked and the user must re-authenticate.
- **Algorithm:** HS256 (symmetric) with secrets held only server-side. (Asymmetric/RS256 is a future option if key-rotation infrastructure warrants it.)
- Tokens carry the minimum identity payload (`sub`, `tenantId`, `role`, expiry) — no sensitive data.

---

## Session Management

- A user may hold **multiple concurrent sessions** (phone, tablet, desktop); each is independently revocable.
- Sessions are tracked in Redis (fast revocation lookup) and mirrored to the DB (`session` table) for durability, with metadata: IP, user-agent, created/last-active.
- **Logout** revokes the refresh token server-side; the access token naturally expires. **"Log out everywhere"** revokes all of a user's sessions.
- **Suspicious activity** (reused refresh token, login from a new geography — future) can trigger forced re-authentication.

---

## Brute-Force & Enumeration Protection

- **Rate limiting** on auth endpoints (per IP + per email) with sliding windows — see [../api/authentication.md → Rate Limiting](../api/authentication.md#rate-limiting). Exceeding limits returns `429` with `Retry-After`.
- **Generic auth responses:** login and password-reset endpoints return the same success-shaped response whether the identity exists or not, to prevent user enumeration.
- **Account lockout / progressive delay** on repeated failures (within the rate-limit framework) — balanced to avoid locking out legitimate users while stopping credential stuffing.
- **Constant-time comparisons** where timing could leak existence.

---

## Password Reset

- A reset is initiated by `POST /auth/forgot-password`, which emails a **single-use, time-limited** reset token (TTL ~1 hour) to the address on file.
- The token is stored in Redis (not the DB) and invalidated on first use.
- `POST /auth/reset-password` validates the token, updates the hash, and **revokes all existing sessions** for the user, forcing a fresh login on every device.
- Responses are generic to prevent enumeration; the reset email is only sent if the address exists.

---

## Transport Security

- **HTTPS only in production.** `COOKIE_SECURE=true` and HSTS enforce this; HTTP requests are redirected or rejected.
- **TLS to data stores:** API ↔ PostgreSQL and API ↔ Redis use TLS in production.
- **Refresh token transport:** sent in the request body or a secure, `HttpOnly`, `SameSite=Strict` cookie — not accessible to frontend JavaScript, mitigating XSS-based theft.
- **Access token storage:** held in frontend memory, **not `localStorage`** (XSS-exposed).

---

## Audit & Monitoring

- **Auth events are logged:** registration, login success/failure, refresh, logout, password reset, session revocation — with IP, user-agent, and correlation id (never the token itself).
- **Anomaly detection** (future): impossible travel, spike in failures, new-device logins → alerts or forced re-auth.
- **Audit trail** ties each auth event to subsequent mutations, so a compromised session's actions are reconstructable.

---

## Future Hardening

Candidates, each gated on demand and an [ADR](../decisions/):

- **Multi-factor authentication** (TOTP, WebAuthn) — especially for manager/admin roles.
- **Single Sign-On** (SAML / OIDC) for enterprise tenants.
- **Risk-based authentication** (step-up on sensitive actions).
- **Key rotation** infrastructure for JWT signing secrets.
- **Postgres Row-Level Security** as a second layer beyond application scoping ([../database/security.md](../database/security.md)).

These extend — never replace — the baseline above.
