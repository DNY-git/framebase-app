import { Fragment } from 'react';
import { ChevronLeft, ChevronRight } from '../shared/components/icons';
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
 * Floating desktop navigation (replaces the old flush-left rail). Inset from
 * the viewport edges with a soft deep shadow so it reads as a bubble:
 *  - expanded: rounded panel — logo + collapse button header, grouped nav
 *    list with icon + label rows, real user card pinned at the bottom.
 *  - collapsed: narrow vertical pill — expand chevron, stacked 44px round
 *    icon buttons with hairline group dividers, user avatar pinned at the
 *    bottom, tooltips on hover/focus.
 * Width/padding/radius animate together over 0.35s cubic-bezier(0.4,0,0.2,1)
 * (disabled under prefers-reduced-motion); `AppShell` shifts the content
 * offset with the same timing. The state is persisted by `useSidebarStore`
 * (localStorage, read before first render — no wrong-state flash).
 */
export function BubbleNav() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  return (
    <aside
      className={`fixed bottom-5 left-5 top-5 z-30 hidden flex-col overflow-hidden border border-sidebar-border bg-surface shadow-dashboard transition-[width,padding,border-radius,background-color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none lg:flex ${
        collapsed ? 'w-15 rounded-[32px] px-1.5 py-2' : 'w-60 rounded-[20px] px-3 py-4'
      }`}
      aria-label="Bubble navigation"
    >
      {collapsed ? (
        <CollapsedPill onExpand={toggleCollapsed} />
      ) : (
        <ExpandedPanel onCollapse={toggleCollapsed} />
      )}
    </aside>
  );
}

/** Expanded state: header row, grouped nav list, user card. */
function ExpandedPanel({ onCollapse }: { onCollapse: () => void }) {
  return (
    <>
      {/* Header: logo left, round collapse button right, divider underneath. */}
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border pb-3 pr-1">
        <Logo className="h-8 w-auto max-w-full" />
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse navigation"
          aria-expanded
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-hover text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {group.label && <NavSectionLabel>{group.label}</NavSectionLabel>}
            <ul className="space-y-0.5 py-1">
              {group.items.map((item) => (
                <NavRow key={item.to} {...item} end={item.to === '/dashboard'} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <NavUserCard className="mt-2 shrink-0" />
    </>
  );
}

/** Collapsed state: narrow pill of round icon buttons. */
function CollapsedPill({ onExpand }: { onExpand: () => void }) {
  return (
    <div className={`flex h-full flex-col items-center gap-0.5 overflow-y-auto ${SCROLLBAR_HIDDEN}`}>
      <PillButton label="Expand navigation" ariaExpanded={false} onClick={onExpand}>
        <ChevronRight className="h-4.5 w-4.5" />
      </PillButton>

      {NAV_GROUPS.map((group, index) => (
        <Fragment key={group.id}>
          {index > 0 && <NavDivider />}
          {group.items.map((item) => (
            <PillNavLink key={item.to} {...item} end={item.to === '/dashboard'} />
          ))}
        </Fragment>
      ))}

      <NavDivider />
      <PillAvatar />
    </div>
  );
}
