import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className }: ContentCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}
