import { cn } from '../../lib/utils';

/**
 * Skeleton — animated placeholder block shown while a page is loading.
 * Uses the design tokens: bg-surface-muted fill on bg-surface/border-border cards.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-muted', className)} />;
}

/** SkeletonTableRow — one row matching the shared table row shape. */
export function SkeletonTableRow({ columns = 6 }: { columns?: number }) {
  return (
    <div className="flex animate-pulse items-center gap-6 border-t border-border px-4 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: Math.max(columns - 1, 1) }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-16" />
      ))}
    </div>
  );
}
