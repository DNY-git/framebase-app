import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ui/content-card';
import { SectionHeader } from '@/components/ui/section-header';

interface DataCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function DataCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: DataCardProps) {
  return (
    <ContentCard className={className}>
      {(title || action) && (
        <SectionHeader title={title} description={description} action={action} />
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </ContentCard>
  );
}
