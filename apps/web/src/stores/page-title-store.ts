import { create } from 'zustand';

interface PageTitle {
  title: string;
  subtitle?: string;
}

interface PageTitleStore {
  pageTitle: PageTitle | null;
  setPageTitle: (title: string, subtitle?: string) => void;
}

export const usePageTitleStore = create<PageTitleStore>((set) => ({
  pageTitle: null,
  setPageTitle: (title, subtitle) => set({ pageTitle: { title, subtitle } }),
}));
