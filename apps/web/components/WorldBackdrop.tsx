'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Continent = { id: 'na' | 'sa' | 'eu' | 'af' | 'as' | 'oc'; name: string; d: string };
type World = { w: number; h: number; continents: Continent[] };

let cache: Promise<World> | null = null;
const loadWorld = () =>
  (cache ??= fetch('/data/manifest.json')
    .then((r) => r.json())
    .then((m: { version: string }) => fetch(`/data/${m.version}/world-continents.json`))
    .then((r) => r.json()));

/** Each continent floats on its own rhythm and sits at its own depth for the pointer parallax. */
const MOTION: Record<Continent['id'], { dur: number; delay: number; fx: number; fy: number; depth: number }> = {
  na: { dur: 13, delay: 0, fx: 2, fy: -6, depth: 10 },
  sa: { dur: 11, delay: -3, fx: -2, fy: -5, depth: 14 },
  eu: { dur: 12, delay: -6, fx: 1.5, fy: -4, depth: 7 },
  af: { dur: 14, delay: -2, fx: -1.5, fy: -6, depth: 12 },
  as: { dur: 15, delay: -8, fx: 2, fy: -5, depth: 9 },
  oc: { dur: 10, delay: -4, fx: -2, fy: -7, depth: 16 },
};

/**
 * The wallpaper's world map: six clay continents, each in its own colour, molded with
 * inner shadows and a soft cast shadow. They drift gently and shift a little with the pointer.
 * Purely decorative.
 */
export function WorldBackdrop() {
  const [world, setWorld] = useState<World | null>(null);
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadWorld()
      .then((w) => alive && setWorld(w))
      .catch(() => {
        cache = null;
      });
    return () => {
      alive = false;
    };
  }, []);

  // pointer parallax: write -1..1 into CSS vars, at most once per frame
  useEffect(() => {
    if (reduce || !world) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = box.current;
        if (!el) return;
        el.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce, world]);

  if (!world) return null;
  const { w, h, continents } = world;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] flex items-center justify-center overflow-hidden">
      <div
        ref={box}
        className="relative w-[260vw] max-w-none shrink-0 translate-x-[8%] -translate-y-[24vh] sm:w-screen sm:translate-x-0 sm:-translate-y-[2vh]"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {continents.map((c, i) => {
          const m = MOTION[c.id];
          const id = `land-${c.id}`;
          const color = `var(--land-${c.id})`;
          return (
            <motion.div
              key={c.id}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="continent-parallax absolute inset-0" style={{ '--depth': `${m.depth}px` } as CSSProperties}>
              <div
                className="continent-float absolute inset-0"
                style={{ '--fdur': `${m.dur}s`, '--fdelay': `${m.delay}s`, '--fx': `${m.fx}px`, '--fy': `${m.fy}px` } as CSSProperties}
              >
                <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w * 0.35} y2={h}>
                      <stop offset="0" style={{ stopColor: `color-mix(in oklab, ${color}, white calc(var(--land-lift) * 100%))` }} />
                      <stop offset="0.55" style={{ stopColor: color }} />
                      <stop offset="1" style={{ stopColor: `color-mix(in oklab, ${color} 86%, black)` }} />
                    </linearGradient>
                    <filter id={`${id}-clay`} x="-5%" y="-5%" width="110%" height="118%" colorInterpolationFilters="sRGB">
                      <feComponentTransfer in="SourceAlpha" result="inv">
                        <feFuncA type="table" tableValues="1 0" />
                      </feComponentTransfer>
                      <feGaussianBlur in="inv" stdDeviation="2.4" result="blur" />
                      <feOffset in="blur" dx="-2.2" dy="-2.6" result="dk" />
                      <feFlood style={{ floodColor: 'var(--land-lo)' }} />
                      <feComposite in2="dk" operator="in" />
                      <feComposite in2="SourceAlpha" operator="in" result="shadeDark" />
                      <feOffset in="blur" dx="1.8" dy="2.2" result="lt" />
                      <feFlood style={{ floodColor: 'var(--land-hi)' }} />
                      <feComposite in2="lt" operator="in" />
                      <feComposite in2="SourceAlpha" operator="in" result="shadeLight" />
                      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="castBlur" />
                      <feOffset in="castBlur" dx="0" dy="7" result="castOff" />
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
                  <path d={c.d} fill={`url(#${id}-fill)`} filter={`url(#${id}-clay)`} />
                </svg>
              </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
