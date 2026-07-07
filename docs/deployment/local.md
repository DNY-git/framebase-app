# Local Deployment

> How to run the full ConstructTrack stack on a developer machine. The goal: one command yields a working API, web app, PostgreSQL, and Redis — identical in shape to production, so "works on my machine" actually means "works."

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
- **npm 10+** (or pnpm 9+ — the lockfile is committed)
- **Docker** + **Docker Compose** (for PostgreSQL, Redis)
- **Git**
- A code editor with TypeScript support (VS Code recommended)

macOS/Linux/WSL2 recommended for the smoothest Docker experience; native Windows works via Docker Desktop.

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url> construct-track && cd construct-track

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
#   review values — local dev defaults already work with docker-compose

# 4. Start infrastructure (Postgres + Redis)
docker compose up -d postgres redis

# 5. Apply schema + seed
npx prisma migrate dev
npx prisma db seed

# 6. Run the app (web + API in watch mode)
npm run dev
```

- Web app: http://localhost:5173 (`WEB_PORT`)
- API: http://localhost:4000 (`PORT`) — health check at `/api/v1/health`

Hot reload is enabled for both web (Vite HMR) and API (watch mode).

---

## Services

`docker compose` defines the local infrastructure services:

| Service | Image | Port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:16` | 5432 | Source of truth (matches the `DATABASE_URL` default) |
| `redis` | `redis:7` | 6379 | Cache + BullMQ queue |
| (optional) `mailhog`/`localstack` | — | — | Local SMTP/S3 for notifications & uploads |

Volumes persist data across restarts (`pgdata`, `redisdata`); use `docker compose down -v` to wipe (data loss — intended for fresh starts).

---

## Environment

- Copy `.env.example` → `.env` and adjust as needed; local defaults work out of the box.
- Use **distinct secrets** from production even locally (generate with `openssl rand -base64 64`). Never reuse prod secrets.
- `.env` is gitignored. The committed `.env.example` carries only placeholders.
- A `.env.test` variant points at disposable test databases for the suite ([ci-cd.md](./ci-cd.md)).

---

## Database Setup

- **`prisma migrate dev`** applies pending migrations and regenerates the client. Run it after pulling changes that touch the schema.
- **`prisma db seed`** populates a small representative dataset (a tenant, a couple of projects, tasks) for manual exploration.
- **Reset locally** (destroys data): `docker compose down -v && docker compose up -d postgres redis && npx prisma migrate dev && npx prisma db seed`.
- **Prisma Studio** (`npx prisma studio`) gives a quick UI for inspecting local data.

---

## Running Tests

Tests run against **disposable** Postgres/Redis instances spun up by the suite — never your dev database.

```bash
npm run test           # unit tests (Vitest)
npm run test:e2e       # end-to-end (Playwright)
npm run test:integration   # integration against disposable DB
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
| `npx prisma migrate dev` | Apply new migrations after a pull |
| `npx prisma studio` | Inspect local data |
| `docker compose up -d` | Start/refresh infra services |
| `docker compose logs -f api` | Tail API logs |

---

## Troubleshooting

- **Port already in use** — check `PORT`/`WEB_PORT` in `.env` and free or remap the port; ensure no stale Docker containers (`docker ps`).
- **`prisma migrate dev` fails to connect** — confirm `postgres` is healthy (`docker compose ps`) and `DATABASE_URL` host matches the compose service name when running migrations inside the network.
- **Schema/client drift** — run `npx prisma generate` after pulling; if migrations drift, CI's `prisma migrate diff` will catch it ([migrations.md](../database/migrations.md)).
- **Redis connection refused** — ensure `redis` is up and `REDIS_URL` points at the service.
- **Slow first install** — expected; subsequent installs are cached. Use the package manager you've pinned in the lockfile.
- **Weird shell errors in this environment** — note that the local sandboxed bash has had an empty PATH and missing coreutils; prefer the dedicated file/search tools, and verify `docker`/`npm`/`git` actually run before scripting around them ([../../.cline/instructions.md §8](../../.cline/instructions.md#8-tooling-constraints-in-this-environment)).

---

*Local dev should feel like a tiny version of production: same services, same env-driven config, same migrations. If it doesn't, that's a bug in the setup, not your machine.*
