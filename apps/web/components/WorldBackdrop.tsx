'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

type Land = { w: number; h: number; d: string };

let landCache: Promise<Land> | null = null;
const loadLand = () =>
  (landCache ??= fetch('/data/manifest.json')
    .then((r) => r.json())
    .then((m: { version: string }) => fetch(`/data/${m.version}/world-land.json`))
    .then((r) => r.json()));

/**
 * The wallpaper's world map: continents raised in clay, molded from the same
 * material as the cards (light top-left edge, shaded bottom-right edge, soft cast shadow).
 * Purely decorative.
 */
export function WorldBackdrop() {
  const [land, setLand] = useState<Land | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    loadLand()
      .then((l) => alive && setLand(l))
      .catch(() => {
        landCache = null;
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!land) return null;
  const { w, h, d } = land;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] flex items-center justify-center overflow-hidden">
      <motion.svg
        viewBox={`0 0 ${w} ${h}`}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-[260vw] max-w-none translate-x-[8%] -translate-y-[24vh] sm:w-[140vw] sm:translate-x-0 sm:-translate-y-[8vh] lg:w-[min(1700px,118vw)]"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="land-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w * 0.6} y2={h}>
            <stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--surface) 80%, white)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--surface)' }} />
            <stop offset="1" style={{ stopColor: 'var(--surface-2)' }} />
          </linearGradient>
          <filter id="land-clay" x="-5%" y="-5%" width="110%" height="115%" colorInterpolationFilters="sRGB">
            {/* inner shadows, clipped to the land */}
            <feComponentTransfer in="SourceAlpha" result="inv">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur in="inv" stdDeviation="2.6" result="blur" />
            <feOffset in="blur" dx="-2.4" dy="-2.8" result="dk" />
            <feFlood style={{ floodColor: 'var(--clay-lo)' }} />
            <feComposite in2="dk" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="shadeDark" />
            <feOffset in="blur" dx="2" dy="2.4" result="lt" />
            <feFlood style={{ floodColor: 'var(--clay-hi)' }} />
            <feComposite in2="lt" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="shadeLight" />
            {/* cast shadow onto the wallpaper */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="castBlur" />
            <feOffset in="castBlur" dx="0" dy="6" result="castOff" />
            <feFlood style={{ floodColor: 'var(--clay-drop)' }} />
            <feComposite in2="castOff" operator="in" result="cast" />
            <feMerge>
              <feMergeNode in="cast" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shadeDark" />
              <feMergeNode in="shadeLight" />
            </feMerge>
          </filter>
        </defs>
        <path d={d} fill="url(#land-fill)" filter="url(#land-clay)" />
      </motion.svg>
    </div>
  );
}
