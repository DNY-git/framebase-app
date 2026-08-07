import { useEffect, useState, useRef } from 'react';
import { Bell, Check } from './icons';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  readAt: string | null;
}

const NOTIF_LABELS: Record<string, string> = {
  'task.assigned': 'Task Assigned',
  'task.due_soon': 'Task Due Soon',
  'task.blocked': 'Task Blocked',
  'task.overdue': 'Task Overdue',
  'task.unblocked': 'Task Unblocked',
  'dependency.completed': 'Dependency Completed',
  'inventory.below_reorder': 'Low Inventory',
  'equipment.maintenance_due': 'Maintenance Due',
  'report.completed': 'Report Completed',
  'report.failed': 'Report Failed',
  'project.status_changed': 'Project Status Changed',
};

function formatDate(date?: string | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    authFetch('/api/v1/notifications/unread-count', { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => setCount(j.data?.count ?? 0))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/notifications?perPage=30');
      if (!res.ok) throw new Error('Failed to load notifications');
      const j = await res.json();
      const list = j.data?.data ?? j.data ?? [];
      setItems(list);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await authFetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await authFetch('/api/v1/notifications/read-all', { method: 'PATCH' });
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {error ? (
              <div className="px-4 py-6 text-center text-sm text-danger">{error}</div>
            ) : isLoading ? (
              <div className="px-4 py-6 text-center text-sm text-foreground-muted">Loading...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-foreground-muted">No notifications yet</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && handleMarkRead(n.id)}
                  className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-muted/60 ${
                    !n.readAt ? 'bg-primary/5' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                      {NOTIF_LABELS[n.type] ?? n.type}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-foreground">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-foreground-muted line-clamp-2">{n.body}</span>}
                    <span className="mt-1 block text-[10px] text-foreground-muted/70">{formatDate(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
