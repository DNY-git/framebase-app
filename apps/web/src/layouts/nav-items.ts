import type { ComponentType, SVGProps } from 'react';
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

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  /** Route handled by the router (never a full page reload). */
  to: string;
  label: string;
  icon: NavIcon;
}

export interface NavGroup {
  /** Stable React key. */
  id: string;
  /** Uppercase section label rendered above the group in expanded views. */
  label?: string;
  items: readonly NavItem[];
}

/**
 * Single source of truth for the app navigation, shared by every rendering of
 * the floating bubble nav — desktop expanded panel, desktop collapsed pill and
 * the mobile pill + expanded sheet — so routes, labels and icons can never
 * drift apart.
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

/** Utility group, visually separated from the main nav by a divider. */
export const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

/**
 * Grouped view of the same items: main navigation first, then the workspace
 * (utility) group. Drives the dividers/section labels in all three renderings.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  { id: 'main', items: NAV_ITEMS },
  { id: 'workspace', label: 'Workspace', items: BOTTOM_ITEMS },
];

/* ------------------------------------------------------------------ *
 * Floating bubble nav layout constants (px).                          *
 * The main content offset in `AppShell` mirrors these:                *
 *   expanded: 20 + 240 + 20 = 280px → `lg:pl-70`                      *
 *   collapsed: 20 + 60 + 20 = 100px → `lg:pl-25`                      *
 * ------------------------------------------------------------------ */

/** Floating inset from the viewport edges (top/left/bottom). */
export const NAV_PANEL_INSET = 20;
/** Expanded panel width. */
export const NAV_PANEL_EXPANDED_WIDTH = 240;
/** Collapsed pill width. */
export const NAV_PANEL_COLLAPSED_WIDTH = 60;
/** Gap between the floating panel and the main content area. */
export const NAV_CONTENT_GAP = 20;
/** Right edge of the collapsed pill — anchor for its hover tooltips. */
export const NAV_COLLAPSED_EDGE = NAV_PANEL_INSET + NAV_PANEL_COLLAPSED_WIDTH;
/** Content left offset when the panel is expanded. */
export const NAV_CONTENT_OFFSET_EXPANDED =
  NAV_PANEL_INSET + NAV_PANEL_EXPANDED_WIDTH + NAV_CONTENT_GAP;
/** Content left offset when the panel is collapsed into the pill. */
export const NAV_CONTENT_OFFSET_COLLAPSED =
  NAV_PANEL_INSET + NAV_PANEL_COLLAPSED_WIDTH + NAV_CONTENT_GAP;
