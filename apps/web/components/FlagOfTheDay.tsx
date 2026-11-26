'use client';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const CONFETTI = ['#FFC93C', '#FF5A5F', '#3CCB7F', '#4AA8FF', '#B07BFF', '#FF8A3D'];

/** The flag on its own: no frame, its own rounded corners, a clay sheen and a soft shadow. */
function FlagObject({ c, maxW, maxH }: { c: CountryIndexItem | null; maxW: number; maxH: number }) {
  const ratio = c?.flagRatio ?? 1.5;
  const width = Math.min(maxW, Math.round(maxH * ratio));
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${c ? '' : 'clay-well'}`}
      style={{ width, aspectRatio: String(ratio), boxShadow: '0 16px 28px -14px var(--clay-drop), 0 3px 8px var(--clay-drop-2)' }}
    >
      {c && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.flagTrue} alt="Today's mystery flag" className="block h-full w-full" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,.16) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 6px rgba(0,0,0,.12)',
            }}
          />
        </>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="clay-well min-w-0 rounded-2xl px-3 py-2.5">
      <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-extrabold leading-snug">{children}</dd>
    </div>
  );
}

/** A one-question daily quiz on the home page. After answering, the card flips to a fact sheet. */
export function FlagOfTheDay() {
  const list = useCountries();
  const reduce = useReducedMotion();
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const d = todayKey();
    setDay(d);
    try {
      const prev = localStorage.getItem(`pinpoint-fotd-${d}`);
      if (prev) {
        setChosen(prev);
        setFlipped(true); // already played today: open on the facts
      }
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
    // let the result (and confetti) land, then turn the card over
    setTimeout(() => setFlipped(true), 1200);
  };

  const done = !!chosen && !!q;
  const right = done && chosen === q!.answer.code;
  const a = q?.answer;
  const pickedName = done && !right ? q!.choices.find((c) => c.code === chosen)?.name : null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <span className="pill-accent rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider">Flag of the day</span>
      <span className="text-xs font-bold tabular-nums text-[var(--ink-3)]" aria-label={`Next flag in ${clock}`}>
        Next in {clock}
      </span>
    </div>
  );

  /* ---------- front: the question ---------- */
  const front = (
    <div className="clay flex flex-col p-5 sm:p-6" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
      {header}
      <div className="relative mt-5 flex h-[150px] items-center justify-center">
        <motion.div
          initial={false}
          animate={done && !reduce ? (right ? { rotate: [0, 3, -2, 0], scale: [1, 1.06, 1] } : { x: [0, -8, 8, -5, 5, 0] }) : {}}
          transition={{ duration: 0.6 }}
        >
          <FlagObject c={a ?? null} maxW={224} maxH={140} />
        </motion.div>
        <AnimatePresence>
          {right &&
            !flipped &&
            !reduce &&
            Array.from({ length: 18 }, (_, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-2 w-3 rounded-sm"
                style={{ background: CONFETTI[i % CONFETTI.length] }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: Math.cos((i / 18) * Math.PI * 2) * (100 + (i % 3) * 25), y: Math.sin((i / 18) * Math.PI * 2) * (70 + (i % 4) * 15) - 20, opacity: 0, rotate: 360 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-lg font-black tracking-tight">{done ? (right ? 'Spot on!' : 'So close!') : 'Can you name it?'}</p>

      <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="Choose the country">
        {(q?.choices ?? Array.from({ length: 4 }, () => null)).map((c, i) => {
          const isAnswer = !!c && done && c.code === a!.code;
          const isWrongPick = !!c && done && c.code === chosen && !isAnswer;
          return (
            <motion.button
              key={c?.code ?? i}
              disabled={!c || done}
              tabIndex={flipped ? -1 : undefined}
              onClick={() => c && choose(c.code)}
              whileTap={done ? undefined : { scale: 0.95 }}
              className={`clay-focus min-h-12 rounded-2xl px-3 py-2 text-sm font-extrabold leading-tight transition-colors ${
                isAnswer ? 'clay-tint tint-c4' : isWrongPick ? 'clay-tint' : 'clay clay-interactive'
              } ${done && !isAnswer && !isWrongPick ? 'opacity-50' : ''}`}
              style={isWrongPick ? ({ '--tint': 'var(--bad)', '--tint-deep': 'color-mix(in oklab, var(--bad) 75%, black)' } as CSSProperties) : undefined}
              data-elev="1"
            >
              {c?.name ?? '…'}
            </motion.button>
          );
        })}
      </div>

      {done && (
        <button onClick={() => setFlipped(true)} tabIndex={flipped ? -1 : undefined} className="clay-focus mx-auto mt-4 rounded-full px-3 py-1 text-sm font-extrabold text-[var(--accent)]">
          See the facts ↻
        </button>
      )}
    </div>
  );

  /* ---------- back: the fact sheet ---------- */
  const back = a && (
    <div className="clay flex h-full flex-col p-5 sm:p-6" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
      {header}

      <div className="mt-4 flex items-center gap-3.5">
        <FlagObject c={a} maxW={84} maxH={52} />
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-black leading-tight tracking-tight">{a.name}</h3>
          <p className="truncate text-xs font-bold text-[var(--ink-3)]">{a.official}</p>
        </div>
      </div>

      <p
        className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${right ? 'clay-tint tint-c4' : 'clay-tint'}`}
        style={right ? undefined : ({ '--tint': 'var(--bad)', '--tint-deep': 'color-mix(in oklab, var(--bad) 75%, black)' } as CSSProperties)}
        aria-live="polite"
      >
        {right ? '✓ You got it' : `✗ You picked ${pickedName ?? 'another flag'}`}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Fact label="Capital">{a.capital?.name ?? '—'}</Fact>
        <Fact label="Population">
          {a.population ? (
            <a href={a.population.url} target="_blank" rel="noopener noreferrer" className="clay-focus rounded underline decoration-[var(--ink-3)] decoration-dotted underline-offset-2 hover:decoration-solid" title={`World Bank, ${a.population.year}`}>
              {compact.format(a.population.v)} <span className="text-[10px] font-bold text-[var(--ink-3)]">{a.population.year}</span>
            </a>
          ) : (
            '—'
          )}
        </Fact>
        <Fact label="Area">{a.area ? `${Math.round(a.area.v).toLocaleString('en')} km²` : '—'}</Fact>
        <Fact label="Region">{a.subregion || a.region}</Fact>
        <Fact label="Languages">{a.languages.slice(0, 2).join(', ') || '—'}</Fact>
        <Fact label="Currency">{a.currency ? `${a.currency.name}${a.currency.symbol ? ` (${a.currency.symbol})` : ''}` : '—'}</Fact>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <button onClick={() => setFlipped(false)} tabIndex={flipped ? undefined : -1} className="clay clay-interactive clay-focus rounded-full px-3.5 py-2 text-xs font-extrabold" data-elev="1">
          ↺ Flag
        </button>
        <Link href={`/explore?c=${a.code}`} tabIndex={flipped ? undefined : -1} className="clay-tint tint-accent clay-focus rounded-full px-4 py-2 text-sm font-extrabold">
          Explore {a.name} →
        </Link>
      </div>
    </div>
  );

  // reduced motion: swap faces without the 3D turn
  if (reduce) return <div>{flipped && back ? back : front}</div>;

  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        className="grid"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, mass: 0.9 }}
      >
        <div className="[grid-area:1/1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]" aria-hidden={flipped}>
          {front}
        </div>
        <div
          className="[grid-area:1/1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)' }}
          aria-hidden={!flipped}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
