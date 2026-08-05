import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface TableToolbarProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function TableToolbar({ title, description, children, className }: TableToolbarProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
        {description && <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
