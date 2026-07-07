# Testing: Frontend

> How we test the React frontend of ConstructTrack: component tests with Testing Library, hook tests for TanStack Query and Zustand, and form validation tests with React Hook Form + Zod.

Companion docs: [strategy.md](./strategy.md), [backend.md](./backend.md), [../architecture/frontend.md](../architecture/frontend.md), [../ui/accessibility.md](../ui/accessibility.md).

---

## Table of Contents

- [Overview](#overview)
- [What We Test](#what-we-test)
- [Component Tests](#component-tests)
- [Hook Tests (Data Fetching)](#hook-tests-data-fetching)
- [Form Tests](#form-tests)
- [Accessibility Checks](#accessibility-checks)
- [Patterns & Conventions](#patterns--conventions)
- [What We Don't Test](#what-we-dont-test)

---

## Overview

Frontend tests answer: *does this screen render correctly, respond to interaction, handle errors, and remain accessible?* We test behavior (what the user sees and does), not implementation details (React state updates, re-renders). Tools: **Vitest + Testing Library + jsdom** for component/hook/form tests; **Playwright** for E2E ([strategy.md](./strategy.md)).

---

## What We Test

| Concern | How | Where |
| --- | --- | --- |
| Rendering | Component outputs the right text, headings, and roles | Component test |
| Interaction | Click, type, select produces the expected UI change | Component test |
| Loading states | Spinner/skeleton shown during fetch; real content replaces it | Hook test |
| Error states | API errors show toast/inline message; retry works | Hook test |
| Form validation | Invalid fields show errors; valid form submits | Form test |
| Accessibility | Keyboard nav, ARIA, contrast, focus management | Component test + axe |
| Route guards | Unauthorized user redirected; authorized user passes | Component test |

---

## Component Tests

Testing Library philosophy: **query by what users see (roles, labels, text), not CSS selectors or test IDs.**

```tsx
// Good — queries by accessible role
screen.getByRole('heading', { name: 'Projects' });
screen.getByRole('button', { name: 'Create project' });
screen.getByLabelText('Project name');

// Avoid — fragile, couples to implementation
wrapper.find('.project-card').first();
```

**Structure per component test file:**

```tsx
describe('ProjectCard', () => {
  it('renders project name, status badge, and progress', () => { ... });
  it('calls onEdit when the edit button is clicked', () => { ... });
  it('renders a skeleton when loading is true', () => { ... });
  it('renders an error state when the fetch fails', () => { ... });
});
```

**Patterns:**

- **Render in isolation** — components that fetch data are wrapped with a `QueryClientProvider` and mocked handlers; never hit a real API.
- **User events** — use `fireEvent` or `userEvent` for typing, clicking, selecting; prefer `userEvent` for realistic interaction timing.
- **Assertions on roles** — `getByRole`, `getByLabelText`, `getByText` are the standard queries; avoid `getByTestId` except as a last resort.
- **Snapshot tests are rare** — we prefer explicit assertions over snapshots that rot silently.

---

## Hook Tests (Data Fetching)

Hooks wrapping TanStack Query are tested to verify:

- **Loading state** (`status === 'pending'`) is exposed correctly.
- **Success state** (`status === 'success'`) returns the expected data.
- **Error state** (`status === 'error'`) surfaces the error.
- **Mutations** call `onSuccess` invalidation and update the query cache.
- **Retry** behavior on failure.

Testing approach: render a test component that uses the hook, mock the fetcher (or `msw` for HTTP-level mocking), assert on the exposed state.

```tsx
it('returns projects filtered by status', async () => {
  // mock fetcher to return two projects
  const { result } = renderHook(() => useProjects({ status: 'active' }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(2);
});
```

---

## Form Tests

Forms use React Hook Form + Zod; tests verify:

- **Valid input** passes validation and fires the `onSubmit`.
- **Invalid input** shows inline errors (mapped from Zod errors to `aria-describedby`).
- **Async validation** (e.g., unique slug) shows pending/error states.
- **Dirty/pristine tracking** for unsaved-change warnings.

Zod schemas are shared with the backend; testing the schema independently (pure function test) validates the rules; the form test validates the wiring to UI.

---

## Accessibility Checks

Accessibility is a gate, not a polish step ([../ui/accessibility.md](../ui/accessibility.md)):

- **`@testing-library/jest-dom`** matchers for ARIA assertions: `toBeAccessible`, `toHaveAttribute('aria-invalid', 'true')`.
- **`axe-core`** runs in component tests; a zero-violation assertion per render:

  ```tsx
  expect(await axe(container)).toHaveNoViolations();
  ```

- **Keyboard navigation** — the test tab-interacts through a component and asserts focus order and visible focus rings.
- **Focus management** — modals trap focus; route changes move focus; destructive actions require explicit confirmation.

---

## Patterns & Conventions

- **One `describe` per component** in `__tests__/` adjacent to the component file.
- **`renderHook`** from `@testing-library/react` for hooks; **`render`** for components.
- **`msw`** (Mock Service Worker) for HTTP-level API mocking when the component talks to the network.
- **Custom render wrappers** wrap `QueryClientProvider`, `MemoryRouter`, and theme; imported once per feature.
- **No `waitFor` overuse** — if you're waiting for something that shouldn't be async, the test is telling you the design is wrong.

---

## What We Don't Test

- **Third-party components** (shadcn/ui primitives) — we trust them and test our usage, not their internals.
- **CSS values** — visual regression is handled by Playwright screenshots or design tools, not unit tests.
- **React internals** (re-renders, memoization) — test behavior, not performance optimizations.
- **TanStack Query internals** — test that the hook returns the right state, not the cache mechanics.
