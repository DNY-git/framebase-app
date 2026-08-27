import { useEffect, useRef, useState } from "react";

export type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value: string): string {
  const date = parseISO(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildMonthGrid(viewYear: number, viewMonth: number): (Date | null)[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select a date",
  className = "",
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setView(selected ?? new Date());
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const viewYear = view.getFullYear();
  const viewMonth = view.getMonth();
  const cells = buildMonthGrid(viewYear, viewMonth);
  const todayISO = toISO(new Date());

  function isDisabled(d: Date): boolean {
    const iso = toISO(d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  function select(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView(new Date(viewYear, viewMonth + delta, 1));
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setOpenUp(window.innerHeight - rect.bottom < 320);
          }
          setOpen((o) => !o);
        }}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-foreground-muted"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className={`absolute z-50 w-64 rounded-lg bg-popover p-3 text-popover-foreground shadow-lg ${openUp ? 'bottom-full mb-1' : 'mt-1'}`}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="text-sm font-medium text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="flex h-7 items-center justify-center text-xs font-medium text-foreground-muted"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`e${idx}`} />;
              const iso = toISO(cell);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const disabledCell = isDisabled(cell);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabledCell}
                  onClick={() => select(cell)}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                    disabledCell
                      ? "cursor-not-allowed text-foreground-muted/40"
                      : isSelected
                        ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                        : isToday
                          ? "text-primary font-medium hover:bg-surface-muted"
                          : "text-foreground hover:bg-surface-muted",
                  ].join(" ")}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
