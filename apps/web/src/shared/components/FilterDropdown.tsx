import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      return;
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Also check portal menu
        const target = e.target as Node;
        const portal = document.getElementById('filter-dropdown-portal');
        if (portal && portal.contains(target)) return;
        setOpen(false);
      }
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

  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const width = rect.width;
      const top = rect.bottom + 4;
      const left = rect.left;
      // Flip to above if near bottom
      const maxHeight = 256;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < maxHeight && rect.top > spaceBelow;
      setMenuStyle({
        position: 'fixed',
        width: `${width}px`,
        left: `${left}px`,
        top: openUp ? `${rect.top - maxHeight - 4}px` : `${top}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 50,
      });
    }
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const menu = open ? (
    <ul
      id="filter-dropdown-portal"
      role="listbox"
      style={menuStyle}
      className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl scrollbar-thin"
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
  ) : null;

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
            : 'flex h-10 w-full items-center justify-between gap-2 rounded-lg border-0 bg-surface px-3 text-sm text-foreground transition-colors hover:bg-surface-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'
        }
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
}
