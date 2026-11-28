'use client';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { todayKey } from '@/lib/borderHop';
import { useCountries } from '@/lib/countries';
import { buildDaily, readDaily, saveDaily, streakOf, type DailyKind } from '@/lib/daily';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { ClayFlag } from '../ClayFlag';
import { CountryShape, tooSmallForShape } from './CountryShape';
import { Confetti } from './shared';
import { play } from '@/lib/sound';
import { useWallet } from '@/lib/wallet';

const KIND_LABEL: Record<DailyKind, string> = { flag: 'Flag', shape: 'Shape', capital: 'Capital', bigger: 'People', border: 'Neighbours' };

export function DailyMix() {
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [played, setPlayed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fire, setFire] = useState(0);

  useEffect(() => {
    const d = todayKey();
    setDay(d);
    loadWorldShapes().then(setWorld).catch(() => {});
    const r = readDaily();
    if (r.days[d]) {
      setAnswers(r.days[d]);
      setAt(5);
      setPlayed(true);
    }
    setStreak(streakOf(r, d));
  }, []);

  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);
  const questions = useMemo(() => (list && world && day ? buildDaily(list, day, (code) => !tooSmallForShape(world, code)) : null), [list, world, day]);

  if (!questions || !day) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Mixing today&apos;s questions…
        </p>
      </div>
    );
  }

  const q = questions[Math.min(at, 4)];
  const done = at >= 5;
  const score = answers.filter(Boolean).length;
  const share = `Pinpoint Daily Mix ${day}\n${answers.map((a) => (a ? '🟩' : '🟥')).join('')} ${score}/5`;

  const choose = (code: string) => {
    if (picked || done) return;
    setPicked(code);
    const right = code === q.answer;
    play(right ? 'right' : 'wrong');
    if (right) setFire((f) => f + 1);
    const next = [...answers, right];
    setAnswers(next);
    setTimeout(() => {
      setPicked(null);
      setAt((a) => a + 1);
      if (next.length === 5) {
        saveDaily(day, next);
        useWallet.getState().earn(`daily:${day}`, 5 + next.filter(Boolean).length * 4, 'Daily Mix');
        setStreak(streakOf(readDaily(), day));
        setPlayed(true);
      }
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Daily Mix</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">Five questions, five kinds, the same for everyone today.</p>
        </div>
        <span className="clay rounded-full px-4 py-2 text-sm font-black" data-elev="1" aria-label={`Streak: ${streak} days`}>
          🔥 {streak} day{streak === 1 ? '' : 's'}
        </span>
      </div>

      {/* progress */}
      <div className="mb-4 flex gap-2" aria-label="Progress">
        {questions.map((x, i) => (
          <div key={i} className="flex-1">
            <div className="h-2.5 rounded-full" style={{ background: i < answers.length ? (answers[i] ? 'var(--c4)' : 'var(--bad)') : i === at ? 'var(--accent)' : 'color-mix(in oklab, var(--ink) 12%, transparent)' }} />
            <p className="mt-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{KIND_LABEL[x.kind]}</p>
          </div>
        ))}
      </div>

      <section className="clay relative p-5 sm:p-6" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key={at} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-col items-center gap-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--ink-3)]">
                {at + 1} of 5 · {KIND_LABEL[q.kind]}
              </p>
              {q.kind === 'flag' && <ClayFlag src={byCode.get(q.subject)!.flag} alt="The flag to identify" depth={8} className="w-[min(300px,70vw)]" />}
              {q.kind === 'shape' && world && <CountryShape code={q.subject} world={world} className="h-[220px] w-[min(300px,70vw)]" />}
              <p className="text-center text-xl font-black tracking-tight">{q.prompt}</p>
              <div className={`grid w-full gap-3 ${q.options.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {q.options.map((o) => {
                  const isAnswer = o.code === q.answer;
                  const state = picked ? (isAnswer ? 'right' : o.code === picked ? 'wrong' : 'idle') : 'idle';
                  return (
                    <motion.button
                      key={o.code}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => choose(o.code)}
                      disabled={!!picked}
                      className={`clay-focus flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold ${state === 'idle' ? 'clay clay-interactive' : 'text-white'}`}
                      data-elev={state === 'idle' ? '1' : undefined}
                      style={state === 'right' ? { background: 'var(--c4)' } : state === 'wrong' ? { background: 'var(--bad)' } : undefined}
                    >
                      {(q.kind === 'bigger' || q.kind === 'border') && <ClayFlag src={byCode.get(o.code)!.flag} width={30} depth={2} />}
                      {o.label}
                    </motion.button>
                  );
                })}
              </div>
              {picked && (
                <p className="text-sm font-black" style={{ color: picked === q.answer ? 'var(--c4)' : 'var(--bad)' }} role="status">
                  {picked === q.answer ? 'Right! ' : 'Not quite. '}
                  <span className="font-bold text-[var(--ink-2)]">{q.fact}</span>
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--ink-3)]">{played ? `Today, ${day}` : 'Done'}</p>
              <p className="text-5xl font-black">{score}/5</p>
              <p className="text-3xl tracking-widest" aria-hidden>
                {answers.map((a) => (a ? '🟩' : '🟥')).join('')}
              </p>
              <p className="font-bold text-[var(--ink-2)]">{score === 5 ? 'A perfect day.' : score >= 3 ? 'Nicely done.' : 'Tomorrow is another mix.'} Come back tomorrow to keep your streak.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(share);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    } catch {
                      /* clipboard blocked */
                    }
                  }}
                  className="clay-tint tint-accent clay-focus h-11 rounded-full px-6 font-black"
                >
                  {copied ? 'Copied ✓' : 'Copy result'}
                </button>
                <Link href="/play/border-hop" className="clay clay-interactive clay-focus inline-flex h-11 items-center rounded-full px-5 font-black" data-elev="1">
                  Try today&apos;s Border Hop
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute left-1/2 top-1/3">
          <Confetti fire={fire} />
        </div>
      </section>
    </div>
  );
}
