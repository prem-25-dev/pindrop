'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

export type Mood = 'idle' | 'thinking' | 'happy' | 'sad';

/**
 * A clay blob character (our own design, for players and bots). The body colour identifies the
 * player; the face reacts: wide eyes while thinking, a grin when right, a frown when wrong.
 * The full mix-and-match avatar editor arrives with accounts.
 */
export function Avatar({ color, size = 40, mood = 'idle', label, hat, glasses }: { color: string; size?: number; mood?: Mood; label?: string; hat?: string | null; glasses?: string | null }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReducedMotion();
  const mouth =
    mood === 'happy' ? 'M13 23 Q20 30 27 23' : mood === 'sad' ? 'M14 27 Q20 22 26 27' : mood === 'thinking' ? 'M17 25 h6' : 'M15 24 Q20 27.5 25 24';
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      animate={reduce ? undefined : mood === 'happy' ? { y: [0, -4, 0], rotate: [0, -6, 6, 0] } : mood === 'sad' ? { rotate: [0, -4, 0] } : { y: 0, rotate: 0 }}
      transition={{ duration: 0.6 }}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={`b${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="38.5" rx="11" ry="2" fill="#000" opacity=".18" />
      <path d="M20 3C30 3 36 10 36 20c0 10.5-6.5 17-16 17S4 30.5 4 20C4 10 10 3 20 3Z" fill={`url(#b${id})`} />
      <path d="M20 3C30 3 36 10 36 20c0 10.5-6.5 17-16 17S4 30.5 4 20C4 10 10 3 20 3Z" fill={`url(#s${id})`} />
      <ellipse cx="14" cy="10" rx="4" ry="2.2" transform="rotate(-30 14 10)" fill="#fff" opacity=".5" />
      {/* eyes */}
      {mood === 'happy' ? (
        <path d="M11.5 17.5 q2.5 -3 5 0 M23.5 17.5 q2.5 -3 5 0" fill="none" stroke="#1f1a33" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="14" cy="17" rx={mood === 'thinking' ? 3.4 : 3} ry={mood === 'thinking' ? 3.9 : 3.5} fill="#fff" />
          <ellipse cx="26" cy="17" rx={mood === 'thinking' ? 3.4 : 3} ry={mood === 'thinking' ? 3.9 : 3.5} fill="#fff" />
          <circle cx={mood === 'thinking' ? 15 : 14.6} cy={mood === 'thinking' ? 16 : 17.6} r="1.7" fill="#1f1a33" />
          <circle cx={mood === 'thinking' ? 27 : 26.6} cy={mood === 'thinking' ? 16 : 17.6} r="1.7" fill="#1f1a33" />
        </>
      )}
      <ellipse cx="9.5" cy="23" rx="2.2" ry="1.3" fill="#ff8fb1" opacity=".6" />
      <ellipse cx="30.5" cy="23" rx="2.2" ry="1.3" fill="#ff8fb1" opacity=".6" />
      <path d={mouth} fill="none" stroke="#1f1a33" strokeWidth="1.8" strokeLinecap="round" />
      {glasses && <Glasses kind={glasses} />}
      {hat && <Hat kind={hat} />}
    </motion.svg>
  );
}

/* ---------------- wearables (drawn in the same 40×40 box, may reach above it) ---------------- */

const OUT = '#1f1a33';

function Glasses({ kind }: { kind: string }) {
  switch (kind) {
    case 'round':
      return (
        <g fill="rgba(255,255,255,.18)" stroke={OUT} strokeWidth="1.5">
          <circle cx="14" cy="17" r="4.6" />
          <circle cx="26" cy="17" r="4.6" />
          <path d="M18.6 16.6 Q20 15.4 21.4 16.6 M9.4 16 L5 14.5 M30.6 16 L35 14.5" fill="none" />
        </g>
      );
    case 'shades':
      return (
        <g>
          <path d="M8.5 13.5 h11 v3.5 a4.5 4.5 0 0 1 -11 0 Z M20.5 13.5 h11 v3.5 a4.5 4.5 0 0 1 -11 0 Z" fill="#1d1f2b" />
          <path d="M19.5 14.6 h1 M8.5 14 L4.8 12.8 M31.5 14 L35.2 12.8" stroke="#1d1f2b" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10.5 15 l3 0 M22.5 15 l3 0" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".55" />
        </g>
      );
    case 'star': {
      const star = (cx: number, cy: number) => {
        const pts = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 ? 2.6 : 6;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
        }).join(' ');
        return <polygon points={pts} fill="#ff6fae" stroke="#c23a7c" strokeWidth="1" strokeLinejoin="round" />;
      };
      return (
        <g>
          {star(14, 17)}
          {star(26, 17)}
          <circle cx="14" cy="17" r="2" fill="#2b2140" opacity=".8" />
          <circle cx="26" cy="17" r="2" fill="#2b2140" opacity=".8" />
        </g>
      );
    }
    case 'monocle':
      return (
        <g fill="none" stroke="#c9962a" strokeWidth="1.6">
          <circle cx="26" cy="17" r="4.8" fill="rgba(255,255,255,.2)" />
          <path d="M29.5 20.5 Q33 26 31 31" strokeWidth="1" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ kind }: { kind: string }) {
  switch (kind) {
    case 'cap':
      return (
        <g>
          <path d="M8 10 C8 1 32 1 32 10 Z" fill="#e0473f" stroke="#a8261f" strokeWidth="1" />
          <path d="M28 9.5 C34 9 39 10 40 11.5 C36 12.5 31 12 28 11.2 Z" fill="#c9352d" />
          <circle cx="20" cy="2.4" r="1.4" fill="#a8261f" />
          <path d="M13 4 C15 2.6 18 2.2 20 2.3" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M8.5 9.5 C8.5 -1 31.5 -1 31.5 9.5 Z" fill="#2fa3a0" />
          <rect x="7.5" y="7.5" width="25" height="4.6" rx="2.3" fill="#23807e" />
          <path d="M12 8 v4 M16 8 v4 M20 8 v4 M24 8 v4 M28 8 v4" stroke="#1b6866" strokeWidth=".8" />
          <circle cx="20" cy="-1" r="3" fill="#f2c14e" />
        </g>
      );
    case 'party':
      return (
        <g transform="rotate(-12 20 4)">
          <path d="M20 -13 L28.5 6 L11.5 6 Z" fill="#8e6cf0" stroke="#6a48c8" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M17.6 -7.5 L22.4 -7.5 M15.6 -2.3 L24.4 -2.3 M13.6 2.8 L26.4 2.8" stroke="#ffd25e" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="20" cy="-13.5" r="2.4" fill="#ff6fae" />
        </g>
      );
    case 'beret':
      return (
        <g transform="rotate(-10 20 5)">
          <ellipse cx="20" cy="5" rx="14" ry="5.2" fill="#c2412f" />
          <ellipse cx="18" cy="3.6" rx="8" ry="2" fill="#fff" opacity=".18" />
          <path d="M20 -0.5 v-2.6" stroke="#8f2a1e" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'explorer':
      return (
        <g>
          <ellipse cx="20" cy="8.6" rx="18" ry="3.6" fill="#b88d55" />
          <path d="M10 8.5 C10 -2 30 -2 30 8.5 Z" fill="#d1aa72" />
          <rect x="10" y="5" width="20" height="2.8" fill="#6b4a26" />
          <path d="M14 1.5 C16 0 19 -0.6 21 -0.5" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'graduate':
      return (
        <g>
          <path d="M11 6 C11 10 29 10 29 6 L29 3 L11 3 Z" fill="#2b2f4a" />
          <path d="M20 -4 L37 1.5 L20 7 L3 1.5 Z" fill="#363b5c" stroke="#1d2036" strokeWidth=".8" strokeLinejoin="round" />
          <circle cx="20" cy="1.5" r="1.2" fill="#f2c14e" />
          <path d="M20 1.5 L33 4 L33 11" stroke="#f2c14e" strokeWidth="1" fill="none" />
          <circle cx="33" cy="11.5" r="1.4" fill="#f2c14e" />
        </g>
      );
    case 'tophat':
      return (
        <g>
          <ellipse cx="20" cy="6.8" rx="14" ry="3" fill="#1e2030" />
          <path d="M13 6.5 L14 -11 L26 -11 L27 6.5 Z" fill="#2b2e44" />
          <rect x="13.4" y="1" width="13.2" height="3" fill="#c2412f" />
          <ellipse cx="20" cy="-11" rx="6" ry="1.5" fill="#3a3e5a" />
          <path d="M16 -8 v7" stroke="#fff" strokeOpacity=".2" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M9 9 L8 -3 L14 3 L20 -6 L26 3 L32 -3 L31 9 Z" fill="#f2c14e" stroke="#b8861e" strokeWidth="1" strokeLinejoin="round" />
          <rect x="9" y="6.5" width="22" height="3" rx="1.2" fill="#e0a21b" />
          <circle cx="20" cy="3" r="1.8" fill="#e0473f" />
          <circle cx="13.5" cy="5" r="1.3" fill="#3c6ad3" />
          <circle cx="26.5" cy="5" r="1.3" fill="#2f9a62" />
          <circle cx="8" cy="-3.4" r="1.3" fill="#f2c14e" />
          <circle cx="20" cy="-6.4" r="1.3" fill="#f2c14e" />
          <circle cx="32" cy="-3.4" r="1.3" fill="#f2c14e" />
        </g>
      );
    default:
      return null;
  }
}
