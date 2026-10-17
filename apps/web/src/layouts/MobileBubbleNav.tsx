import { Fragment, useEffect } from 'react';
import { ChevronRight, X } from '../shared/components/icons';
import { Logo } from '../shared/components/Logo';
import { useSidebarStore } from '../stores/sidebar-store';
import { NAV_GROUPS } from './nav-items';
import {
  NavDivider,
  NavRow,
  NavSectionLabel,
  NavUserCard,
  PillAvatar,
  PillButton,
  PillNavLink,
  SCROLLBAR_HIDDEN,
} from './NavPieces';

/**
 * Mobile navigation (<lg): the same bubble idea rotated — a horizontal
 * floating pill of round icon buttons centered near the bottom of the screen
 * (thumb-friendly), with hairline group dividers, horizontally scrollable
 * (hidden scrollbar) and safe-area aware. The expand control opens a compact
 * labeled sheet (icon + label rows + user card) directly above the pill.
 * Driven by the same `NAV_GROUPS` config as the desktop renderings.
 */
export function MobileBubbleNav() {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const closeMobile = useSidebarStore((s) => s.closeMobile);

  // Escape closes the expanded sheet (it behaves like a small dialog).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <div className="flex flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)_+_1rem)]">
          {mobileOpen && <MobileNavSheet onClose={closeMobile} />}

          <nav
            aria-label="Primary navigation"
            className={`flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-sidebar-border bg-surface px-1.5 py-1.5 shadow-dashboard ${SCROLLBAR_HIDDEN}`}
          >
            <PillButton
              label={mobileOpen ? 'Collapse navigation' : 'Expand navigation'}
              tooltipPlacement="top"
              ariaExpanded={mobileOpen}
              ariaControls="mobile-nav-sheet"
              onClick={toggleMobile}
            >
              <ChevronRight
                className={`h-4.5 w-4.5 transition-transform duration-300 motion-reduce:transition-none ${
                  mobileOpen ? 'rotate-90' : '-rotate-90'
                }`}
              />
            </PillButton>

            {NAV_GROUPS.map((group, index) => (
              <Fragment key={group.id}>
                {index > 0 && <NavDivider orientation="vertical" />}
                {group.items.map((item) => (
                  <PillNavLink
                    key={item.to}
                    {...item}
                    end={item.to === '/dashboard'}
                    tooltipPlacement="top"
                  />
                ))}
              </Fragment>
            ))}

            <NavDivider orientation="vertical" />
            <PillAvatar tooltipPlacement="top" />
          </nav>
        </div>
      </div>
    </>
  );
}

/** Labeled view of the same navigation, stacked above the pill. */
function MobileNavSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      id="mobile-nav-sheet"
      role="dialog"
      aria-label="Navigation menu"
      className="scrollbar-thin max-h-[60vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-sidebar-border bg-surface p-2 shadow-dashboard"
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-2 pb-2">
        <Logo className="h-6 w-auto max-w-full" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/60 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {group.label && <NavSectionLabel>{group.label}</NavSectionLabel>}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <NavRow
                key={item.to}
                {...item}
                end={item.to === '/dashboard'}
                variant="mobile"
                onNavigate={onClose}
              />
            ))}
          </ul>
        </div>
      ))}

      <NavUserCard className="mt-2 shrink-0" onNavigate={onClose} />
    </div>
  );
}
