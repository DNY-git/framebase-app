import type { ReactNode } from 'react';

export type StatusStatTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const TONE_CLASS: Record<StatusStatTone, string> = {
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  success: 'bg-success/10 text-success',
  neutral: 'bg-foreground-muted/10 text-foreground-muted',
};

export interface StatusStat {
  label: string;
  count: number;
  tone?: StatusStatTone;
}

/**
 * Compact inline status-count row: a small numbered badge + bold label,
 * inline (no large cards). Reused by the Reports section and any other
 * view that wants a lightweight metric strip.
 */
export function StatusStatRow({
  items,
  className,
}: {
  items: StatusStat[];
  className?: string;
}): ReactNode {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className ?? ''}`}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
              TONE_CLASS[item.tone ?? 'neutral']
            }`}
          >
            {item.count}
          </span>
          <span className="font-semibold text-foreground">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
