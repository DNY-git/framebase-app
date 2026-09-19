import { useEffect } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from '../shared/components/icons';
import { useSidebarStore } from '../stores/sidebar-store';
import { Logo } from '../shared/components/Logo';
import { NAV_ITEMS, BOTTOM_ITEMS } from './nav-items';

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function MobileSidebar() {
  const { mobileOpen, closeMobile } = useSidebarStore();

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const renderLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: NavIcon }) => (
    <li key={to}>
      <NavLink
        to={to}
        end={to === '/dashboard'}
        onClick={closeMobile}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-sidebar-active/10 text-sidebar-active'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }`
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    </li>
  );

  if (!mobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={closeMobile}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar shadow-xl transition-transform">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center">
            <Logo className="h-8 w-auto max-w-full" />
          </div>
          <button
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">{NAV_ITEMS.map(renderLink)}</ul>

          <div className="mt-2 border-t border-sidebar-border pt-2">
            <ul className="space-y-0.5">{BOTTOM_ITEMS.map(renderLink)}</ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
