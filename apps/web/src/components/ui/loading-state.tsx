import { cn } from '@/lib/utils';
import { Loader2 } from '@/shared/components/icons';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-foreground-muted',
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
