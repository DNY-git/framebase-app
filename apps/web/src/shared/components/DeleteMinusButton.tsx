import type { ReactNode } from 'react';

interface DeleteMinusButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Red subtraction/minus sign used as the delete control for log entries and
 * team removals. Deliberately NOT a trash-can icon — a small red circular
 * minus glyph keeps the destructive action visually distinct and consistent
 * across the app (see prompt Part 4/5).
 */
export function DeleteMinusButton({
  onClick,
  label = 'Delete',
  disabled,
  className = '',
}: DeleteMinusButtonProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-danger/40 text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 ${className}`}
    >
      <span className="text-base leading-none" aria-hidden>
        −
      </span>
    </button>
  );
}
