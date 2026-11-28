'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { answerPoints, judge } from '@pinpoint/game';
import { botFlag, type BotPlayer } from '@/lib/bot';
import type { CountryIndexItem } from '@/lib/countries';
import { choicesFor, type GameSettings } from '@/lib/games';
import { YOU, type RoomPlayer } from './GameRoom';
import { usePassport } from '@/lib/passport';
import type { Post } from './GameScreen';
import { Confetti, Feedback, Flag, TimerBar, useCountdown, type RoundResult } from './shared';
import type { WorldShapes } from '@/lib/geo';
import { CountryShape } from './CountryShape';
import { play } from '@/lib/sound';

/** typed answers: three tries per flag, each later try worth less */
export const TRIES = 3;
const TRY_SHARE = [1, 0.7, 0.4];

export function FlagRound({
  country, all, settings, streak, bots, botStreaks, index, post, setStatus, bindGuess, onReveal, onNext, shape = null,
}: {
  /** Silhouette: show the country's outline instead of its flag */
  shape?: WorldShapes | null;
  country: CountryIndexItem;
  all: CountryIndexItem[];
  settings: GameSettings;
  streak: number;
  bots: BotPlayer[];
  botStreaks: number[];
  index: number;
  post: Post;
  setStatus: (id: string, s: RoomPlayer['status']) => void;
  bindGuess: (fn: ((text: string) => boolean) | null) => void;
  onReveal: (r: RoundResult) => void;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const [result, setResult] = useState<RoundResult | null>(null);
  const [tries, setTries] = useState(0);
  const [shake, setShake] = useState(0);
  const [fire, setFire] = useState(0);
  const started = useRef(performance.now());
  const announced = useRef(new Set<number>());
  const tourist = settings.difficulty === 'tourist';
  const choices = useMemo(() => choicesFor(country, all, settings.seed), [country, all, settings.seed]);
  const pool = useMemo(() => all.filter((c) => c.un195), [all]);

  // every bot answers the same flag (seeded per bot)
  const answers = useMemo(
    () => bots.map((b, i) => botFlag({ botId: b.id, level: b.level, seed: settings.seed, index, country, timer: settings.timer, difficulty: settings.difficulty, streak: botStreaks[i] ?? 0, options: choices })),
    // botStreaks only matters at the start of a round
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bots, settings.seed, settings.timer, settings.difficulty, index, country, choices],
  );

  /** a bot's answer lands in the room: a green line when right, its wrong guess in chat otherwise */
  const announce = (i: number) => {
    if (announced.current.has(i)) return;
    announced.current.add(i);
    const b = bots[i];
    const a = answers[i];
    setStatus(b.id, a.correct ? 'correct' : 'wrong');
    if (a.correct) post({ from: 'system', tone: 'good', text: `${b.name} guessed it!` });
    else if (a.answer) post({ from: b.id, name: b.name, color: b.color, text: a.answer });
    else post({ from: 'system', tone: 'info', text: `${b.name} ran out of time` });
  };
  const announceRef = useRef(announce);
  announceRef.current = announce;

  // bots answer live, at their own pace, until the round is decided
  useEffect(() => {
    if (result) return;
    const timers = answers.map((a, i) => setTimeout(() => announceRef.current(i), a.ms));
    return () => timers.forEach(clearTimeout);
  }, [answers, result]);

  const finish = (correct: boolean, answer: string | null, used: number, timeLeft = left) => {
    if (result) return;
    const base = answerPoints({ correct, difficulty: settings.difficulty, streak: correct ? streak + 1 : 0, timeLeftMs: settings.timer ? timeLeft : undefined, timeTotalMs: settings.timer ? settings.timer * 1000 : undefined });
    const r: RoundResult = {
      code: country.code,
      correct,
      answer,
      points: correct ? Math.round(base * (TRY_SHARE[Math.max(0, used - 1)] ?? 0.4)) : 0,
      ms: performance.now() - started.current,
      bots: answers,
      tries: used || undefined,
    };
    setResult(r);
    play(correct ? 'right' : 'wrong');
    if (correct) setFire((f) => f + 1);
    // anyone still thinking shows their answer now
    answers.forEach((_, i) => announce(i));
    post(correct ? { from: 'system', tone: 'good', text: `You guessed it! It was ${country.name}` } : { from: 'system', tone: 'bad', text: `It was ${country.name}` });
    onReveal(r);
  };

  const left = useCountdown(settings.timer, !result, () => finish(false, null, tries, 0));

  /** a typed guess from the chat box */
  const guess = (text: string): boolean => {
    if (result || tourist) return false;
    const v = judge(text, country, pool, settings.difficulty);
    const used = tries + 1;
    if (v.correct) {
      finish(true, null, used);
      return true;
    }
    // wrong guesses are public, like in a party room
    post({ from: YOU.id, name: YOU.name, color: usePassport.getState().color, text });
    setTries(used);
    setShake((s) => s + 1);
    if (used < TRIES) play('pop');
    if (used >= TRIES) finish(false, text, used);
    else if (settings.difficulty === 'navigator' && v.closeness >= 0.5 && !v.matched) post({ from: 'system', tone: 'info', text: `"${text}" is close!` });
    return true;
  };
  const guessRef = useRef(guess);
  guessRef.current = guess;
  useEffect(() => {
    if (tourist) return;
    bindGuess((t) => guessRef.current(t));
    document.querySelector<HTMLInputElement>('[data-chat-input]')?.focus({ preventScroll: true });
    return () => bindGuess(null);
  }, [tourist, bindGuess]);

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-5">
      <div className="flex w-full max-w-xl flex-col items-center gap-4">
        {settings.timer > 0 && <TimerBar left={left} total={settings.timer * 1000} />}

        <div className="relative">
          <motion.div
            key={shake}
            initial={reduce ? { opacity: 0 } : shake ? { x: 0 } : { opacity: 0, scale: 0.85, rotate: -4 }}
            animate={shake && !reduce ? { opacity: 1, x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, scale: 1, rotate: 0 }}
            // the shake has several keyframes, so it needs a timed animation (springs take only two)
            transition={shake ? { duration: 0.45, ease: 'easeInOut' } : { type: 'spring', stiffness: 260, damping: 18 }}
          >
            {shape ? (
              // the outline first; once the round is over, its flag
              result ? (
                <Flag c={country} className="w-[min(340px,72vw)] lg:w-[min(400px,40vw)]" />
              ) : (
                <CountryShape code={country.code} world={shape} className="h-[min(300px,40vh)] w-[min(340px,72vw)] lg:w-[min(400px,40vw)]" />
              )
            ) : (
              <Flag c={country} className="w-[min(340px,72vw)] lg:w-[min(400px,40vw)]" />
            )}
          </motion.div>
          <Confetti fire={fire} />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-xl font-black tracking-tight">Which country is this?</p>
          {!tourist && !result && (
            <div className="flex items-center gap-3 text-sm font-bold text-[var(--ink-3)]">
              <span className="flex items-center gap-1" aria-label={`${TRIES - tries} tries left`}>
                {Array.from({ length: TRIES }, (_, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < TRIES - tries ? 'var(--accent)' : 'color-mix(in oklab, var(--ink) 15%, transparent)' }} />
                ))}
              </span>
              <span>Type your guess in the chat</span>
              <button type="button" onClick={() => finish(false, null, tries)} className="clay-focus rounded px-1 underline-offset-2 hover:text-[var(--ink)] hover:underline">
                Skip
              </button>
            </div>
          )}
        </div>

        {!result && tourist && (
          <div className="grid w-full grid-cols-2 gap-3" role="group" aria-label="Choose the country">
            {choices.map((c, i) => (
              <motion.button
                key={c.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileTap={{ scale: 0.95 }}
                onClick={() => finish(c.code === country.code, c.code === country.code ? null : c.name, 1)}
                className="clay clay-interactive clay-focus min-h-14 rounded-2xl px-4 py-3 text-base font-extrabold"
                data-elev="1"
              >
                {c.name}
              </motion.button>
            ))}
          </div>
        )}

        {result && (
          <div className="w-full">
            <Feedback
              result={result}
              country={country}
              title={result.correct && result.tries && result.tries > 1 ? `Correct on try ${result.tries}` : undefined}
              extra={country.capital ? `capital ${country.capital.name}` : undefined}
              onNext={onNext}
            />
          </div>
        )}
      </div>
    </div>
  );
}
