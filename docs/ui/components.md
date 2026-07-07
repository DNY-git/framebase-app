# UI Components

> The ConstructTrack component inventory: which shared primitives exist, when to use them, and how feature components compose from them. Built on **shadcn/ui** + Radix (accessible primitives we own and can modify), styled with the [design-system](./design-system.md) tokens.

Companion docs: [design-system.md](./design-system.md), [accessibility.md](./accessibility.md), [../architecture/frontend.md → Component Architecture](../architecture/frontend.md#component-architecture), [BIBLE.md §10](../../BIBLE.md#10-ui-philosophy).

---

## Table of Contents

- [Component Tiers](#component-tiers)
- [Primitives (`packages/ui`)](#primitives-packagesui)
- [Patterns & Composites](#patterns--composites)
- [Data-Display Components](#data-display-components)
- [Forms & Inputs](#forms--inputs)
- [Feedback & Status](#feedback--status)
- [Layout Components](#layout-components)
- [Component Conventions](#component-conventions)
- [When to Add a New Component](#when-to-add-a-new-component)

---

## Component Tiers

Three layers, each with a clear boundary:

1. **Primitives** (`packages/ui`) — generic, domain-free UI atoms/molecules (Button, Input, Dialog, Table…). Built on shadcn/ui + Radix. Consumed by every feature.
2. **Shared composites** (`apps/web/src/shared/components`) — app-level but domain-free combinations (e.g., `EmptyState`, `PageHeader`, `ConfirmDialog`, `ResourceTable`).
3. **Feature components** (`apps/web/src/features/<domain>/components`) — domain-specific (e.g., `ProjectCard`, `TaskBoard`, `EquipmentStatusBadge`). Built from tiers 1–2.

**Rule:** a feature component may import primitives and shared composites, but **never imports from a sibling feature** ([../architecture/frontend.md → Feature-Based Organization](../architecture/frontend.md#feature-based-organization)).

---

## Primitives (`packages/ui`)

| Component | Use | Notes |
| --- | --- | --- |
| `Button` | All actions | Variants: `primary`/`secondary`/`outline`/`ghost`/`danger`; sizes; loading state; icon support |
| `IconButton` | Icon-only action | Requires `aria-label` |
| `Input`, `Textarea` | Text entry | Error + helper-text slots; `aria-describedby` wired |
| `Select` | Single/multi select | Combobox variant for async search |
| `Checkbox`, `RadioGroup`, `Switch` | Toggles/choices | Keyboard + screen-reader friendly |
| `DatePicker`, `DateRangePicker` | Dates | Calendar popup; keyboard nav; locale-aware |
| `Dialog`, `Sheet` | Modals / side panels | Focus trap, restore, `Escape` to close |
| `Popover`, `Tooltip` | Contextual info | Hover/focus trigger; dismissable |
| `Tabs`, `Accordion` | Disclosure | Animated per motion tokens |
| `Table` | Tabular data | Composes with `DataTable` for sorting/pagination |
| `Badge`, `Tag` | Status / labels | Semantic color + text (never color alone) |
| `Avatar` | User/org identity | Image with initials fallback |
| `Spinner`, `Skeleton` | Loading | Skeletons preferred over spinners for content areas |
| `Toast` | Transient feedback | Live region; auto-dismiss; action support |
| `Menu` | Context/dropdown menus | Keyboard navigable |

All primitives accept `className` for token-based composition and forward refs. They are fully typed and theme-token-driven — no hardcoded values.

---

## Patterns & Composites

Reusable app-level combinations in `shared/components`:

| Component | Purpose |
| --- | --- |
| `PageHeader` | Title, subtitle, breadcrumb, and primary action slot |
| `EmptyState` | Illustrated empty/no-result state with a call-to-action |
| `ConfirmDialog` | Destructive-action confirmation with explicit copy |
| `ResourceTable` | List table wired to TanStack Query: loading, error, empty, pagination, sorting |
| `FilterBar` | Reusable filter UI bound to URL query params |
| `DetailView` | Master-detail layout panel |
| `StatCard` | KPI tile (label, value, delta, sparkline) for dashboards |
| `FileDropzone` | Accessible drag-and-drop + keyboard upload |
| `CommandPalette` (future) | Quick navigation / search |

These exist so features compose rather than reimplement common shells.

---

## Data-Display Components

Construction data is dense; these keep it legible:

- **`DataTable`** — sortable, paginated tables with sticky headers, row selection, and responsive collapse (columns become stacked cards on mobile). Used for equipment registers, inventory ledgers, reports.
- **`DataGrid` / Board** — Kanban-style board for task status; Gantt-style timeline for project schedules (future).
- **`StatCard`** — dashboard KPI with delta and trend.
- **`Timeline`** — chronological activity / audit view.
- **`StatusBadge`** — semantic status with color + label + icon.
- **`KeyValueList`** — detail panels with labeled fields.
- **`EmptyState`** — replaces empty tables/lists with guidance.

Long lists use **virtualization** (bounded DOM) per [../architecture/frontend.md → Performance](../architecture/frontend.md#performance).

---

## Forms & Inputs

- Forms use **React Hook Form** + **Zod** ([../architecture/frontend.md → Form Handling](../architecture/frontend.md#form-handling)).
- Standard layout: `Field` wrapper (label, input, helper text, error) with consistent spacing and `aria-describedby` error wiring.
- **`Form`** composite manages submit state, disables the button during pending, and surfaces field-level errors from the API envelope ([../api/standards.md → Error Format](../api/standards.md#error-format)).
- **Destructive actions** always go through `ConfirmDialog` with explicit copy ("Delete project? This cannot be undone.").

---

## Feedback & Status

- **`Toast`** — success/error/info confirmations (mutations, copy-to-clipboard). Auto-dismiss with manual close; live region for screen readers.
- **`InlineError`** — field- and form-level errors.
- **`Skeleton`** — content-shaped loading placeholders (preferred over generic spinners).
- **`OptimisticIndicator`** — subtle "saving…/saved" affordance for optimistic updates, with rollback-to-error transition.
- **`StatusBadge`** — fixed semantic mapping for entity statuses (`active`, `on_hold`, `overdue`, …).

---

## Layout Components

- **`AppShell`** — top nav + sidebar + content; responsive (sidebar collapses to a drawer on mobile).
- **`PageLayout`** — consistent page padding and max-width.
- **`SplitPane`** — master/detail (e.g., task list + task detail).
- **`Stack` / `Cluster` / `Grid`** — layout primitives enforcing spacing tokens.
- **`ResponsiveContainer`** — mobile-first container with breakpoint-aware padding.

Layouts are mobile-first; the sidebar becomes a drawer, tables collapse to cards, and primary actions move to a thumb-reachable bottom bar on phones.

---

## Component Conventions

- **Props:** explicit, typed; spread `...props` only for passthrough; no `any`.
- **Statelessness by default** — components receive data and emit events; state lives in the feature/hook.
- **Forwarded refs** on primitives that wrap DOM nodes.
- **Accessibility built-in** — focus management, ARIA, keyboard handling are part of the component, not a consumer responsibility.
- **No inline styles for theming** — only Tailwind tokens / design-system primitives ([PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules)).
- **Docs/Storybook** — each primitive ships with usage examples and states (default/hover/focus/disabled/error/loading).

---

## When to Add a New Component

Before creating a component, check:

1. **Does a primitive or composite already do this?** Extend it rather than fork.
2. **Is it domain-specific?** If yes, it belongs in `features/<domain>/components`, not `packages/ui`.
3. **Is it used across features?** Then promote it to `shared/components` once the second use appears — not preemptively.
4. **Does it need an [ADR](../decisions/)?** Only if it introduces a new pattern or external dependency.

A new primitive is added to `packages/ui` only when at least two features need it and no existing primitive fits, with a Storybook entry and accessibility checks. This keeps the primitive set intentional rather than sprawling.
