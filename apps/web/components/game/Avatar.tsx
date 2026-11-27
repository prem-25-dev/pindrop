'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

export type Mood = 'idle' | 'thinking' | 'happy' | 'sad';

/**
 * A clay blob character (our own design, for players and bots). The body colour identifies the
 * player; the face reacts: wide eyes while thinking, a grin when right, a frown when wrong.
 * The full mix-and-match avatar editor arrives with accounts.
 */
export function Avatar({ color, size = 40, mood = 'idle', label }: { color: string; size?: number; mood?: Mood; label?: string }) {
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
    </motion.svg>
  );
}
