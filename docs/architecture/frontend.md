# Frontend Architecture

> How the ConstructTrack SPA is structured: React 18 + TypeScript (strict), organized by feature, with a clean split between server state (TanStack Query) and client state (Zustand). Mobile-first and accessible by default.

Companion docs: [system.md](./system.md) (whole-system view), [BIBLE.md §10](../../BIBLE.md#10-ui-philosophy) (UI philosophy), [docs/ui/](../ui/) (design system, components, accessibility), [docs/api/standards.md](../api/standards.md) (response shapes).

---

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Feature-Based Organization](#feature-based-organization)
- [Routing](#routing)
- [State Management](#state-management)
- [Data Fetching Layer](#data-fetching-layer)
- [Form Handling](#form-handling)
- [Component Architecture](#component-architecture)
- [Design System Integration](#design-system-integration)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Accessibility](#accessibility)

---

## Overview

The frontend is a single-page application served as static assets by Nginx, talking to the NestJS API over a versioned REST contract. It is:

- **TypeScript strict** end-to-end, with DTOs/types shared from `packages/types` so the API's response shape is the frontend's source of truth.
- **Feature-based**, not layer-based — all code for "projects" lives together.
- **Mobile-first**: layouts are designed for a phone on a job site, then enhanced for tablet and desktop.
- **Accessible by default** (WCAG 2.1 AA) — see [docs/ui/accessibility.md](../ui/accessibility.md).

Build tooling is **Vite** (ESM-native dev server, sub-second HMR, Rollup production build). Lint/format via shared ESLint + Prettier configs in `packages/config`.

## Folder Structure

```
apps/web/src/
├── main.tsx                 # App bootstrap + providers
├── App.tsx                  # Router shell
├── routes/                  # Route definitions + guards (co-locates lazy loading)
├── features/                # One folder per domain
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── equipment/
│   ├── inventory/
│   ├── reports/
│   ├── dashboard/
│   ├── notifications/
│   └── ai-assistant/
├── shared/                  # Cross-feature reusable code
│   ├── components/          # App-level composite components (not design primitives)
│   ├── hooks/               # Generic hooks (useDebounce, useMediaQuery…)
│   ├── lib/                 # Clients (api, queryClient), utils
│   └── layouts/             # AppShell, PageLayout
├── stores/                  # Zustand stores (UI/client state only)
├── types/                   # App-local types (DTOs live in packages/types)
└── styles/                  # Tailwind entry, global CSS
```

## Feature-Based Organization

Each `features/<domain>/` folder is self-contained and mirrors the backend module:

```
features/projects/
├── pages/                   # Route-level screens (ProjectListPage, ProjectDetailPage)
├── components/              # Feature-scoped components (ProjectCard, PhaseTimeline)
├── hooks/                   # TanStack Query hooks (useProjects, useCreateProject)
├── api/                     # Fetcher functions + request/response typing
├── schema/                  # Zod schemas for forms (shared w/ backend where possible)
├── types/                   # Feature-local types
└── __tests__/               # Component + hook tests
```

**Rule:** a feature folder may import from `shared/` and `packages/*`, but **never from a sibling feature**. Cross-feature needs go through a shared abstraction or a route link, preventing the accidental coupling that turns a SPA into a ball of mud.

## Routing

**React Router** with nested routes per feature. Each route is lazy-loaded (`React.lazy`) so the initial bundle stays small.

- **Route guards** enforce authentication and authorization before a screen mounts — an unauthorized user is redirected, not shown a broken page.
- **Layouts** are route elements (`AppShell`) wrapping feature pages, keeping chrome consistent.
- **Deep links** work everywhere — every entity has a stable URL (`/projects/:id/tasks/:taskId`).

Route definitions live in `src/routes/`, mapping paths → lazy components + guards, so the route table is a single navigable map of the app.

## State Management

A deliberate split prevents the most common SPA bug — duplicated, drifting state:

| State type | Tool | Examples |
| --- | --- | --- |
| **Server state** (anything from the API) | **TanStack Query v5** | project lists, task detail, user profile |
| **Client/UI state** (ephemeral, browser-local) | **Zustand** | selected filter, drawer open, theme, draft form input |

**Rule:** server data lives **only** in TanStack Query caches. Mirroring API data into Zustand is forbidden — it causes stale UI and double-fetching. Zustand holds only UI state that has no server source.

**Optimistic updates** are used for confidence-inspiring mutations (status changes, toggles) and **always include a rollback** on error per [PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules).

## Data Fetching Layer

Each feature exposes TanStack Query hooks over fetcher functions:

```ts
// features/projects/hooks/useProjects.ts
export function useProjects(filters: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectsApi.list(filters),
  });
}
```

Conventions:

- **Query keys** are hierarchical arrays: `['projects', { status }]`, `['projects', id, 'tasks']`. This makes targeted invalidation precise (`queryClient.invalidateQueries({ queryKey: ['projects'] })`).
- **Mutations** declare `onSuccess` invalidation of related query keys.
- **Loading/error states** are consumed uniformly via the hook's `status`/`error`, rendered by shared components — no bespoke fetch handling per page.
- **Pagination, filtering, sorting** follow the conventions in [docs/api/standards.md](../api/standards.md) and are encoded once in a shared `usePaginatedResource` helper.

A single `QueryClient` is configured globally with sensible stale/cache defaults and a retry policy that respects the API error envelope (no retry on 4xx).

## Form Handling

**React Hook Form** for performance (uncontrolled inputs) paired with **Zod** for schemas. Where the field set is shared with the backend (create/update DTOs), the **same Zod schema** is shared via `packages/types`, so client and server validate identically.

UX: validation runs on blur + submit, errors render inline with accessible `aria-describedby` wiring, and submit buttons disable during pending mutations.

## Component Architecture

Within a feature, components follow an **atoms → molecules → organisms** instinct, but scoped to the feature. Truly generic primitives (Button, Input, Dialog, Table) come from **`packages/ui`**, built on **shadcn/ui** + Radix.

- **No inline styles for theming** — everything routes through Tailwind tokens ([PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules)).
- **One primary action per screen**; secondary actions are visually secondary ([BIBLE.md §10](../../BIBLE.md#10-ui-philosophy)).
- **Content density with breathing room** — field users scan; whitespace aids scanning.

Component design system details: [docs/ui/components.md](../ui/components.md).

## Design System Integration

Styling is **Tailwind CSS** with a token layer (colors, spacing, typography, radii, shadows) defined once and consumed by both Tailwind config and shadcn/ui theme. This guarantees visual consistency and makes theming (including dark mode) a token swap.

- **Responsive breakpoints:** mobile-first; `sm`/`md`/`lg` enhance upward.
- **Dark mode:** token-driven, user-preference + system fallback.
- **Density:** a compact density mode for power users on large screens.

Design tokens and usage: [docs/ui/design-system.md](../ui/design-system.md).

## Error Handling

Three layers:

1. **Error boundaries** at the route level catch render-time failures and show a recoverable fallback (not a blank page).
2. **API errors** are parsed from the standard envelope ([docs/api/standards.md](../api/standards.md)): field-level errors map onto form fields; general errors surface as toasts.
3. **Retry** happens only for transient failures (network, 5xx); 4xx is surfaced immediately.

Every error path includes a path back to a working state (retry, go back, contact support with the correlation id).

## Performance

- **Code splitting** via `React.lazy` per route; design primitives are tree-shakeable.
- **Query caching** avoids refetching on navigation; `keepPreviousData` smooths pagination transitions.
- **Virtualized lists** for long data (task lists, equipment registers) so the DOM stays bounded.
- **Image strategy:** responsive `srcset`, lazy loading, and uploads stored via the object-storage driver ([.env.example](../../.env.example)).
- **Target:** dashboard p95 load < 2s for a 100-project tenant ([ROADMAP.md](../../ROADMAP.md) Phase 6).

## Accessibility

Accessibility is a gate, not a polish step (WCAG 2.1 AA — [PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules)):

- Every interactive element is **keyboard reachable** with a visible focus ring.
- **Screen-reader semantics:** correct roles/labels, `aria-describedby` for errors, live regions for toasts and async updates.
- **Focus management:** dialogs trap focus, route changes move focus to the top, and destructive actions require explicit confirmation.
- **Color contrast** meets AA; color is never the sole carrier of information.

Full guide: [docs/ui/accessibility.md](../ui/accessibility.md).
