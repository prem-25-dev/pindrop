'use client';
import { forwardRef, type HTMLAttributes, type PointerEvent } from 'react';

export type Elevation = 0 | 1 | 2 | 3 | 4;

export interface ClaySurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elev?: Elevation;
  /** Soft highlight that follows the pointer */
  light?: boolean;
  /** Lifts on hover and sinks on press */
  interactive?: boolean;
  radius?: 'sm' | 'md' | 'lg' | 'xl';
}

const radii = { sm: 'var(--radius-sm)', md: 'var(--radius)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)' };

function trackLight(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export const ClaySurface = forwardRef<HTMLDivElement, ClaySurfaceProps>(function ClaySurface(
  { elev = 2, light, interactive, radius = 'md', className = '', style, onPointerMove, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-elev={elev}
      data-light={light ? '' : undefined}
      className={`clay ${interactive ? 'clay-interactive' : ''} ${className}`}
      style={{ borderRadius: radii[radius], ...style }}
      onPointerMove={(e) => {
        if (light) trackLight(e);
        onPointerMove?.(e);
      }}
      {...rest}
    />
  );
});

export { trackLight };
