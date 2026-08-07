import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePageTitleStore } from '../../stores/page-title-store';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageLayout({ children, title, subtitle, actions }: PageLayoutProps) {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);

  useEffect(() => {
    if (title) setPageTitle(title, subtitle);
    return () => setPageTitle('');
  }, [title, subtitle, setPageTitle]);

  return (
    <div>
      {actions && <div className="mb-6 flex items-center justify-end gap-2">{actions}</div>}
      {children}
    </div>
  );
}
