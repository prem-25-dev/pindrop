'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { CountryIndexItem } from '@/lib/countries';

export interface RoundResult {
  code: string;
  correct: boolean;
  points: number;
  /** what the player answered: typed text, picked country name, or tapped country */
  answer: string | null;
  km?: number;
  ms: number;
}

/** per-question countdown; returns time left (ms). Calls onExpire once when it hits zero. */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void) {
  const [left, setLeft] = useState(seconds * 1000);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!seconds || !running) return;
    const end = performance.now() + left;
    let raf = 0;
    let fired = false;
    const tick = () => {
      const l = Math.max(0, end - performance.now());
      setLeft(l);
      if (l <= 0 && !fired) {
        fired = true;
        expire.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // keep counting if the tab hides (rAF pauses): a timeout as a fallback
    const to = setTimeout(() => !fired && ((fired = true), setLeft(0), expire.current()), left + 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, running]);
  return left;
}

export function TimerBar({ left, total }: { left: number; total: number }) {
  const f = total ? left / total : 1;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink)_10%,transparent)]" role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <div className="h-full rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${f * 100}%`, background: f > 0.33 ? 'var(--c4)' : 'var(--bad)' }} />
    </div>
  );
}

const COLORS = ['#FFC93C', '#FF5A5F', '#3CCB7F', '#4AA8FF', '#B07BFF', '#FF8A3D'];
export function Confetti({ fire }: { fire: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      {fire > 0 && (
        <div key={fire} className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          {Array.from({ length: 22 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-3 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: Math.cos((i / 22) * Math.PI * 2) * (110 + (i % 3) * 30), y: Math.sin((i / 22) * Math.PI * 2) * (80 + (i % 4) * 20) - 30, opacity: 0, rotate: 360 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/** a frameless flag with a clay sheen; 4:3 so every flag is the same size */
export function Flag({ c, className = '' }: { c: CountryIndexItem; className?: string }) {
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${className}`} style={{ boxShadow: '0 18px 30px -14px var(--clay-drop), 0 3px 8px var(--clay-drop-2)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.flag} alt="The flag to identify" className="block h-full w-full" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,.25) 0%, transparent 38%, transparent 62%, rgba(0,0,0,.14) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)' }}
      />
    </div>
  );
}

export function Feedback({ result, country, extra, onNext, nextLabel = 'Next', title, partial }: { result: RoundResult; country: CountryIndexItem; extra?: string; onNext: () => void; nextLabel?: string; title?: string; /** a near miss that still scored well: amber, not red */ partial?: boolean }) {
  const tone = result.correct ? 'var(--c4)' : partial ? 'var(--warn-deep)' : 'var(--bad)';
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{ background: `color-mix(in oklab, ${tone} 14%, var(--surface))` }}
      role="status"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={country.flagSquare} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
        <div>
          <p className="text-base font-black" style={{ color: tone }}>
            {title ?? (result.correct ? 'Correct!' : result.answer ? `Not quite: ${result.answer}` : 'Time is up')}
          </p>
          <p className="text-sm font-bold text-[var(--ink-2)]">
            {result.correct ? country.name : `It was ${country.name}`}
            {extra ? ` · ${extra}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-black tabular-nums">+{result.points.toLocaleString('en')}</span>
        <button ref={btn} onClick={onNext} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2 text-sm font-black">
          {nextLabel} →
        </button>
      </div>
    </motion.div>
  );
}
