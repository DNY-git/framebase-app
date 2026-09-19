import { useEffect, useState } from 'react';
import type { ComponentType, FocusEvent, MouseEvent, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '../shared/components/icons';
import { Logo, LogoMark } from '../shared/components/Logo';
import { useSidebarStore } from '../stores/sidebar-store';
import { NAV_ITEMS, BOTTOM_ITEMS, COLLAPSED_SIDEBAR_WIDTH } from './nav-items';

interface TooltipState {
  label: string;
  top: number;
}

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

/** Gap between the collapsed rail and its hover tooltip. */
const TOOLTIP_GAP = 8;

/**
 * Desktop navigation rail. Two states:
 *  - expanded (`lg:w-64`): icon + label, as before.
 *  - collapsed (`lg:w-20`): icon-only rail with hover tooltips, matching the
 *    reference design. The choice is persisted via `useSidebarStore`.
 */
export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Labels are only hidden on the collapsed rail, so tooltips only apply there.
  useEffect(() => {
    if (!collapsed) setTooltip(null);
  }, [collapsed]);

  const showTooltip =
    (label: string) => (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      if (!collapsed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({ label, top: rect.top + rect.height / 2 });
    };

  const hideTooltip = () => setTooltip(null);

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    [
      'transition-colors',
      collapsed
        ? 'mx-auto flex h-11 w-11 items-center justify-center rounded-2xl'
        : 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
      isActive
        ? 'bg-sidebar-active/10 text-sidebar-active'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground',
    ].join(' ');

  const renderLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: NavIcon }) => (
    <li key={to} className="relative">
      <NavLink
        to={to}
        end={to === '/dashboard'}
        aria-label={label}
        onMouseEnter={showTooltip(label)}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip(label)}
        onBlur={hideTooltip}
        className={linkClassName}
      >
        {({ isActive }) => (
          <>
            <Icon className={collapsed ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0'} />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {/*
              Active indicator, anchored to the <li> (not the link) so it lands
              on the rail edge in the collapsed state.
            */}
            {collapsed && isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-sidebar-active"
              />
            )}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <aside
      className={`hidden transition-[width] duration-200 ease-in-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      }`}
    >
      <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
        <div
          className={`flex h-16 shrink-0 items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-5'
          }`}
        >
          {collapsed ? (
            // In the rail state the logo mark itself is the expand control.
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded={false}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl transition-colors hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <LogoMark className="h-8 w-8 transition-opacity group-hover:opacity-0" />
              <ChevronRight className="absolute h-4 w-4 text-sidebar-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <>
              <Logo className="h-8 w-auto max-w-full" />
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                aria-expanded
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-2 scrollbar-thin ${collapsed ? 'px-2' : 'px-3'}`}>
          <ul className={collapsed ? 'space-y-2' : 'space-y-0.5'}>{NAV_ITEMS.map(renderLink)}</ul>
        </nav>

        <div className={`border-t border-sidebar-border ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          <ul className={collapsed ? 'space-y-2' : 'space-y-0.5'}>{BOTTOM_ITEMS.map(renderLink)}</ul>
        </div>
      </div>

      {/* Rail tooltip — fixed so the scrollable nav cannot clip it. */}
      {collapsed && tooltip && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg"
          style={{ top: tooltip.top, left: COLLAPSED_SIDEBAR_WIDTH + TOOLTIP_GAP }}
        >
          {tooltip.label}
        </span>
      )}
    </aside>
  );
}