# Feature: Marketing Landing Page

> Public marketing site for FrameBase. Source of truth for its structure, conventions, and constraints.
> Route: `/` (`apps/web/src/pages/LandingPage.tsx`). Sections live in `apps/web/src/features/landing/`.

---

## Purpose

Convert visitors into sign-ups by showing the product (dashboard preview, real feature blocks, workflows) and answering the objections a construction team would have. The page must load fast on weak hardware — **no per-frame shader or canvas-driven hero effects**.

## Constraints (binding)

1. **Performance-first visuals.** The previous dither hero was removed (2026-09-08, commit `e9d6dac`) because it stuttered on real devices. New effects must be cheap: SVG, CSS, or scroll-triggered reveals. Canvas is allowed only in small, self-contained components and never as a full-viewport background. The footer wordmark is a pure-SVG dash pattern, not a canvas renderer.
2. **Reduced motion is mandatory.** Every scroll-triggered animation goes through the `Reveal` primitive, which renders content immediately when `prefers-reduced-motion: reduce` is set.
3. **Match the surrounding design tokens** — `bg-cream`/`bg-white`, `border-stone-*`, `text-stone-*`, `rounded-xl`, `shadow-card-subtle`; terracotta `#E25C38` for the accent/negative tone, `cad-blue` for system/blue, emerald for positive states.
4. **No mock data masquerading as real.** Where a live endpoint exists (e.g. equipment utilization) compose real data; where it does not (documents) render honest empty-state chrome with a "Demo" label.
5. **Typography (2026-09-18 redesign):** Instrument Serif for display headlines (`.font-display`), Poppins for body/labels (`.landing-page`). Both are scoped to the landing page so the app keeps its monospace base font. Instrument Serif is self-hosted (latin 400, woff2+woff) in `apps/web/src/assets/fonts/instrument-serif/` (OFL-1.1).
6. **Always light-themed.** The page intentionally ignores the app theme and renders the stone/terracotta palette (`LandingPage.tsx`).

## Structure (7 sections — 2026-09-23 editorial rebuild)

`LandingPage.tsx` renders, in order:

| # | Component | Anchor id | Background | Purpose |
|---|-----------|-----------|------------|---------|
| — | `LandingNavbar` | — | white | Sticky nav: Product / Features / How it works / Solution, Log in, Sign up |
| 01 | `HeroSection` | — | cream | Instrument-serif headline, CTA pair, browser-framed dashboard preview (`BrowserFrame` chrome + KPI tiles, budget/spend chart, site progress, activity feed) |
| 02 | `ProblemSection` | `product` | cream | "Everything your construction team needs, connected." + architectural-standard note, then "Construction shouldn't feel this scattered." with the scattered-tools diagram and consequence list |
| 03 | `StagesSection` | `stages` | white | Four lifecycle stage cards (planning, procurement, execution, handover), each with a real mini-preview |
| 04 | `RolesSection` | `roles` | cream | Single-truth engine panel + six role cards (executive/management/jobsite/finance/logistics/partner) |
| 05 | `InventorySection` | `inventory` | cream | Stock registry (material tiles with badges + buffer bars) and plant & equipment fleet table |
| 06 | `FAQSection` | `faq` | white | Five-item accordion |
| 07 | `FinalCTA` | `demo` | stone-900 | Dark closing band, white primary + outline secondary CTA |
| — | `LandingFooter` | — | white | Brand block, operational status line, Product/Solutions/Company columns, SVG particle wordmark, legal row |

## Matching the approved design (verification, 2026-09-28)

The approved target is the 1280 px-wide 7-section export (white page, transparent hero, one dark closing
band). The spacing and type sizes below are **measured, not guessed**: the export was rasterised into
1280 px bands and compared with the rendered page ink-box by ink-box (scratch harness in `.zcode/`, never
committed — `landing-measure.mjs` dumps the DOM geometry, `inkbox.ps1` / `rowsprofile.ps1` / `rowscan.ps1`
measure the target bands). Reference anchors at 1280 px:

| Anchor | Target value |
| --- | --- |
| Navbar / content container | 80 px tall, container x 24..1256 |
| Hero height below the navbar | 1470 px |
| Problem row 1, right column | starts x 794, 454 px wide; body copy 14 px over 3 lines |
| Problem row 2 | starts 160 px below row 1; columns 608/568 (gap 56); heading 48 px, 2 lines |
| Problem scattered-tools diagram | 484×357, centred in the 608 px cell (x 86..569) |
| Stage cards | 4-up (290 px, gap 24) |
| Roles container / panel / role cards | 48 px padding; panel x 73..429; cards x 462..1206 (3-up, 238 px, gap 16) |
| Role card | ≈157 px tall: 16 px padding, 12 px/16 px body over 2 lines, terracotta mono access line |
| Inventory columns | 378 / 806 (gap 48); registry panel x 450..1256, 32 px inner padding (tiles x 483..1222) |
| FAQ column | 848 px wide (x 216..1063) |
| Closing CTA band | 451 px tall |
| Footer | 555 px tall; link rows on a 26 px pitch; particle wordmark ink 652×71, centred |
| Footer legal row | x 24..1253 |

Section rhythm matches the export too: the gap between one section's last content line and the next
section's first heading is ≈210 px, i.e. `py-24` (96 px) per section edge.

**Two deliberate deviations from the export — do not "correct" them without asking.** (1) The hero,
product, roles and inventory bands are painted `bg-cream` (`#FCFBF7`) where the export is plain white;
(2) the footer wordmark is the SVG dash pattern above, not a raster of the export's particle mark. Both
come from the 2026-09-23 editorial rebuild and are recorded in the section table above.

## Shared primitives (`features/landing/shared.tsx`)

`Reveal` (IntersectionObserver entrance animation, reduced-motion aware, `delayMs` for stagger). Section chrome (headers, cards, tables) is composed inline in each section file with the tokens above — there is no shared `SectionHeading`/`BrowserFrame` primitive anymore; the hero chrome lives in `HeroSection.tsx`.

## Conventions for new sections

- Use `Reveal` for entrance animation (nothing else).
- Keep sections in `<main>`; register a matching anchor `id` in `LandingNavbar`'s `NAV_LINKS` only if the section is a primary nav target.
- Warm (`bg-cream`) and white (`bg-white`) bands alternate; the closing CTA is the only dark band.
- Add new icons to `apps/web/src/shared/components/icons.tsx` (stroke-style, matching the existing `createPathsWithElements`/`createMultiPathIcon` helpers) rather than importing a new icon package; `lucide-react` is already in use across landing sections.

