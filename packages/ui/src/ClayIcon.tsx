'use client';
import { useId, type ReactNode } from 'react';

/**
 * 3D clay app icons (macOS-style rounded squares, made of clay).
 * Glossy colored base + puffy cream glyph with a soft drop shadow.
 * Pure SVG: crisp at any size, no image downloads.
 */

type Palette = { a: string; b: string; deep: string };

const P = {
  peach: { a: '#ffb08a', b: '#f2673a', deep: '#c94a20' },
  lilac: { a: '#bcaefc', b: '#7a63e8', deep: '#5a43c4' },
  sky: { a: '#9fd8ff', b: '#3d9bf0', deep: '#2274c4' },
  mint: { a: '#93e9c6', b: '#2fb886', deep: '#1c8c63' },
  sun: { a: '#ffe08a', b: '#f5a623', deep: '#c47d0e' },
  rose: { a: '#ffb0c2', b: '#f0587d', deep: '#c43a5d' },
  ink: { a: '#6d6a8a', b: '#3b3955', deep: '#24233a' },
} satisfies Record<string, Palette>;

export type ClayIconName =
  | 'home' | 'explore' | 'flag' | 'pin' | 'region' | 'party' | 'passport' | 'trophy'
  | 'profile' | 'search' | 'settings' | 'daily' | 'silhouette' | 'hop' | 'rarity' | 'play';

const GLYPH = '#fffaf4';
const GLYPH_SHADE = '#f1e6da';

const icons: Record<ClayIconName, { pal: Palette; glyph: (deep: string) => ReactNode }> = {
  home: {
    pal: P.sky,
    glyph: (d) => (
      <>
        <path d="M17 31.5 30.2 19.6a2.7 2.7 0 0 1 3.6 0L47 31.5V45a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z" />
        <rect x="27.5" y="36" width="9" height="13" rx="3" fill={d} opacity=".55" />
      </>
    ),
  },
  explore: {
    pal: P.mint,
    glyph: (d) => (
      <>
        <circle cx="32" cy="32" r="15" />
        <g fill="none" stroke={d} strokeWidth="2.2" opacity=".45" strokeLinecap="round">
          <ellipse cx="32" cy="32" rx="6.5" ry="15" />
          <path d="M17.6 27h28.8M17.6 37h28.8" />
        </g>
        <path d="M24 22c3 2 5 5 3 8s1 6 5 6 3 5 1 8" fill="none" stroke={d} strokeWidth="2.6" opacity=".22" strokeLinecap="round" />
      </>
    ),
  },
  flag: {
    pal: P.peach,
    glyph: (d) => (
      <>
        <rect x="18" y="14" width="5" height="37" rx="2.5" />
        <path d="M23 17.5c5.5-3 10 3 15.5 0s7-1.5 7-1.5v15s-1.5-1.5-7 1.5-10-3-15.5 0z" />
        <circle cx="34" cy="24.5" r="3" fill={d} opacity=".5" />
      </>
    ),
  },
  pin: {
    pal: P.rose,
    glyph: (d) => (
      <>
        <path d="M32 13.5c-7.9 0-14 6-14 13.6C18 37.4 32 50.5 32 50.5S46 37.4 46 27.1c0-7.6-6.1-13.6-14-13.6Z" />
        <circle cx="32" cy="27.5" r="5" fill={d} opacity=".6" />
      </>
    ),
  },
  region: {
    pal: P.lilac,
    glyph: (d) => (
      <>
        <circle cx="32" cy="32" r="16" />
        <circle cx="32" cy="32" r="10.5" fill={d} opacity=".35" />
        <circle cx="32" cy="32" r="5.5" />
      </>
    ),
  },
  party: {
    pal: P.sun,
    glyph: (d) => (
      <>
        <path d="M26 41c-1 4 1 7-1 10M39 39c1 4-1 7 1 11" fill="none" stroke={GLYPH} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="25" cy="27" rx="8.5" ry="10.5" />
        <ellipse cx="39.5" cy="26" rx="8" ry="10" fill={d} opacity=".55" />
        <path d="M23.5 37.5h3l-1.5 2.5zM38 36h3l-1.5 2.5z" />
      </>
    ),
  },
  passport: {
    pal: P.lilac,
    glyph: (d) => (
      <>
        <rect x="19" y="14" width="26" height="36" rx="5" />
        <circle cx="32" cy="29" r="7" fill="none" stroke={d} strokeWidth="2.4" opacity=".5" />
        <path d="M25 29h14M32 22c-2.5 3-2.5 11 0 14M32 22c2.5 3 2.5 11 0 14" fill="none" stroke={d} strokeWidth="1.8" opacity=".5" />
        <rect x="25" y="41" width="14" height="3" rx="1.5" fill={d} opacity=".4" />
      </>
    ),
  },
  trophy: {
    pal: P.sun,
    glyph: (d) => (
      <>
        <path d="M22 16h20v8a10 10 0 0 1-20 0z" />
        <path d="M22 19h-4a4 4 0 0 0 4 7M42 19h4a4 4 0 0 1-4 7" fill="none" stroke={GLYPH} strokeWidth="3" strokeLinecap="round" />
        <rect x="29.5" y="33" width="5" height="8" rx="1.5" />
        <rect x="23" y="41" width="18" height="7" rx="3" />
        <path d="M32 20.5l1.4 2.8 3 .4-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z" fill={d} opacity=".5" />
      </>
    ),
  },
  profile: {
    pal: P.sky,
    glyph: (d) => (
      <>
        <path d="M32 14c9.5 0 16 6.8 16 16.2C48 41 41.3 50 32 50s-16-9-16-19.8C16 20.8 22.5 14 32 14Z" />
        <ellipse cx="26.5" cy="30" rx="2.4" ry="3.2" fill={d} opacity=".75" />
        <ellipse cx="37.5" cy="30" rx="2.4" ry="3.2" fill={d} opacity=".75" />
        <path d="M27 38c3 3 7 3 10 0" fill="none" stroke={d} strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
        <circle cx="22" cy="35" r="2.6" fill="#ff8aa6" opacity=".55" />
        <circle cx="42" cy="35" r="2.6" fill="#ff8aa6" opacity=".55" />
      </>
    ),
  },
  search: {
    pal: P.lilac,
    glyph: () => (
      <>
        <circle cx="29" cy="29" r="10" fill="none" stroke={GLYPH} strokeWidth="6" />
        <rect x="36.5" y="36" width="7" height="15" rx="3.5" transform="rotate(-45 40 43.5)" />
      </>
    ),
  },
  settings: {
    pal: P.ink,
    glyph: (d) => (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="28.5" y="13" width="7" height="10" rx="3" transform={`rotate(${i * 45} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="12.5" />
        <circle cx="32" cy="32" r="5" fill={d} opacity=".6" />
      </>
    ),
  },
  daily: {
    pal: P.peach,
    glyph: (d) => (
      <>
        <rect x="16" y="18" width="32" height="30" rx="6" />
        <path d="M16 24a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v3H16z" fill={d} opacity=".55" />
        <rect x="22" y="13" width="4" height="9" rx="2" />
        <rect x="38" y="13" width="4" height="9" rx="2" />
        <path d="M27 38l3.5 3.5L38 34" fill="none" stroke={d} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
      </>
    ),
  },
  silhouette: {
    pal: P.ink,
    glyph: () => (
      <path d="M20 22c4-6 10-5 13-2s7 1 9 4-1 6 2 9 1 9-4 10-7-2-11 0-9 1-10-4 2-6-1-9-2-6 2-8Z" />
    ),
  },
  hop: {
    pal: P.mint,
    glyph: (d) => (
      <>
        <path d="M21 41c3-12 19-12 22-20" fill="none" stroke={GLYPH} strokeWidth="3" strokeDasharray="1 6" strokeLinecap="round" />
        <circle cx="20" cy="42" r="6" />
        <circle cx="44" cy="20" r="6" />
        <circle cx="20" cy="42" r="2.3" fill={d} opacity=".6" />
        <circle cx="44" cy="20" r="2.3" fill={d} opacity=".6" />
      </>
    ),
  },
  rarity: {
    pal: P.rose,
    glyph: (d) => (
      <>
        <path d="M32 14l15 12-15 24-15-24z" />
        <path d="M17 26h30M26 26l6 24 6-24M26 26l6-12 6 12" fill="none" stroke={d} strokeWidth="1.8" opacity=".4" strokeLinejoin="round" />
      </>
    ),
  },
  play: {
    pal: P.peach,
    glyph: () => <path d="M25 17.5c0-2.3 2.5-3.7 4.5-2.5l17 10.5c1.9 1.2 1.9 3.8 0 5L29.5 41c-2 1.2-4.5-.2-4.5-2.5z" transform="translate(-2 4)" />,
  },
};

export function ClayIcon({ name, size = 56, className = '', title }: { name: ClayIconName; size?: number; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const { pal, glyph } = icons[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      style={{ filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.1}px ${pal.deep}55)`, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={pal.a} />
          <stop offset="1" stopColor={pal.b} />
        </linearGradient>
        <radialGradient id={`h${uid}`} cx=".28" cy=".18" r=".75">
          <stop offset="0" stopColor="#fff" stopOpacity=".65" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2=".4" y2="1">
          <stop offset="0" stopColor={GLYPH} />
          <stop offset="1" stopColor={GLYPH_SHADE} />
        </linearGradient>
        <filter id={`f${uid}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="1.6" floodColor={pal.deep} floodOpacity=".55" />
        </filter>
      </defs>
      {/* clay base */}
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#b${uid})`} />
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#s${uid})`} />
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#h${uid})`} />
      <rect x="4.2" y="4.2" width="55.6" height="55.6" rx="16" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      {/* puffy glyph */}
      <g fill={`url(#g${uid})`} filter={`url(#f${uid})`}>{glyph(pal.deep)}</g>
    </svg>
  );
}

export const clayIconNames = Object.keys(icons) as ClayIconName[];
