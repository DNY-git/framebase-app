import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePageTitleStore } from '@/stores/page-title-store';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);

  useEffect(() => {
    setPageTitle(title, subtitle);
    return () => setPageTitle('');
  }, [title, subtitle, setPageTitle]);

  return (
    <div className={cn(className)}>
      {actions && <div className="mb-6 flex items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
