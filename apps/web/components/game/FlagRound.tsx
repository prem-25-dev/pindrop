'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { answerPoints, judge } from '@pinpoint/game';
import { BOTS, botFlag, type BotLevel } from '@/lib/bot';
import type { CountryIndexItem } from '@/lib/countries';
import { choicesFor, type GameSettings } from '@/lib/games';
import { BotChip, Confetti, Feedback, Flag, TimerBar, useCountdown, type RoundResult } from './shared';

export function FlagRound({
  country, all, settings, streak, botStreak, index, onDone,
}: {
  country: CountryIndexItem;
  all: CountryIndexItem[];
  settings: GameSettings;
  streak: number;
  botStreak: number;
  index: number;
  onDone: (r: RoundResult) => void;
}) {
  const reduce = useReducedMotion();
  const [result, setResult] = useState<RoundResult | null>(null);
  const [typed, setTyped] = useState('');
  const [fire, setFire] = useState(0);
  const [closeHint, setCloseHint] = useState(false);
  const started = useRef(performance.now());
  const tourist = settings.difficulty === 'tourist';
  const choices = useMemo(() => choicesFor(country, all, settings.seed), [country, all, settings.seed]);
  const pool = useMemo(() => all.filter((c) => c.un195), [all]);

  const vsBot = settings.opponent !== 'solo';
  const bot = useMemo(
    () => (vsBot ? botFlag({ level: settings.opponent as BotLevel, seed: settings.seed, index, country, timer: settings.timer, difficulty: settings.difficulty, streak: botStreak, options: choices }) : undefined),
    [vsBot, settings, index, country, botStreak, choices],
  );
  const botName = vsBot ? BOTS[settings.opponent as keyof typeof BOTS].name : '';

  const finish = (correct: boolean, answer: string | null, timeLeft = left) => {
    if (result) return;
    const r: RoundResult = {
      code: country.code,
      correct,
      answer,
      points: answerPoints({ correct, difficulty: settings.difficulty, streak: correct ? streak + 1 : 0, timeLeftMs: settings.timer ? timeLeft : undefined, timeTotalMs: settings.timer ? settings.timer * 1000 : undefined }),
      ms: performance.now() - started.current,
      bot,
    };
    setResult(r);
    if (correct) setFire((f) => f + 1);
  };

  const left = useCountdown(settings.timer, !result, () => finish(false, null, 0));

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    const v = judge(typed, country, pool, settings.difficulty);
    // one gentle nudge for a near miss on Navigator before it counts as wrong
    if (!v.correct && !closeHint && settings.difficulty === 'navigator' && v.closeness >= 0.5 && !v.matched) {
      setCloseHint(true);
      return;
    }
    finish(v.correct, v.correct ? null : typed.trim());
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-5">
        {settings.timer > 0 && <TimerBar left={left} total={settings.timer * 1000} />}

        <div className="relative">
          <motion.div
            key={country.code}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -4 }}
            animate={result && !result.correct && !reduce ? { opacity: 1, scale: 1, rotate: 0, x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, scale: 1, rotate: 0 }}
            // the wrong-answer shake has several keyframes, so it needs a timed animation (springs take only two)
            transition={result && !result.correct ? { duration: 0.5, ease: 'easeInOut' } : { type: 'spring', stiffness: 260, damping: 18 }}
          >
            <Flag c={country} className="w-[min(380px,80vw)]" />
          </motion.div>
          <Confetti fire={fire} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-black tracking-tight">Which country is this?</p>
          {bot && <BotChip name={botName} ms={bot.ms} done={!!result} />}
        </div>

        {!result &&
          (tourist ? (
            <div className="grid w-full grid-cols-2 gap-3" role="group" aria-label="Choose the country">
              {choices.map((c, i) => (
                <motion.button
                  key={c.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => finish(c.code === country.code, c.code === country.code ? null : c.name)}
                  className="clay clay-interactive clay-focus min-h-14 rounded-2xl px-4 py-3 text-base font-extrabold"
                  data-elev="1"
                >
                  {c.name}
                </motion.button>
              ))}
            </div>
          ) : (
            <form onSubmit={submitTyped} className="w-full space-y-2">
              <div className="flex gap-2">
                <label className="clay-well flex h-14 flex-1 items-center rounded-full px-5">
                  <span className="sr-only">Country name</span>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => {
                      setTyped(e.target.value);
                      setCloseHint(false);
                    }}
                    placeholder="Type the country…"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-[var(--ink-3)]"
                  />
                </label>
                <button type="submit" className="clay-tint tint-accent clay-focus h-14 rounded-full px-6 font-black">
                  Go
                </button>
              </div>
              <div className="flex items-center justify-between px-2 text-sm font-bold">
                <span className="text-[var(--warn-deep)]" aria-live="polite">{closeHint ? 'So close. Check the spelling and try once more.' : ''}</span>
                <button type="button" onClick={() => finish(false, null)} className="clay-focus rounded px-1 text-[var(--ink-3)] hover:text-[var(--ink)]">
                  Skip
                </button>
              </div>
            </form>
          ))}

        {result && (
          <div className="w-full">
            <Feedback result={result} country={country} extra={country.capital ? `capital ${country.capital.name}` : undefined} bot={bot} botName={botName} onNext={() => onDone(result)} />
          </div>
        )}
      </div>
    </div>
  );
}
