'use client';
import { useId } from 'react';
import type { WorldShapes } from '@/lib/geo';
import { ClayRelief } from '../passport/Book';

/** A country's outline (its main landmass), pressed out of clay. Used by the Silhouette game. */
export function CountryShape({ code, world, className = '', color = 'var(--accent)' }: { code: string; world: WorldShapes; className?: string; color?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = world.shapes.find((v) => v.code === code);
  if (!s) return null;
  const [[x0, y0], [x1, y1]] = s.box;
  // map units are tiny (a country can be 10 units across); scale up so the clay filter's
  // blur and shadow sizes read the same for every country
  const k = 240 / Math.max(x1 - x0, y1 - y0);
  const w = (x1 - x0) * k;
  const h = (y1 - y0) * k;
  const pad = Math.max(w, h) * 0.08;
  const vx = x0 * k - pad;
  const vy = y0 * k - pad;
  return (
    <svg viewBox={`${vx} ${vy} ${w + pad * 2} ${h + pad * 2}`} className={`block overflow-visible ${className}`} role="img" aria-label="The outline of a country" preserveAspectRatio="xMidYMid meet">
      <defs>
        <ClayRelief id={`r${id}`} soft={2.2} depth={4} />
        <linearGradient id={`g${id}`} x1="0" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".15" />
        </linearGradient>
        {/* far-off islands of the same country stay out of the frame */}
        <clipPath id={`c${id}`}>
          <rect x={vx - pad} y={vy - pad} width={w + pad * 4} height={h + pad * 4} />
        </clipPath>
      </defs>
      <g filter={`url(#r${id})`}>
        <g clipPath={`url(#c${id})`}>
          <g transform={`scale(${k})`}>
            <path d={s.d} fill={color} />
            <path d={s.d} fill={`url(#g${id})`} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** a shape too small to recognise at a glance (micro-states, single small islands) */
export const tooSmallForShape = (world: WorldShapes, code: string) => {
  const s = world.shapes.find((v) => v.code === code);
  if (!s) return true;
  const [[x0, y0], [x1, y1]] = s.box;
  return Math.max(x1 - x0, y1 - y0) < 2.2;
};
