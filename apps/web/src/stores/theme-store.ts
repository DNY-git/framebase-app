import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
}

function loadStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('ct_theme') as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'system';
}

export const useThemeStore = create<ThemeStore>((set) => {
  const stored = loadStoredTheme();
  const resolved = stored === 'system' ? getSystemPreference() : stored;
  applyTheme(resolved);

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const state = useThemeStore.getState();
      if (state.theme === 'system') {
        const newResolved = getSystemPreference();
        applyTheme(newResolved);
        set({ resolved: newResolved });
      }
    });
  }

  return {
    theme: stored,
    resolved,
    setTheme: (theme) => {
      const resolved = theme === 'system' ? getSystemPreference() : theme;
      applyTheme(resolved);
      try { localStorage.setItem('ct_theme', theme); } catch { /* ignore */ }
      set({ theme, resolved });
    },
  };
});
