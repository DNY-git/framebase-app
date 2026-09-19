import {
  LayoutGrid,
  FolderKanban,
  Users,
  CheckSquare,
  Package,
  Briefcase,
  BarChart3,
  FileText,
  ClipboardList,
  Settings,
} from '../shared/components/icons';

/**
 * Single source of truth for the app navigation, shared by the desktop
 * `Sidebar` (expanded + collapsed rail) and the `MobileSidebar` drawer so the
 * routes, labels and icons can never drift apart.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/equipment', label: 'Equipment', icon: Briefcase },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/audit', label: 'Audit Log', icon: ClipboardList },
] as const;

/** Pinned to the bottom of the rail, visually separated from the main nav. */
export const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Pixel width of the collapsed icon-only rail (matches `lg:w-20`). */
export const COLLAPSED_SIDEBAR_WIDTH = 80;