'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { BotAnswer } from '@/lib/bot';
import type { CountryIndexItem } from '@/lib/countries';
import { ClayFlag } from '../ClayFlag';
import { play } from '@/lib/sound';

export interface RoundResult {
  code: string;
  correct: boolean;
  points: number;
  /** what the player answered: typed text, picked country name, or tapped country */
  answer: string | null;
  km?: number;
  ms: number;
  /** each bot's answer to the same question (same order as the bots at the table) */
  bots?: BotAnswer[];
  /** typed answers: how many guesses it took */
  tries?: number;
}

/** per-question countdown; returns time left (ms). Calls onExpire once when it hits zero. */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void) {
  const [left, setLeft] = useState(seconds * 1000);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!seconds || !running) return;
    // wall-clock based, ticked by an interval (animation frames stop when the window loses focus)
    const end = Date.now() + left;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      clearInterval(iv);
      setLeft(0);
      expire.current();
    };
    const iv = setInterval(() => {
      const l = Math.max(0, end - Date.now());
      if (l <= 0) fire();
      else setLeft(l);
    }, 100);
    const to = setTimeout(fire, left + 30);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, running]);
  return left;
}

export function TimerBar({ left, total }: { left: number; total: number }) {
  const f = total ? left / total : 1;
  const secs = Math.ceil(left / 1000);
  // a soft tick for each of the last three seconds
  useEffect(() => {
    if (left > 0 && secs <= 3) play('tick');
    // once per second, not per frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs]);
  const low = f <= 0.33;
  return (
    <div className="flex w-full items-center gap-2.5" role="timer" aria-label={`${secs} seconds left`}>
      <span
        className="clay grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black tabular-nums"
        data-elev="1"
        style={{ color: low ? 'var(--bad)' : 'var(--ink)' }}
        aria-hidden
      >
        {secs}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink)_10%,transparent)]">
        <div className="h-full rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${f * 100}%`, background: low ? 'var(--bad)' : 'var(--c4)' }} />
      </div>
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
    <ClayFlag src={c.flag} alt="The flag to identify" depth={9} className={className} />
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
