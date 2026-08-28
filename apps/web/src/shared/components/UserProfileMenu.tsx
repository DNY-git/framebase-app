import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, Check, Loader2 } from './icons';
import { useAuthStore } from '../../stores/auth-store';
import { logoutAll } from '../../auth-fetch';

export function UserProfileMenu() {
  const {
    user,
    isAuthenticated,
    logout,
    organizations,
    fetchOrganizations,
    switchOrganization,
  } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setOrgsLoading(true);
      fetchOrganizations().finally(() => setOrgsLoading(false));
    }
  }, [open, fetchOrganizations]);

  if (!isAuthenticated) return null;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const activeOrgName =
    organizations?.find((o) => o.id === user?.tenantId)?.name ?? null;

  const handleSwitch = async (id: string) => {
    if (id === user?.tenantId) {
      setOpen(false);
      return;
    }
    setSwitching(id);
    const ok = await switchOrganization(id);
    setSwitching(null);
    if (ok) {
      setOpen(false);
      navigate('/');
    }
  };

  const handleLogout = () => {
    logoutAll();
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {user?.avatarUrl ? (
            <img
              src={`/api/v1/auth/${user.id}/avatar?v=${encodeURIComponent(user.avatarUrl)}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span className="hidden text-sm font-medium text-foreground md:block">
          {user?.name || user?.email || 'User'}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-foreground-muted md:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg bg-surface shadow-lg">
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{user.name || 'User'}</p>
              <p className="text-xs text-foreground-muted">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                {user.role.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {activeOrgName && (
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <span className="truncate text-xs font-medium text-foreground">{activeOrgName}</span>
            </div>
          )}

          {organizations && organizations.length > 1 && (
            <div className="border-b border-border px-2 py-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                Switch organization
              </p>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={switching !== null}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted disabled:opacity-50 ${
                    org.id === user?.tenantId ? 'text-foreground' : 'text-foreground-muted'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{org.name}</span>
                  {switching === org.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                  ) : org.id === user?.tenantId ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : null}
                </button>
              ))}
              {orgsLoading && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              )}
            </div>
          )}

          <div className="py-1">
            <Link
              to="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface-muted"
            >
              <User className="h-4 w-4 text-foreground-muted" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface-muted"
            >
              Organizations
            </Link>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/5"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}