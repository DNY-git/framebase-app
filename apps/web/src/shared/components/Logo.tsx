import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';
import { useThemeStore } from '../../stores/theme-store';

interface LogoProps {
  className?: string;
}

/**
 * FrameBase brand lockup (icon + wordmark), switching automatically
 * with the app theme via the existing theme store (`resolved`).
 * Light mode uses the dark-text logo; dark mode uses the light-text logo.
 */
export function Logo({ className }: LogoProps) {
  const resolved = useThemeStore((s) => s.resolved);

  return (
    <img
      src={resolved === 'dark' ? logoDark : logoLight}
      alt="FrameBase"
      draggable={false}
      className={className ?? 'h-8 w-auto'}
    />
  );
}
