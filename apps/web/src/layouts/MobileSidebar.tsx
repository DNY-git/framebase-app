import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HardHat,
  X,
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Wrench,
  Package,
  FileText,
  Bot,
  Shield,
  Settings as SettingsIcon,
} from '../shared/components/icons';
import { useSidebarStore } from '../stores/sidebar-store';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/equipment', label: 'Equipment', icon: Wrench },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/ai', label: 'AI Assistant', icon: Bot },
  { to: '/audit', label: 'Audit Log', icon: Shield },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">Framebase</span>
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
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sidebar-active/10 text-sidebar-active'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                    }`
                  }
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
