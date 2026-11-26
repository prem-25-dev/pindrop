'use client';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useCountries, type CountryIndexItem } from '@/lib/countries';

// small deterministic RNG so everyone gets the same flag and choices today
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function pick(list: CountryIndexItem[], day: string) {
  const pool = list.filter((c) => c.un195);
  const r = rng(`flag-of-the-day:${day}`);
  const answer = pool[Math.floor(r() * pool.length)];
  const sameRegion = pool.filter((c) => c.region === answer.region && c.code !== answer.code);
  const others = (sameRegion.length >= 3 ? sameRegion : pool.filter((c) => c.code !== answer.code)).slice();
  const wrong: CountryIndexItem[] = [];
  while (wrong.length < 3 && others.length) wrong.push(others.splice(Math.floor(r() * others.length), 1)[0]);
  const choices = [answer, ...wrong];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { answer, choices };
}

function untilMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((+next - +now) / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const CONFETTI = ['#FFC93C', '#FF5A5F', '#3CCB7F', '#4AA8FF', '#B07BFF', '#FF8A3D'];

/** A one-question daily quiz right on the home page. */
export function FlagOfTheDay() {
  const list = useCountries();
  const reduce = useReducedMotion();
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const d = todayKey();
    setDay(d);
    try {
      setChosen(localStorage.getItem(`pinpoint-fotd-${d}`));
    } catch {
      /* storage blocked */
    }
    setClock(untilMidnight());
    const t = setInterval(() => setClock(untilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const q = useMemo(() => (list && list.length && day ? pick(list, day) : null), [list, day]);

  const choose = (code: string) => {
    if (chosen || !day) return;
    setChosen(code);
    try {
      localStorage.setItem(`pinpoint-fotd-${day}`, code);
    } catch {
      /* storage blocked: answer still shows for this visit */
    }
  };

  const done = !!chosen && !!q;
  const right = done && chosen === q!.answer.code;

  return (
    <div className="clay relative overflow-hidden p-5 sm:p-6" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="pill-accent rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider">Flag of the day</span>
        <span className="text-xs font-bold tabular-nums text-[var(--ink-3)]" aria-label={`Next flag in ${clock}`}>
          Next in {clock}
        </span>
      </div>

      {/* the flag in its real proportions, as wide as the card (tall flags are capped and centred) */}
      <div className="relative mt-5 flex justify-center">
        <motion.div
          initial={false}
          animate={done && !reduce ? (right ? { rotate: [0, 2, -1.5, 0], scale: [1, 1.04, 1] } : { x: [0, -8, 8, -5, 5, 0] }) : { rotate: 0 }}
          transition={{ duration: 0.6 }}
          className="clay rounded-2xl p-2"
          data-elev="2"
          // full card width; tall flags are capped at ~200px high so they never crop
          style={{ width: q ? `min(100%, ${Math.round(200 * q.answer.flagRatio) + 16}px)` : '100%' }}
        >
          <div className="overflow-hidden rounded-xl" style={{ aspectRatio: q ? String(q.answer.flagRatio) : '3 / 2' }}>
            {q ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.answer.flagTrue} alt="Today's mystery flag" className="block h-full w-full" />
            ) : (
              <div className="clay-well h-full w-full" />
            )}
          </div>
        </motion.div>
        <AnimatePresence>
          {right &&
            !reduce &&
            Array.from({ length: 18 }, (_, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-2 w-3 rounded-sm"
                style={{ background: CONFETTI[i % CONFETTI.length] }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: Math.cos((i / 18) * Math.PI * 2) * (90 + (i % 3) * 25), y: Math.sin((i / 18) * Math.PI * 2) * (70 + (i % 4) * 15) - 20, opacity: 0, rotate: 360 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
      </div>

      <p className="mt-5 text-center text-lg font-black tracking-tight">{done ? (right ? 'Spot on!' : 'So close!') : 'Can you name it?'}</p>

      <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="Choose the country">
        {(q?.choices ?? Array.from({ length: 4 }, () => null)).map((c, i) => {
          const isAnswer = !!c && done && c.code === q!.answer.code;
          const isWrongPick = !!c && done && c.code === chosen && !isAnswer;
          return (
            <motion.button
              key={c?.code ?? i}
              disabled={!c || done}
              onClick={() => c && choose(c.code)}
              whileTap={done ? undefined : { scale: 0.95 }}
              className={`clay-focus min-h-12 rounded-2xl px-3 py-2 text-sm font-extrabold leading-tight transition-colors ${
                isAnswer ? 'clay-tint tint-c4' : isWrongPick ? 'clay-tint' : 'clay clay-interactive'
              } ${done && !isAnswer && !isWrongPick ? 'opacity-50' : ''}`}
              style={isWrongPick ? ({ '--tint': 'var(--bad)', '--tint-deep': 'color-mix(in oklab, var(--bad) 75%, black)' } as React.CSSProperties) : undefined}
              data-elev="1"
            >
              {c?.name ?? '…'}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <p className="mt-4 text-center text-sm font-bold text-[var(--ink-2)]" aria-live="polite">
              It&rsquo;s <span className="text-[var(--ink)]">{q!.answer.name}</span>
              {q!.answer.capital ? <>, capital {q!.answer.capital.name}</> : null}.{' '}
              <Link href={`/explore?c=${q!.answer.code}`} className="clay-focus rounded text-[var(--accent)] underline-offset-2 hover:underline">
                Explore it →
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
