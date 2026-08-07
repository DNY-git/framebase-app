# Local Deployment

> How to run the full ConstructTrack stack on a developer machine. The goal: one command yields a working API and web app, identical in shape to production, so "works on my machine" actually means "works."

Companion docs: [production.md](./production.md), [ci-cd.md](./ci-cd.md), [.env.example](../../.env.example), [../architecture/system.md](../architecture/system.md). Application code lands starting Phase 1 ([ROADMAP.md](../../ROADMAP.md)); this document describes the intended experience.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [Environment](#environment)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Daily Commands](#daily-commands)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20 LTS** (use `nvm`/`fnm` to pin)
- **npm 10+** (npm workspaces)
- **MongoDB Atlas** account (free tier) — or a local MongoDB instance
- **Git**
- A code editor with TypeScript support (VS Code recommended)

No Docker required for development. The app starts with graceful degradation if MongoDB is not configured.

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url> construct-track && cd construct-track

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
#   review values — set MONGODB_URI for your Atlas cluster (or leave placeholder for degraded mode)

# 4. (Optional) Seed dev data
npm run seed

# 5. Run the app (web + API in watch mode)
npm run dev
```

- Web app: http://localhost:5173 (`WEB_PORT`)
- API: http://localhost:4000 (`PORT`) — health check at `/api/v1/health`

Hot reload is enabled for both web (Vite HMR) and API (watch mode).

---

## Services

No Docker required. The app connects to MongoDB Atlas (or a local MongoDB instance) and starts with graceful degradation if the database is unavailable.

| Service | Purpose |
| --- | --- |
| **MongoDB Atlas** | Source of truth (free tier available at mongodb.com/atlas) |
| **Redis** | Cache + queue (deferred to a future phase) |

---

## Environment

- Copy `.env.example` → `.env` and adjust as needed; local defaults work out of the box.
- Use **distinct secrets** from production even locally (generate with `openssl rand -base64 64`). Never reuse prod secrets.
- `.env` is gitignored. The committed `.env.example` carries only placeholders.
- A `.env.test` variant points at disposable test databases for the suite ([ci-cd.md](./ci-cd.md)).

---

## Database Setup

- **MongoDB Atlas** is the recommended database. Get a free cluster at mongodb.com/atlas.
- **Local MongoDB** — install MongoDB Community Edition and set `MONGODB_URI=mongodb://localhost:27017/constructtrack` in `.env`.
- **Graceful degradation** — the app starts and responds to health checks even without a configured database, but DB-dependent features will not function.
- **Seed data** — `npm run seed` populates a small representative dataset (a tenant, a couple of projects, tasks) for manual exploration.
- **Reset locally** — drop the database and re-seed: `npm run seed` (or manually drop via MongoDB Compass).

---

## Running Tests

```bash
npm run test           # unit tests (Vitest)
npm run test:e2e       # end-to-end (Playwright)
```

See [../testing/strategy.md](../testing/strategy.md) for the full approach.

---

## Daily Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start web + API in watch mode |
| `npm run lint` | ESLint across the monorepo |
| `npm run typecheck` | TypeScript strict type-check |
| `npm run test` | Unit tests (watch or run) |
| `npm run seed` | Seed dev data |
| `npm run test:e2e` | E2E tests (Playwright) |

---

## Troubleshooting

- **Port already in use** — check `PORT`/`WEB_PORT` in `.env` and free or remap the port.
- **MongoDB connection refused** — confirm `MONGODB_URI` is set correctly in `.env` and your Atlas IP is whitelisted.
- **Schema/client drift** — run `npm run typecheck` to catch type errors from schema changes.
- **Slow first install** — expected; subsequent installs are cached. Use the package manager you've pinned in the lockfile.

---

*Local dev should feel like a tiny version of production: same services, same env-driven config, same migrations. If it doesn't, that's a bug in the setup, not your machine.*
