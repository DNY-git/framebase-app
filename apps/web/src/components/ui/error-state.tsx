import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, title, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger', className)}
    >
      {title && <p className="font-medium">{title}</p>}
      {message && <p className="mt-0.5">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}
