# ConstructTrack — Construction Tracking Platform

> A production-grade platform for planning, tracking, and reporting on construction projects — from daily tasks and equipment fleets to inventory, reports, and an AI assistant that turns site data into decisions.

ConstructTrack unifies project management, field reporting, equipment and inventory control, and AI-assisted insight into a single, role-aware workspace. It is built for contractors, project managers, site engineers, and field crews who need one source of truth from the office to the job site.

---

## Table of Contents

- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Documentation Map](#documentation-map)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Construction projects generate enormous amounts of fragmented data: daily logs, equipment hours, material deliveries, labor counts, change orders, and safety observations. ConstructTrack captures this data where it is created — on site and in the office — and structures it so it can be queried, reported on, and acted upon.

The platform is **multi-tenant by design** (each organization's data is isolated), **role-aware** (every screen honors fine-grained permissions), and **AI-ready** (a first-class assistant surfaces risks, summarizes progress, and drafts reports from structured and unstructured inputs).

For the foundational vision, principles, and operating rules, read **[BIBLE.md](./BIBLE.md)** — the project's constitution.

---

## Key Capabilities

| Domain | What it does |
| --- | --- |
| **Dashboard** | Organization-wide KPIs: active projects, overdue tasks, equipment utilization, inventory health, open safety items. |
| **Projects** | Lifecycle management of construction projects: phases, milestones, budget, schedule, team assignments. |
| **Tasks** | Hierarchical work breakdown (project → phase → task → subtask) with assignment, status, priority, and dependencies. |
| **Equipment** | Fleet registry with assignment, utilization tracking, maintenance schedules, and downtime logging. |
| **Inventory** | Materials and consumables: stock levels, reorder points, allocations to projects, delivery receipts. |
| **Reports** | Structured report builder (daily logs, weekly summaries, safety, custom) with export and scheduled generation. |
| **Notifications** | In-app, email, and push notifications triggered by domain events and user subscriptions. |
| **AI Assistant** | Natural-language queries over project data, automated summaries, anomaly/risk detection, and report drafting. |

Detailed behavior for each capability lives under **[docs/features/](./docs/features/)**.

---

## Tech Stack

A condensed reference — full rationale is in **[TECH_STACK.md](./TECH_STACK.md)**.

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query v5, Zustand, React Router, React Hook Form + Zod
- **Backend:** Node.js 20 LTS, NestJS, TypeScript, Mongoose ODM, class-validator
- **Database:** MongoDB Atlas (managed)
- **AI:** OpenAI / Anthropic via a provider-agnostic service layer
- **Infrastructure:** GitHub Actions

---

## Repository Structure

The repository uses a monorepo layout. (Directories prefixed with `planned/` do not yet contain application code — see the approval note in [Status](#getting-started).)

```
.
├── apps/
│   ├── web/                 # Frontend SPA (React + Vite)
│   └── api/                 # Backend API (NestJS)
├── packages/
│   ├── ui/                  # Shared component library
│   ├── config/              # Shared ESLint, TS, Tailwind configs
│   └── types/               # Shared TypeScript types & DTOs
├── docs/                    # Project documentation (source of truth)
├── .cline/                  # AI assistant operating instructions
├── .github/                 # CI/CD workflows (planned)
├── README.md
├── BIBLE.md                 # Project constitution
├── PROJECT_RULES.md         # Mandatory engineering rules
├── AI_CONTEXT.md            # Condensed context for AI agents
├── TECH_STACK.md            # Technology decisions & rationale
├── ROADMAP.md               # Phased delivery roadmap
├── TASKS.md                 # Kanban task board
├── HANDOFF.md               # Continuity document
├── CHANGELOG.md             # Release history (Keep a Changelog)
├── CONTRIBUTING.md          # Contribution workflow
└── .env.example             # Environment variable template
```

---

## Documentation Map

This repository treats documentation as the primary source of truth. Start here, then drill down.

| Read first | Why |
| --- | --- |
| [BIBLE.md](./BIBLE.md) | Vision, principles, architecture, and AI operating rules |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | Mandatory engineering rules every change must satisfy |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | Fast-loading context for AI agents |

Deep-dive documentation:

- **Architecture:** [docs/architecture/](./docs/architecture/) — system, frontend, backend, database, AI
- **Database:** [docs/database/](./docs/database/) — schema, migrations, security
- **API:** [docs/api/](./docs/api/) — authentication, endpoints, standards
- **UI:** [docs/ui/](./docs/ui/) — design system, components, accessibility
- **Features:** [docs/features/](./docs/features/) — per-capability specifications
- **Deployment:** [docs/deployment/](./docs/deployment/) — local, production, CI/CD
- **Security:** [docs/security/](./docs/security/) — authentication, authorization, data protection
- **Testing:** [docs/testing/](./docs/testing/) — strategy, frontend, backend
- **Decisions:** [docs/decisions/](./docs/decisions/) — Architecture Decision Records (ADRs)

---

## Getting Started

> **Status:** This repository currently contains the **documentation foundation only**. Application code, dependencies, and runnable services will be added after the documentation is reviewed and approved. The instructions below describe the intended developer experience once implementation begins.

### Prerequisites

- Node.js 20 LTS
- npm 10+ (npm workspaces)
- MongoDB Atlas account (free tier) — **optional; the app starts with graceful degradation if not configured**

### Setup

```bash
# 1. Clone and install
git clone <repo-url> construct-track && cd construct-track
npm install

# 2. Configure environment
cp .env.example .env
#   fill in MONGODB_URI with your Atlas connection string (or leave placeholder for degraded mode)

# 3. (Optional) Seed dev data
npm run seed

# 4. Run the app
npm run dev
```

The frontend dev server and the API will start in watch mode with hot reload.

---

## Development Workflow

We use a trunk-based Git workflow with short-lived feature branches and pull requests. Full rules and the Definition of Done are in **[PROJECT_RULES.md](./PROJECT_RULES.md)** and **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

1. Create a branch: `feat/<short-slug>` or `fix/<short-slug>`.
2. Implement against the relevant spec under `docs/`.
3. Ensure tests pass and linting is clean.
4. Open a PR referencing the task in `TASKS.md` and updating `CHANGELOG.md`.
5. Squash-merge after review and CI is green.

---

## Environment Variables

All runtime configuration is environment-driven. See **[.env.example](./.env.example)** for the complete list with descriptions. **Never commit real secrets** — see [Security: Data Protection](./docs/security/data-protection.md).

---

## Testing

- **Unit tests:** Vitest (frontend & backend)
- **Integration tests:** Vitest + mongodb-memory-server
- **End-to-end tests:** Playwright
- Strategy details: [docs/testing/](./docs/testing/)

---

## Deployment

- **Local:** `npm run dev` for API + web dev servers; MongoDB Atlas for database — see [docs/deployment/local.md](./docs/deployment/local.md)
- **Production:** API + static SPA (Vite build) — see [docs/deployment/production.md](./docs/deployment/production.md)
- **CI/CD:** GitHub Actions for lint, test, build, and deploy — [docs/deployment/ci-cd.md](./docs/deployment/ci-cd.md)

---

## Contributing

Contributions are welcome once implementation begins. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** and **[PROJECT_RULES.md](./PROJECT_RULES.md)** before opening a pull request.

---

## License

This project is released under the **MIT License**. See [LICENSE](./LICENSE).
