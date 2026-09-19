import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSidebarStore } from './sidebar-store';

const STORAGE_KEY = 'ct_sidebar_collapsed';

function resetStore() {
  localStorage.clear();
  useSidebarStore.setState({ mobileOpen: false, collapsed: false });
}

describe('sidebar-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('defaults to expanded when nothing is persisted', () => {
      expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('restores the persisted collapsed state on load', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      vi.resetModules();
      const fresh = await import('./sidebar-store');
      expect(fresh.useSidebarStore.getState().collapsed).toBe(true);
    });

    it('ignores a malformed persisted value', async () => {
      localStorage.setItem(STORAGE_KEY, 'yes-please');
      vi.resetModules();
      const fresh = await import('./sidebar-store');
      expect(fresh.useSidebarStore.getState().collapsed).toBe(false);
    });
  });

  describe('toggleCollapsed', () => {
    it('flips the state and persists it', () => {
      useSidebarStore.getState().toggleCollapsed();
      expect(useSidebarStore.getState().collapsed).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      useSidebarStore.getState().toggleCollapsed();
      expect(useSidebarStore.getState().collapsed).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });

  describe('setCollapsed', () => {
    it('persists an explicit value', () => {
      useSidebarStore.getState().setCollapsed(true);
      expect(useSidebarStore.getState().collapsed).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('does not affect the mobile drawer state', () => {
      useSidebarStore.getState().setCollapsed(true);
      expect(useSidebarStore.getState().mobileOpen).toBe(false);
    });
  });

  describe('mobile drawer', () => {
    it('opens, closes and toggles independently of the rail state', () => {
      const store = useSidebarStore.getState();
      store.openMobile();
      expect(useSidebarStore.getState().mobileOpen).toBe(true);
      expect(useSidebarStore.getState().collapsed).toBe(false);

      store.closeMobile();
      expect(useSidebarStore.getState().mobileOpen).toBe(false);

      store.toggleMobile();
      expect(useSidebarStore.getState().mobileOpen).toBe(true);
    });
  });
});
