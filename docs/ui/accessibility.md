# Accessibility

> Accessibility is a release gate at ConstructTrack, not a polish step. Every screen must meet **WCAG 2.1 AA**. This document defines the concrete requirements, patterns, and test checklist every feature must satisfy before it's "done."

Companion docs: [design-system.md](./design-system.md), [components.md](./components.md), [../architecture/frontend.md → Accessibility](../architecture/frontend.md#accessibility), [PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules), [BIBLE.md §10](../../BIBLE.md#10-ui-philosophy).

---

## Table of Contents

- [Why It Matters Here](#why-it-matters-here)
- [Target Standard](#target-standard)
- [Keyboard Accessibility](#keyboard-accessibility)
- [Focus Management](#focus-management)
- [Semantics & ARIA](#semantics--aria)
- [Color & Contrast](#color--contrast)
- [Forms & Errors](#forms--errors)
- [Media & Motion](#media--motion)
- [Mobile & Touch](#mobile--touch)
- [Testing & Verification](#testing--verification)
- [Definition of Done (Accessibility)](#definition-of-done-accessibility)

---

## Why It Matters Here

Construction is a broadly accessible workforce, and ConstructTrack is used in the field — bright light, one-handed, sometimes with gloves, sometimes with assistive technology. Accessible design is **usable design** here: larger targets, high contrast, and keyboard paths help every user, not just those with permanent disabilities. It is also a [PROJECT_RULES.md §4](../../PROJECT_RULES.md#4-frontend-rules) requirement.

## Target Standard

- **WCAG 2.1 Level AA** for all features.
- We follow the POUR principles: Perceivable, Operable, Understandable, Robust.
- Where AA is impractical for a specific rich interaction, the deviation is documented with an [ADR](../decisions/) and a mitigating alternative path is provided.

## Keyboard Accessibility

- **Every interactive element is reachable and operable by keyboard** — no mouse-only interactions.
- **Logical tab order** follows the visual order; DOM order matches what users see.
- **Visible focus indicators** on all focusable elements (the design system's `ring` token). Never remove focus outlines without a replacement.
- **No keyboard traps** except intentional ones (modal dialogs trap focus while open and release on close).
- **Shortcuts:** where provided (e.g., `Cmd+K` palette), they don't conflict with screen-reader or browser shortcuts and are discoverable in documentation.

## Focus Management

- **Route changes** move focus to the page heading or main region (not left at the old page's location).
- **Modal/dialog open** moves focus to the dialog's first focusable element; **close** returns focus to the trigger.
- **Dynamic content inserts** (toasts, list additions) use live regions or move focus deliberately so the change is announced without disorienting the user.
- **Skip link** at the top of the app lets keyboard users jump to main content.

## Semantics & ARIA

- **Use native semantics first.** A `<button>` is a button; a `<nav>` is navigation; a `<table>` for data. Reach for ARIA only when a native element can't express the pattern.
- **Headings hierarchy** is meaningful (one `h1` per view, descending without skipping levels) — primary navigation for screen-reader users.
- **Labels:** every form control has a visible `<label>` (or `aria-label` when a visible label is genuinely impossible, e.g., icon buttons).
- **Error wiring:** inputs link to their error text via `aria-describedby` and set `aria-invalid` on error.
- **Live regions:** toasts, optimistic save indicators, and async result areas announce changes via `aria-live` (polite by default).
- **Status conveyed in text**, not color alone — see [Color & Contrast](#color--contrast).

## Color & Contrast

- **Contrast ratios** meet AA: 4.5:1 for normal text, 3:1 for large text (≥18pt or 14pt bold) and for UI component graphics/borders.
- **Color is never the sole carrier of information.** Status badges combine color with a label and a distinct icon shape; required fields use both an asterisk and accessible labeling; chart series use patterns/labels in addition to hue.
- **States** (hover, focus, selected, disabled) are distinguishable beyond color (borders, weight, ring).
- Tested in both light and dark themes (token remapping preserves contrast).

## Forms & Errors

- Each field has a **label**, **helper text** where helpful, and an **inline error** on failure.
- **Required fields** are marked with both a visible indicator (`*`) and `aria-required`.
- **Error recovery** is clear: state what's wrong and how to fix it, in plain language, at the field and/or form level.
- **Autocomplete** attributes are set correctly (`username`, `email`, `current-password`, `new-password`) so password managers and browser features work.
- **Submission feedback:** the submit button shows a pending state and is disabled to prevent double-submit; success/error is announced.

## Media & Motion

- **Images** have meaningful `alt`; decorative images use `alt=""`.
- **Charts and complex graphics** include a text alternative or a data table view.
- **Video/audio** (future) provide captions and transcripts.
- **Motion respects `prefers-reduced-motion`:** non-essential animation is disabled or reduced. Motion never carries essential information alone.
- **Auto-playing content** is avoided; if used, it's pausable and short.

## Mobile & Touch

- **Touch targets ≥ 44×44 CSS px** (WCAG 2.5.5 target, our baseline) — critical for field use with gloves or imprecise taps.
- **Sufficient spacing** between adjacent targets to prevent mis-taps.
- **Responsive layouts** reflow without horizontal scroll at 320px width (WCAG 1.4.10).
- **Orientation** works in both portrait and landscape; nothing forces one orientation.

## Testing & Verification

Accessibility is verified at three levels before a feature ships:

1. **Automated** — axe-core runs in unit/component tests and CI; zero critical/serious violations.
2. **Keyboard** — a manual pass: unplug the mouse and complete the feature's core task (create, read, update, delete) using only the keyboard. Focus order and visibility are checked.
3. **Screen reader** — spot-check with at least one screen reader (NVDA or VoiceOver) on the feature's key flows; output must be understandable without the screen.
4. **Contrast** — verified in both themes against the design-system tokens.

Playwright E2E tests include keyboard-navigation assertions on primary flows.

## Definition of Done (Accessibility)

A feature is not done until:

- [ ] axe-core reports zero critical/serious violations in CI.
- [ ] The core task is completable by keyboard alone, with visible focus throughout.
- [ ] All form fields are labeled; errors are wired with `aria-describedby` + `aria-invalid`.
- [ ] Status/information is conveyed beyond color (label + icon/shape).
- [ ] Contrast meets AA in both light and dark themes.
- [ ] A screen-reader spot-check on the main flow is understandable.
- [ ] `prefers-reduced-motion` is honored for any non-essential motion.
- [ ] Touch targets meet the 44×44 minimum where the feature is mobile-relevant.

Accessibility debt is tracked like any other bug — not deferred silently. When a deviation is unavoidable, it's documented in an [ADR](../decisions/) with a mitigating alternative.
