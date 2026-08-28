import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from './icons';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 'dropdown' = bordered select-style trigger (default); 'button' = solid action button. */
  variant?: 'dropdown' | 'button';
}

export function FilterDropdown({ value, onChange, options, placeholder = 'Select...', className, disabled, variant = 'dropdown' }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      return;
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={
          variant === 'button'
            ? 'flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-action px-4 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'
            : 'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:bg-surface-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'
        }
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg bg-surface py-1 shadow-lg scrollbar-thin"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted ${
                  o.value === value ? 'font-medium text-foreground' : 'text-foreground'
                }`}
              >
                {o.label}
                {o.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
