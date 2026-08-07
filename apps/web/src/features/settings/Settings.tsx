import { useState } from 'react';
import { useAuthStore, type User } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { authFetch } from '../../auth-fetch';
import {
  User as UserIcon,
  Loader2,
  CheckCircle,
  Building,
  Shield,
  Sun,
  Moon,
  Monitor,
  Check,
} from '../../shared/components/icons';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'appearance'>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['profile', 'organization', 'appearance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab === 'profile' && <UserIcon className="h-4 w-4" />}
            {tab === 'organization' && <Building className="h-4 w-4" />}
            {tab === 'appearance' && <Sun className="h-4 w-4" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab user={user} setUser={setUser} />}
      {activeTab === 'organization' && <OrganizationTab />}
      {activeTab === 'appearance' && <AppearanceTab />}
    </div>
  );
}

function ProfileTab({ user, setUser }: { user: User | null; setUser: (u: User) => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await authFetch('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to update profile');
      }
      if (user) {
        setUser({ ...user, name });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Profile Information</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
          <CheckCircle className="h-4 w-4" /> Profile updated successfully
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
          <input
            id="s-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="s-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
          <input
            id="s-email"
            value={user?.email ?? ''}
            disabled
            className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground-muted cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-foreground-muted">Email cannot be changed</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-foreground-muted" />
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase text-primary">
              {user?.role?.replace(/_/g, ' ') ?? 'Unknown'}
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </form>
    </div>
  );
}

function OrganizationTab() {
  const { user } = useAuthStore();

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Organization</h3>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Tenant ID</label>
          <div className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 flex items-center text-sm text-foreground-muted font-mono">
            {user?.tenantId ?? '—'}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <div className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 flex items-center text-sm text-foreground-muted">
            {user?.role?.replace(/_/g, ' ') ?? '—'}
          </div>
        </div>
        <p className="text-xs text-foreground-muted">
          Organization settings are managed by your administrator.
        </p>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: 'light' as const, icon: Sun, title: 'Light', description: 'Bright, crisp interface for daytime work' },
    { value: 'dark' as const, icon: Moon, title: 'Dark', description: 'Low-glare dark interface for night shifts' },
    { value: 'system' as const, icon: Monitor, title: 'System', description: 'Follows your device color scheme' },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Appearance</h3>
      <p className="mb-5 text-xs text-foreground-muted">Choose how Framebase looks on your device</p>

      <div className="grid gap-3 sm:grid-cols-3 max-w-2xl">
        {options.map(({ value, icon: Icon, title, description }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={isActive}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-surface hover:border-foreground-muted'
              }`}
            >
              {isActive && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-foreground-muted'}`} />
              <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-foreground-muted">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
