import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, type User } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { authFetch } from '../../auth-fetch';
import { storeTokens } from '../../auth';
import { ImageEditor } from '../../shared/components/ImageEditor';
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
  Camera,
  Trash,
  Edit,
} from '../../shared/components/icons';

const PREVIEW_MAX_DIMENSION = 1600;

/**
 * Downscales a selected photo to a small preview before the editor opens.
 * The editor decodes this preview instead of the full-resolution original,
 * so large photos (up to 10 MB) load and export quickly.
 */
function createPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rawUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale === 1) {
        resolve(rawUrl);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              URL.revokeObjectURL(rawUrl);
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(rawUrl);
            }
          },
          mime,
          0.92,
        );
      } catch {
        resolve(rawUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(rawUrl);
      reject(new Error('Could not load image'));
    };
    img.src = rawUrl;
  });
}

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
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const editorUrlRef = useRef<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const closeEditor = useCallback(() => {
    setEditorSrc(null);
    if (editorUrlRef.current) {
      URL.revokeObjectURL(editorUrlRef.current);
      editorUrlRef.current = null;
    }
  }, []);

  useEffect(() => closeEditor, [closeEditor]);

  const uploadAvatar = async (file: File) => {
    setIsAvatarUploading(true);
    setError(null);
    setSuccess(false);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await authFetch('/api/v1/auth/me/avatar', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to upload photo');
      }
      const body = await res.json();
      if (user) {
        setUser({ ...user, avatarUrl: body?.data?.avatarUrl ?? user.avatarUrl, name });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Photo must be a JPEG, PNG, or WebP image');
      setSuccess(false);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be 10 MB or smaller');
      setSuccess(false);
      return;
    }
    setError(null);
    setSuccess(false);
    try {
      editorUrlRef.current = await createPreviewUrl(file);
      setEditorSrc(editorUrlRef.current);
    } catch {
      setError('Could not load this image');
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) return;
    setError(null);
    try {
      const res = await authFetch('/api/v1/auth/me/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to remove photo');
      }
      setUser({ ...user, avatarUrl: null, name });
    } catch (err) {
      setError((err as Error).message);
    }
  };

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

      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {user?.avatarUrl ? (
              <img
                src={`/api/v1/auth/${user.id}/avatar?v=${encodeURIComponent(user.avatarUrl)}`}
                alt="Profile photo"
                className="h-full w-full object-cover"
              />
            ) : (
              user?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) ?? '?'
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Edit profile photo"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted shadow-sm transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted">
              {isAvatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isAvatarUploading ? 'Uploading…' : 'Upload photo'}
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} disabled={isAvatarUploading} />
            </label>
            {user?.avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="flex items-center gap-2 rounded-lg border border-danger/20 px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/5"
              >
                <Trash className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-foreground-muted">JPEG, PNG or WebP up to 10 MB — crop and resize before uploading</p>
        </div>
      </div>

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
          className="flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </form>

      {editorSrc && (
        <ImageEditor
          src={editorSrc}
          title="Edit profile photo"
          aspect={1}
          outputSize={512}
          onCancel={closeEditor}
          onApply={(blob, mimeType) => {
            const edited = new File([blob], mimeType === 'image/png' ? 'avatar.png' : 'avatar.jpg', { type: mimeType });
            closeEditor();
            void uploadAvatar(edited);
          }}
        />
      )}
    </div>
  );
}

function OrganizationTab() {
  const { user, organizations, fetchOrganizations, switchOrganization, setUser } = useAuthStore();
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setIsCreating(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await authFetch('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? 'Failed to create organization');
      }
      const data = body?.data ?? body;
      if (data?.accessToken && data?.refreshToken) {
        storeTokens(data.accessToken, data.refreshToken);
        setUser({
          id: data.user?.id ?? user?.id ?? '',
          email: data.user?.email ?? user?.email ?? '',
          name: data.user?.name ?? user?.name ?? '',
          role: data.user?.role ?? 'owner',
          tenantId: data.user?.tenantId ?? '',
          avatarUrl: data.user?.avatarUrl ?? user?.avatarUrl ?? null,
        });
      }
      setOrgName('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitch = async (id: string) => {
    setError(null);
    const ok = await switchOrganization(id);
    if (ok) {
      window.location.reload();
    } else {
      setError('Could not switch organization.');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Organization</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
          <CheckCircle className="h-4 w-4" /> Organization created
        </div>
      )}

      <div className="space-y-4 max-w-lg">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Active organization</label>
          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
            <Building className="h-4 w-4 text-foreground-muted" />
            <span className="flex-1 truncate">
              {organizations?.find((o) => o.id === user?.tenantId)?.name ?? 'Unknown'}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
              {user?.role?.replace(/_/g, ' ') ?? '—'}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <div className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 flex items-center text-sm text-foreground-muted">
            {user?.role?.replace(/_/g, ' ') ?? '—'}
          </div>
        </div>

        {organizations && organizations.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">All organizations</label>
            <div className="space-y-1.5">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <Building className="h-4 w-4 text-foreground-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{org.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                    {org.role.replace(/_/g, ' ')}
                  </span>
                  {org.id !== user?.tenantId && (
                    <button
                      onClick={() => handleSwitch(org.id)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                    >
                      Switch
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Create a new organization
          </label>
          <div className="flex gap-2">
            <input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. BuildRight Construction"
              className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !orgName.trim()}
              className="flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
          <p className="mt-1.5 text-xs text-foreground-muted">
            You become the OWNER and are switched into the new organization immediately.
          </p>
        </div>

        <p className="text-xs text-foreground-muted">
          Team members and invitations are managed on the{' '}
          <Link to="/team" className="text-primary hover:underline">Team page</Link>.
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
      <p className="mb-5 text-xs text-foreground-muted">Choose how FrameBase looks on your device</p>

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
