import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';
import logoMarkLight from '../../assets/logo-mark-light.svg';
import logoMarkDark from '../../assets/logo-mark-dark.svg';
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

/**
 * Icon-only FrameBase mark (the squircle glyph without the wordmark) used by
 * the collapsed sidebar rail. Sourced from the same brand SVGs, cropped to the
 * 500×500 mark box, so both states stay visually identical.
 */
export function LogoMark({ className }: LogoProps) {
  const resolved = useThemeStore((s) => s.resolved);

  return (
    <img
      src={resolved === 'dark' ? logoMarkDark : logoMarkLight}
      alt="FrameBase"
      draggable={false}
      className={className ?? 'h-8 w-8'}
    />
  );
}
