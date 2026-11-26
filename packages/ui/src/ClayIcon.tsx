'use client';
import { useId, type CSSProperties, type ReactNode } from 'react';

/**
 * 3D clay icons.
 *  - default: a macOS-style rounded tile in a palette colour with a puffy white glyph
 *  - bare:    just the glyph, molded from the same clay as the surfaces (no tile)
 * Colours come from the active palette's CSS roles, so icons follow palette + theme.
 * Details inside glyphs use `currentColor` (set to the role's deep shade).
 */

export type ClayRole = 'accent' | 'c2' | 'c3' | 'c4' | 'warn' | 'neutral';

export type ClayIconName =
  | 'home' | 'explore' | 'flag' | 'pin' | 'region' | 'party' | 'passport' | 'trophy'
  | 'profile' | 'search' | 'settings' | 'daily' | 'silhouette' | 'hop' | 'rarity' | 'play';

const W = '#ffffff';
const D = 'currentColor';

/** One continuous gear outline (8 teeth) so it reads as a single molded piece. */
const GEAR_PATH = (() => {
  const cx = 32, cy = 32, rOut = 21.5, rRoot = 16.5, teeth = 8;
  const pt = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  const step = 360 / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i ? 'L' : 'M'}${pt(rRoot, a - 13)} L${pt(rOut, a - 8)} L${pt(rOut, a + 8)} L${pt(rRoot, a + 13)} `;
  }
  return `${d}Z`;
})();

const icons: Record<ClayIconName, { role: ClayRole; glyph: ReactNode }> = {
  home: {
    role: 'c3',
    glyph: (
      <>
        <path d="M17 31.5 30.2 19.6a2.7 2.7 0 0 1 3.6 0L47 31.5V45a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z" />
        <rect x="27.5" y="36" width="9" height="13" rx="3" fill={D} opacity=".5" />
      </>
    ),
  },
  explore: {
    role: 'c4',
    glyph: (
      <>
        <circle cx="32" cy="32" r="15" />
        <g fill="none" stroke={D} strokeWidth="2.2" opacity=".45" strokeLinecap="round">
          <ellipse cx="32" cy="32" rx="6.5" ry="15" />
          <path d="M17.6 27h28.8M17.6 37h28.8" />
        </g>
      </>
    ),
  },
  flag: {
    role: 'accent',
    glyph: (
      <>
        <rect x="18" y="14" width="5" height="37" rx="2.5" />
        <path d="M23 17.5c5.5-3 10 3 15.5 0s7-1.5 7-1.5v15s-1.5-1.5-7 1.5-10-3-15.5 0z" />
        <circle cx="34" cy="24.5" r="3" fill={D} opacity=".45" />
      </>
    ),
  },
  pin: {
    role: 'accent',
    glyph: (
      <>
        <path d="M32 13.5c-7.9 0-14 6-14 13.6C18 37.4 32 50.5 32 50.5S46 37.4 46 27.1c0-7.6-6.1-13.6-14-13.6Z" />
        <circle cx="32" cy="27.5" r="5" fill={D} opacity=".55" />
      </>
    ),
  },
  region: {
    role: 'c2',
    glyph: (
      <>
        <circle cx="32" cy="32" r="16" />
        <circle cx="32" cy="32" r="10.5" fill={D} opacity=".3" />
        <circle cx="32" cy="32" r="5.5" />
      </>
    ),
  },
  party: {
    role: 'warn',
    glyph: (
      <>
        <path d="M26 41c-1 4 1 7-1 10M39 39c1 4-1 7 1 11" fill="none" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="25" cy="27" rx="8.5" ry="10.5" />
        <ellipse cx="39.5" cy="26" rx="8" ry="10" fill={D} opacity=".5" />
        <path d="M23.5 37.5h3l-1.5 2.5zM38 36h3l-1.5 2.5z" />
      </>
    ),
  },
  passport: {
    role: 'c3',
    glyph: (
      <>
        <rect x="19" y="14" width="26" height="36" rx="5" />
        <circle cx="32" cy="29" r="7" fill="none" stroke={D} strokeWidth="2.4" opacity=".5" />
        <path d="M25 29h14M32 22c-2.5 3-2.5 11 0 14M32 22c2.5 3 2.5 11 0 14" fill="none" stroke={D} strokeWidth="1.8" opacity=".5" />
        <rect x="25" y="41" width="14" height="3" rx="1.5" fill={D} opacity=".4" />
      </>
    ),
  },
  trophy: {
    role: 'warn',
    glyph: (
      <>
        <path d="M22 16h20v8a10 10 0 0 1-20 0z" />
        <path d="M22 19h-4a4 4 0 0 0 4 7M42 19h4a4 4 0 0 1-4 7" fill="none" stroke={W} strokeWidth="3" strokeLinecap="round" />
        <rect x="29.5" y="33" width="5" height="8" rx="1.5" />
        <rect x="23" y="41" width="18" height="7" rx="3" />
      </>
    ),
  },
  profile: {
    role: 'c2',
    glyph: (
      <>
        <path d="M32 14c9.5 0 16 6.8 16 16.2C48 41 41.3 50 32 50s-16-9-16-19.8C16 20.8 22.5 14 32 14Z" />
        <ellipse cx="26.5" cy="30" rx="2.4" ry="3.2" fill={D} opacity=".75" />
        <ellipse cx="37.5" cy="30" rx="2.4" ry="3.2" fill={D} opacity=".75" />
        <path d="M27 38c3 3 7 3 10 0" fill="none" stroke={D} strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
      </>
    ),
  },
  search: {
    role: 'neutral',
    glyph: (
      <>
        <circle cx="29" cy="29" r="10" fill="none" stroke={W} strokeWidth="6" />
        <rect x="36.5" y="36" width="7" height="15" rx="3.5" transform="rotate(-45 40 43.5)" />
      </>
    ),
  },
  settings: {
    role: 'neutral',
    glyph: (
      <>
        <path d={GEAR_PATH} />
        <circle cx="32" cy="32" r="5.6" fill={D} opacity=".55" />
      </>
    ),
  },
  daily: {
    role: 'accent',
    glyph: (
      <>
        <rect x="16" y="18" width="32" height="30" rx="6" />
        <path d="M16 24a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v3H16z" fill={D} opacity=".5" />
        <rect x="22" y="13" width="4" height="9" rx="2" />
        <rect x="38" y="13" width="4" height="9" rx="2" />
        <path d="M27 38l3.5 3.5L38 34" fill="none" stroke={D} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
      </>
    ),
  },
  silhouette: {
    role: 'neutral',
    glyph: <path d="M20 22c4-6 10-5 13-2s7 1 9 4-1 6 2 9 1 9-4 10-7-2-11 0-9 1-10-4 2-6-1-9-2-6 2-8Z" />,
  },
  hop: {
    role: 'c4',
    glyph: (
      <>
        <path d="M21 41c3-12 19-12 22-20" fill="none" stroke={W} strokeWidth="3" strokeDasharray="1 6" strokeLinecap="round" />
        <circle cx="20" cy="42" r="6" />
        <circle cx="44" cy="20" r="6" />
        <circle cx="20" cy="42" r="2.3" fill={D} opacity=".55" />
        <circle cx="44" cy="20" r="2.3" fill={D} opacity=".55" />
      </>
    ),
  },
  rarity: {
    role: 'c3',
    glyph: (
      <>
        <path d="M32 14l15 12-15 24-15-24z" />
        <path d="M17 26h30M26 26l6 24 6-24M26 26l6-12 6 12" fill="none" stroke={D} strokeWidth="1.8" opacity=".4" strokeLinejoin="round" />
      </>
    ),
  },
  play: {
    role: 'accent',
    glyph: <path d="M25 17.5c0-2.3 2.5-3.7 4.5-2.5l17 10.5c1.9 1.2 1.9 3.8 0 5L29.5 41c-2 1.2-4.5-.2-4.5-2.5z" transform="translate(-2 4)" />,
  },
};

const stop = (color: string, opacity?: number): CSSProperties => ({ stopColor: color, stopOpacity: opacity });

export function ClayIcon({
  name, size = 56, className = '', title, bare = false, role: roleOverride,
}: { name: ClayIconName; size?: number; className?: string; title?: string; bare?: boolean; role?: ClayRole }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { role: baseRole, glyph } = icons[name];
  const role = roleOverride ?? baseRole;
  const c = `var(--${role})`;
  const deep = `var(--${role}-deep)`;

  if (bare) {
    // Molded from the surface clay itself: the same material as cards, with real inner shadows
    // (light top-left, dark bottom-right), rounded edges and a soft cast shadow.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        className={className}
        style={{ color: 'var(--ink-3)', overflow: 'visible', filter: `drop-shadow(0 ${size * 0.07}px ${size * 0.08}px var(--clay-drop))` }}
      >
        <defs>
          <linearGradient id={`bb${uid}`} gradientUnits="userSpaceOnUse" x1="12" y1="10" x2="52" y2="54">
            <stop offset="0" style={stop('color-mix(in oklab, var(--surface) 72%, white)')} />
            <stop offset=".5" style={stop('var(--surface)')} />
            <stop offset="1" style={stop('color-mix(in oklab, var(--surface-2) 82%, black)')} />
          </linearGradient>
          {/* sunken hole: shading reversed */}
          <linearGradient id={`bs${uid}`} gradientUnits="userSpaceOnUse" x1="27" y1="27" x2="37" y2="37">
            <stop offset="0" style={stop('color-mix(in oklab, var(--surface-2) 70%, black)')} />
            <stop offset="1" style={stop('color-mix(in oklab, var(--surface) 80%, white)')} />
          </linearGradient>
          <filter id={`bi${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            {/* inverse alpha, blurred, offset → inner shadows clipped to the shape */}
            <feComponentTransfer in="SourceAlpha" result="inv">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur in="inv" stdDeviation="1.6" result="blur" />
            <feOffset in="blur" dx="-1.6" dy="-1.8" result="dk" />
            <feFlood floodColor="#000" floodOpacity="0.32" />
            <feComposite in2="dk" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="shadeDark" />
            <feOffset in="blur" dx="1.4" dy="1.6" result="lt" />
            <feFlood floodColor="#fff" floodOpacity="0.75" />
            <feComposite in2="lt" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="shadeLight" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shadeDark" />
              <feMergeNode in="shadeLight" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#bi${uid})`}>
          <g fill={`url(#bb${uid})`} stroke={`url(#bb${uid})`} strokeWidth="3.5" strokeLinejoin="round">
            {glyph}
          </g>
        </g>
        {name === 'settings' && <circle cx="32" cy="32" r="5.8" fill={`url(#bs${uid})`} />}
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      style={{
        color: deep,
        overflow: 'visible',
        filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.1}px color-mix(in oklab, ${deep} 38%, transparent))`,
      }}
    >
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop(`color-mix(in oklab, ${c} 72%, white)`)} />
          <stop offset=".6" style={stop(c)} />
          <stop offset="1" style={stop(deep)} />
        </linearGradient>
        <radialGradient id={`h${uid}`} cx=".28" cy=".16" r=".75">
          <stop offset="0" style={stop('#fff', 0.5)} />
          <stop offset=".45" style={stop('#fff', 0.1)} />
          <stop offset="1" style={stop('#fff', 0)} />
        </radialGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" style={stop('#000', 0)} />
          <stop offset="1" style={stop('#000', 0.16)} />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2=".4" y2="1">
          <stop offset="0" style={stop('#ffffff')} />
          <stop offset="1" style={stop(`color-mix(in oklab, white 86%, ${c})`)} />
        </linearGradient>
        <filter id={`f${uid}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" style={{ floodColor: deep, floodOpacity: 0.5 }} />
        </filter>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#b${uid})`} />
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#s${uid})`} />
      <rect x="3" y="3" width="58" height="58" rx="17" fill={`url(#h${uid})`} />
      <rect x="4.2" y="4.2" width="55.6" height="55.6" rx="16" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1.2" />
      <g fill={`url(#g${uid})`} filter={`url(#f${uid})`}>{glyph}</g>
    </svg>
  );
}

export const clayIconNames = Object.keys(icons) as ClayIconName[];
