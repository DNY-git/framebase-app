import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { ArrowRight } from '@/shared/components/icons';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  subtext?: ReactNode;
  accentClassName?: string;
  href?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  accentClassName,
  href,
  className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        'group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              accentClassName ?? 'bg-primary',
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        {href && (
          <ArrowRight className="h-4 w-4 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-0.5 text-sm text-foreground-muted">{label}</p>
      </div>
      {subtext && <p className="mt-1 text-xs text-foreground-muted">{subtext}</p>}
    </div>
  );

  return href ? <Link to={href} className="block">{body}</Link> : body;
}
