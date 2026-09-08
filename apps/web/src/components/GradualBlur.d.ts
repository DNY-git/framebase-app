import type { ComponentType, CSSProperties } from 'react';

export interface GradualBlurProps {
  target?: 'parent' | 'page';
  position?: 'top' | 'bottom' | 'left' | 'right';
  height?: string;
  width?: string;
  strength?: number;
  divCount?: number;
  curve?: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';
  exponential?: boolean;
  opacity?: number;
  zIndex?: number;
  animated?: boolean | 'scroll';
  duration?: string;
  easing?: string;
  hoverIntensity?: number;
  responsive?: boolean;
  preset?: string;
  className?: string;
  style?: CSSProperties;
  onAnimationComplete?: () => void;
  [key: string]: unknown;
}

declare const GradualBlur: ComponentType<GradualBlurProps>;

export default GradualBlur;
