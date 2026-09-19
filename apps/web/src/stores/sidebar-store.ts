import { create } from 'zustand';

/** localStorage key for the desktop sidebar expanded/collapsed preference. */
const COLLAPSED_STORAGE_KEY = 'ct_sidebar_collapsed';

interface SidebarStore {
  /** Mobile drawer visibility (unchanged). */
  mobileOpen: boolean;
  /** Desktop rail state: true = icon-only rail, false = full labels. */
  collapsed: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  mobileOpen: false,
  collapsed: loadCollapsed(),
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
  setCollapsed: (collapsed) => {
    persistCollapsed(collapsed);
    set({ collapsed });
  },
  toggleCollapsed: () =>
    set((s) => {
      const collapsed = !s.collapsed;
      persistCollapsed(collapsed);
      return { collapsed };
    }),
}));
