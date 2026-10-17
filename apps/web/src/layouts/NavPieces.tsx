import { useState } from 'react';
import type { FocusEvent, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { NAV_COLLAPSED_EDGE } from './nav-items';
import type { NavItem } from './nav-items';
import { NavAvatar } from './NavAvatar';

/** Gap between the bubble nav and its hover tooltip. */
const TOOLTIP_GAP = 8;

/** Hides scrollbars in both engines (pill rows scroll with hidden bars). */
export const SCROLLBAR_HIDDEN = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export type TooltipPlacement = 'right' | 'top';

/**
 * Hover/focus label for icon-only pill buttons. Portaled to `document.body`
 * so the pill's scroll containers can never clip it, and fixed-positioned so
 * it stays put while the pointer moves.
 */
export function NavTooltip({
  label,
  rect,
  placement,
}: {
  label: string;
  rect: DOMRect;
  placement: TooltipPlacement;
}) {
  const style =
    placement === 'right'
      ? { top: rect.top + rect.height / 2, left: NAV_COLLAPSED_EDGE + TOOLTIP_GAP }
      : { top: rect.top - TOOLTIP_GAP, left: rect.left + rect.width / 2 };

  return createPortal(
    <span
      role="tooltip"
      className={`pointer-events-none fixed z-50 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg ${
        placement === 'right' ? '-translate-y-1/2' : '-translate-x-1/2 -translate-y-full'
      }`}
      style={style}
    >
      {label}
    </span>,
    document.body,
  );
}

/** Self-contained tooltip wiring for a pill button (hover + keyboard focus). */
function usePillTooltip(label: string, placement: TooltipPlacement) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    setRect(event.currentTarget.getBoundingClientRect());
  };
  const hide = () => setRect(null);

  return {
    show,
    hide,
    tooltip: rect ? <NavTooltip label={label} rect={rect} placement={placement} /> : null,
  };
}

/** Shared classes for the 44px round pill buttons (icon-only nav items). */
function pillClassName(isActive = false) {
  return [
    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
    'transition-[background-color,color,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'motion-safe:hover:scale-[1.06]',
    isActive
      ? 'bg-sidebar-active/10 text-sidebar-active'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground',
  ].join(' ');
}

interface PillButtonProps {
  /** Also used as the accessible name and tooltip text. */
  label: string;
  /** Extra classes (e.g. rotation on the chevron). */
  className?: string;
  /** Replaces the default content (e.g. an avatar). */
  children: ReactNode;
  onClick?: () => void;
  ariaExpanded?: boolean;
  ariaControls?: string;
  tooltipPlacement?: TooltipPlacement;
}

/** Non-navigation pill button (expand/collapse toggle). */
export function PillButton({
  label,
  className,
  children,
  onClick,
  ariaExpanded,
  ariaControls,
  tooltipPlacement = 'right',
}: PillButtonProps) {
  const { tooltip, show, hide } = usePillTooltip(label, tooltipPlacement);

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={label}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        className={`${pillClassName()} ${className ?? ''}`}
      >
        {children}
      </button>
      {tooltip}
    </>
  );
}

interface PillNavLinkProps extends NavItem {
  /** Same icon in both expanded and collapsed states (one config). */
  end?: boolean;
  tooltipPlacement?: TooltipPlacement;
}

/** Icon-only pill link — one of the nav items in a collapsed/mobile pill. */
export function PillNavLink({
  to,
  label,
  icon: Icon,
  end,
  tooltipPlacement = 'right',
}: PillNavLinkProps) {
  const { tooltip, show, hide } = usePillTooltip(label, tooltipPlacement);

  return (
    <>
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={({ isActive }) => pillClassName(isActive)}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
      </NavLink>
      {tooltip}
    </>
  );
}

/** User avatar pinned at the bottom of both pills (→ account settings). */
export function PillAvatar({ tooltipPlacement = 'right' }: { tooltipPlacement?: TooltipPlacement }) {
  const { tooltip, show, hide } = usePillTooltip('Account', tooltipPlacement);

  return (
    <>
      <NavLink
        to="/settings/profile"
        aria-label="Account"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={({ isActive }) => pillClassName(isActive)}
      >
        <NavAvatar size={28} />
      </NavLink>
      {tooltip}
    </>
  );
}

/** Thin hairline between nav groups (orientation follows the pill axis). */
export function NavDivider({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <span
      aria-hidden="true"
      className={
        orientation === 'vertical'
          ? 'mx-1 h-6 w-px shrink-0 bg-sidebar-border'
          : 'my-1 h-px w-6 shrink-0 bg-sidebar-border'
      }
    />
  );
}

/** Uppercase section label above a nav group (expanded views only). */
export function NavSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
      {children}
    </div>
  );
}

interface NavRowProps extends NavItem {
  end?: boolean;
  /** Mobile rows get slightly taller touch targets. */
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

/** Icon + label nav row used by the desktop expanded panel and mobile sheet. */
export function NavRow({ to, label, icon: Icon, end, variant = 'desktop', onNavigate }: NavRowProps) {
  const padding = variant === 'mobile' ? 'px-3 py-2.5' : 'px-3 py-2';

  return (
    <li>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          [
            `flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${padding}`,
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            isActive
              ? 'bg-sidebar-active/10 text-sidebar-active'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground',
          ].join(' ')
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
      </NavLink>
    </li>
  );
}

/** Real logged-in user (name, role, photo) → links to account settings. */
export function NavUserCard({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const name = user?.name || user?.email || 'User';
  const role = (user?.role ?? '').replace(/_/g, ' ');

  return (
    <Link
      to="/settings/profile"
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-hover px-3 py-2.5 transition-colors hover:bg-sidebar-active/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        className ?? ''
      }`}
    >
      <NavAvatar size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-sidebar-foreground">{name}</span>
        {role && (
          <span className="block truncate text-xs capitalize text-sidebar-foreground/60">{role}</span>
        )}
      </span>
    </Link>
  );
}
