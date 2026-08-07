import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown } from './icons';
import { useAuthStore } from '../../stores/auth-store';
import { logoutAll } from '../../auth-fetch';

export function UserProfileMenu() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
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

  if (!isAuthenticated) return null;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </div>
        <span className="hidden text-sm font-medium text-foreground md:block">
          {user?.name || user?.email || 'User'}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-foreground-muted md:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg">
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{user.name || 'User'}</p>
              <p className="text-xs text-foreground-muted">{user.email}</p>
              {user.role && (
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                  {user.role.replace(/_/g, ' ')}
                </span>
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
