# Design System

> ConstructTrack's visual and interaction language: tokens for color, typography, spacing, and motion; the foundations every component builds on. The system is token-driven (Tailwind) so theme variations — including dark mode and a compact density — are swaps, not rewrites.

Companion docs: [components.md](./components.md), [accessibility.md](./accessibility.md), [../architecture/frontend.md](../architecture/frontend.md), [BIBLE.md §10](../../BIBLE.md#10-ui-philosophy).

---

## Table of Contents

- [Principles](#principles)
- [Token Architecture](#token-architecture)
- [Color](#color)
- [Typography](#typography)
- [Spacing, Layout & Radii](#spacing-layout--radii)
- [Elevation & Shadows](#elevation--shadows)
- [Motion](#motion)
- [Iconography](#iconography)
- [Density Modes](#density-modes)
- [Theming & Dark Mode](#theming--dark-mode)
- [Field-First Considerations](#field-first-considerations)

---

## Principles

1. **Tokens, not hardcoded values.** Every color, size, and spacing comes from a token. Hardcoded hex/pixels are linted out.
2. **Content density with breathing room.** Construction users scan; whitespace aids scanning without wasting a screen.
3. **One primary action per screen.** Secondary actions are visibly secondary.
4. **Predictability over novelty.** The same concept always uses the same component and the same color semantics.
5. **Accessible by default.** Contrast, focus, and target sizes meet WCAG 2.1 AA without opt-in ([accessibility.md](./accessibility.md)).

## Token Architecture

Tokens live in `packages/config` (shared Tailwind + theme config) and are consumed by both Tailwind utilities and the shadcn/ui theme. Three tiers:

- **Global primitives** — raw values (`color-blue-500: #3b82f6`, `space-4: 1rem`).
- **Semantic tokens** — meaning-based aliases (`color-accent`, `color-surface`, `color-danger`, `space-md`) that map to primitives. **Components consume only semantic tokens.**
- **Component tokens** (rare) — component-specific overrides when a primitive needs explicit tuning.

This indirection is why dark mode and density modes are swaps: they remap semantic tokens, and every component follows.

## Color

Semantic palette (mapped to primitives, with light/dark variants):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | neutral-50 | neutral-950 | App background |
| `surface` | white | neutral-900 | Cards, panels |
| `surface-muted` | neutral-100 | neutral-800 | Subtle panels, table stripes |
| `border` | neutral-200 | neutral-800 | Dividers, outlines |
| `foreground` | neutral-900 | neutral-50 | Primary text |
| `foreground-muted` | neutral-500 | neutral-400 | Secondary text, hints |
| `primary` | blue-600 | blue-500 | Primary action, focus |
| `success` | green-600 | green-500 | Positive state |
| `warning` | amber-500 | amber-400 | Caution |
| `danger` | red-600 | red-500 | Destructive, error |
| `info` | sky-500 | sky-400 | Information |

Rules:
- **Color is never the sole carrier of information** — pair with an icon or label (e.g., status badges have both color and text).
- **Contrast:** text-on-background combinations meet AA (4.5:1 normal, 3:1 large).
- **Status semantics are fixed:** `success`/`warning`/`danger` mean the same thing everywhere.

## Typography

- **Font family:** a clean system sans-serif stack for UI; a monospace stack for codes/IDs.
- **Scale (rem-based):**
  - `xs` 0.75rem — captions, metadata
  - `sm` 0.875rem — secondary text, table cells
  - `base` 1rem — body
  - `lg` 1.125rem — section headings
  - `xl`–`2xl` — page/section titles
- **Line height:** 1.5 for body, 1.25 for headings.
- **Weight:** regular (400) body, medium (500) emphasis, semibold (600) headings/labels.
- **Numbers in tables** use tabular-nums to prevent column jitter.

## Spacing, Layout & Radii

- **Spacing scale:** a 4px base (`space-1` = 4px … `space-2` = 8px … `space-4` = 16px … up to `space-16`). Components use scale steps, never arbitrary values.
- **Radii:** `sm` 4px (inputs), `md` 8px (cards), `lg` 12px (modals), `pill` (badges/chips).
- **Breakpoints (mobile-first):** `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Layouts are designed at `base` (mobile) and enhanced upward.
- **Containers:** max content width with responsive padding; a fluid grid for dashboards.
- **Touch targets:** minimum 44×44px on mobile ([accessibility.md](./accessibility.md)).

## Elevation & Shadows

- `shadow-sm` — inputs, subtle separation
- `shadow-md` — cards, dropdowns
- `shadow-lg` — modals, popovers
- A `ring` utility for focus states (consistent across components).

Shadows are restrained; the design leans on borders and surface contrast more than heavy drop shadows.

## Motion

- **Purposeful, not decorative.** Motion communicates state change (expanding a panel, confirming a save).
- **Durations:** `fast` 120ms (hover, focus), `base` 200ms (transitions), `slow` 320ms (large layout).
- **Easing:** standard ease-out for entrances, ease-in for exits.
- **`prefers-reduced-motion` is honored** — non-essential animation is disabled for users who request it ([accessibility.md](./accessibility.md)).

## Iconography

- A single consistent icon set (e.g., Lucide), 1.5px stroke, sized to the text baseline.
- Icons are **paired with text labels** in controls (not icon-only) unless the icon is universally understood and labeled by `aria-label`.
- Status icons use the semantic status color plus a distinct shape (avoiding color-only coding).

## Density Modes

- **Default density** — comfortable spacing for mixed use, optimized for tablets.
- **Compact density** — tighter spacing for power users on large desktop monitors (more rows visible in tables/grids). A user preference; falls back to default.
- Density is implemented by remapping spacing tokens, so components automatically adapt.

## Theming & Dark Mode

- **Light is default; dark is a first-class alternative**, selected by user preference with a system-preference fallback.
- Dark mode maps semantic tokens to dark-variant primitives — no per-component overrides.
- **Brand accent** is configurable per tenant (within accessibility-checked bounds) for white-label deployments (future).

## Field-First Considerations

Construction happens outdoors, on phones, often in poor conditions:

- **High contrast** at default density (sunlight readability).
- **Large touch targets** and forgiving hit areas (gloves, imprecise taps).
- **Offline-tolerant UX** patterns (optimistic updates, clear "saved locally" indicators) where the future offline mode will build.
- **Minimal required typing** — pickers, chips, and voice-friendly inputs over free text where possible.

These constraints shaped the token choices above; they are not afterthoughts.
