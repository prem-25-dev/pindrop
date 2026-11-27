'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CountryIndexItem } from '@/lib/countries';
import type { WorldShapes } from '@/lib/geo';
import { TIERS, today, tierFor, usePassport, type Stamp } from '@/lib/passport';
import { buildStampQuiz } from '@/lib/stampQuiz';
import { Confetti } from '../game/shared';
import { StampArt } from './Stamps';

/** the entry exam for one country: ten questions, then the stamp (or not) */
export function StampQuiz({ c, all, world, onClose, onSee }: { c: CountryIndexItem; all: CountryIndexItem[]; world: WorldShapes | null; onClose: () => void; onSee: () => void }) {
  const reduce = useReducedMotion();
  const record = usePassport((s) => s.record);
  const questions = useMemo(() => buildStampQuiz(c, all, today()), [c, all]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [outcome, setOutcome] = useState<{ tier: ReturnType<typeof tierFor>; improved: boolean } | null>(null);
  const saved = useRef(false);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const q = questions[i];
  const done = outcome != null;

  // lock the page behind the exam
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  useEffect(() => {
    if (picked) nextBtn.current?.focus();
  }, [picked]);

  const choose = (id: string) => {
    if (picked || !q) return;
    const right = id === q.answer;
    setPicked(id);
    setMarks((m) => [...m, right]);
    if (right) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    if (saved.current) return;
    saved.current = true;
    setOutcome(record(c.code, score));
  };

  const tier = tierFor(score);
  const stamp: Stamp | null = tier ? { code: c.code, tier, score, date: today() } : null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Entry exam: ${c.name}`}>
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="clay relative flex max-h-full w-full max-w-xl flex-col overflow-hidden"
        data-elev="4"
        style={{ borderRadius: 'var(--radius-xl)' }}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-5 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.flagSquare} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" style={{ boxShadow: '0 4px 10px -4px var(--clay-drop)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--accent)]">Entry exam</p>
            <p className="truncate text-xl font-black tracking-tight">{c.name}</p>
          </div>
          <button onClick={onClose} className="clay clay-interactive clay-focus h-10 w-10 rounded-full text-lg font-black text-[var(--ink-2)]" data-elev="1" aria-label="Close">
            ×
          </button>
        </div>
        <div className="flex gap-1.5 px-5 pt-4 sm:px-6" aria-label={`Question ${Math.min(i + 1, questions.length)} of ${questions.length}`}>
          {questions.map((_, k) => (
            <span key={k} className="h-2 flex-1 rounded-full transition-colors" style={{ background: k < marks.length ? (marks[k] ? 'var(--c4)' : 'var(--bad)') : k === i && !done ? 'var(--accent)' : 'color-mix(in oklab, var(--ink) 12%, transparent)' }} />
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <AnimatePresence mode="wait">
            {!done && q && (
              <motion.div key={q.id + i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">
                  {q.topic} · {i + 1} of {questions.length}
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight tracking-tight">{q.prompt}</h2>
                <div className={`mt-4 grid gap-2.5 ${q.options.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`} role="group" aria-label="Answers">
                  {q.options.map((o, k) => {
                    const isAnswer = o.id === q.answer;
                    const state = !picked ? 'idle' : isAnswer ? 'right' : o.id === picked ? 'wrong' : 'dim';
                    return (
                      <motion.button
                        key={o.id}
                        whileTap={picked ? undefined : { scale: 0.96 }}
                        onClick={() => choose(o.id)}
                        disabled={!!picked}
                        className={`clay-focus relative overflow-hidden rounded-2xl text-left font-extrabold transition-opacity ${o.img ? 'p-1.5' : 'min-h-14 px-4 py-3'} ${state === 'idle' ? 'clay clay-interactive' : ''}`}
                        data-elev={state === 'idle' ? '1' : undefined}
                        style={
                          state === 'right'
                            ? { background: 'color-mix(in oklab, var(--c4) 22%, var(--surface))', boxShadow: '0 0 0 2px var(--c4)' }
                            : state === 'wrong'
                              ? { background: 'color-mix(in oklab, var(--bad) 18%, var(--surface))', boxShadow: '0 0 0 2px var(--bad)' }
                              : state === 'dim'
                                ? { background: 'var(--surface)', opacity: 0.5 }
                                : undefined
                        }
                        aria-label={o.img ? `Flag ${String.fromCharCode(65 + k)}` : undefined}
                      >
                        {o.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.img} alt="" className="block aspect-[4/3] w-full rounded-xl object-cover" />
                        ) : (
                          o.label
                        )}
                        {state === 'right' && <span className="absolute right-2.5 top-2 text-sm" style={{ color: 'var(--c4)' }}>✓</span>}
                        {state === 'wrong' && <span className="absolute right-2.5 top-2 text-sm" style={{ color: 'var(--bad)' }}>✗</span>}
                      </motion.button>
                    );
                  })}
                </div>
                {picked && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold" style={{ color: picked === q.answer ? 'var(--c4)' : 'var(--bad)' }}>
                      {picked === q.answer ? 'Correct' : 'Not this time'}
                      {q.fact ? <span className="font-semibold text-[var(--ink-2)]"> · {q.fact}</span> : null}
                    </p>
                    <button ref={nextBtn} onClick={next} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2.5 text-sm font-black">
                      {i + 1 < questions.length ? 'Next →' : 'Get my stamp'}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {done && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex flex-col items-center text-center">
                <Confetti fire={tier === 'entry' ? 1 : 0} />
                <p className="text-5xl font-black tabular-nums tracking-tight">
                  {score}
                  <span className="text-2xl text-[var(--ink-3)]"> / 10</span>
                </p>
                <div className="relative my-4 flex h-[190px] w-full items-center justify-center rounded-2xl" style={{ background: '#f4ecdc', boxShadow: 'inset 0 0 30px rgba(120,90,50,.2)' }}>
                  {stamp ? (
                    <motion.div
                      initial={reduce ? { opacity: 0 } : { scale: 2.4, opacity: 0, rotate: -25, y: -40 }}
                      animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 17, delay: 0.25 }}
                    >
                      <StampArt c={c} stamp={stamp} world={world} size={150} />
                    </motion.div>
                  ) : (
                    <p className="max-w-[18rem] px-4 text-sm font-bold text-[#6b5a3c]">The border officer shakes their head. Score 6 or more for a stamp.</p>
                  )}
                  {stamp && !reduce && (
                    <motion.span className="pointer-events-none absolute h-24 w-24 rounded-full border-4" style={{ borderColor: 'rgba(120,90,50,.35)' }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 2.2, opacity: [0, 0.8, 0] }} transition={{ delay: 0.42, duration: 0.6 }} aria-hidden />
                  )}
                </div>
                <h2 className="text-2xl font-black tracking-tight">{tier ? `${TIERS[tier].label}!` : 'No stamp this time'}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">
                  {tier && outcome?.improved
                    ? `${TIERS[tier].blurb}. Added to your passport.`
                    : tier
                      ? 'You already hold an equal or better stamp for this country.'
                      : 'Come back tomorrow for a fresh set of questions.'}
                </p>
                {tier !== 'entry' && <p className="mt-1 text-xs font-bold text-[var(--ink-3)]">10 / 10 earns the inked entry stamp. One try per country each day.</p>}
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {tier && outcome?.improved && (
                    <button onClick={onSee} autoFocus className="clay-tint tint-accent clay-focus rounded-full px-6 py-3 font-black">
                      See it in my passport
                    </button>
                  )}
                  <button onClick={onClose} autoFocus={!(tier && outcome?.improved)} className="clay clay-interactive clay-focus rounded-full px-5 py-3 font-extrabold" data-elev="1">
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
