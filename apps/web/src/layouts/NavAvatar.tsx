import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';

interface NavAvatarProps {
  /** Diameter in px — 28 inside the collapsed pill, 32 in user cards. */
  size?: 28 | 32;
}

/**
 * The logged-in user's real profile photo (same endpoint as the topbar
 * avatar), falling back to their initials. Shared by the bubble nav user
 * card and the avatar pinned in the collapsed/mobile pills.
 */
export function NavAvatar({ size = 32 }: NavAvatarProps) {
  const user = useAuthStore((s) => s.user);
  /** Set when the avatar image cannot be loaded (missing file / remote URL). */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user?.avatarUrl]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const dimension = size === 28 ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs';

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground ${dimension}`}
    >
      {user?.avatarUrl && !failed ? (
        <img
          src={`/api/v1/auth/${user.id}/avatar?v=${encodeURIComponent(user.avatarUrl)}`}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
