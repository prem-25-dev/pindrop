'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { CountryIndexItem } from '@/lib/countries';
import { makeBots } from '@/lib/bot';
import { Avatar } from './Avatar';
import { YOU } from './GameRoom';
import { usePassport } from '@/lib/passport';
import type { GameDef, GameSettings } from '@/lib/games';
import { Confetti, type RoundResult } from './shared';
import { play } from '@/lib/sound';

export function Results({
  game, settings, results, byCode, newBest, best, onAgain, onSettings,
}: {
  game: GameDef;
  settings: GameSettings;
  results: RoundResult[];
  byCode: Map<string, CountryIndexItem>;
  newBest: boolean;
  best: number | null;
  onAgain: () => void;
  onSettings: () => void;
}) {
  const myColor = usePassport((s) => s.color);
  const score = results.reduce((s, r) => s + r.points, 0);
  const right = results.filter((r) => r.correct).length;
  let bestStreak = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }
  const isPin = game.id === 'pin-drop';
  const bots = makeBots(settings.bots, settings.botLevel);
  const vsBot = bots.length > 0;
  const standings = [
    { id: YOU.id, name: YOU.name, color: myColor, score },
    ...bots.map((b, i) => ({ id: b.id, name: b.name, color: b.color, score: results.reduce((s, r) => s + (r.bots?.[i]?.points ?? 0), 0) })),
  ].sort((a, b) => b.score - a.score || (a.id === YOU.id ? -1 : 1));
  const top = standings[0];
  const tied = standings.length > 1 && standings[1].score === top.score;
  const won = vsBot && top.id === YOU.id && !tied;
  useEffect(() => {
    if (won || newBest) play('win');
    // once, when the results open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const verdict = !vsBot ? null : tied ? "It's a tie at the top" : won ? 'You win!' : `${top.name} wins`;
  const max = isPin ? results.length * 5000 : null;

  const stats = [
    { label: 'Score', value: score.toLocaleString('en') + (max ? ` / ${max.toLocaleString('en')}` : '') },
    { label: isPin ? 'Bullseyes' : 'Correct', value: `${right} / ${results.length}` },
    { label: 'Best streak', value: String(bestStreak) },
    { label: 'Avg. time', value: results.length ? `${(results.reduce((s, r) => s + r.ms, 0) / results.length / 1000).toFixed(1)}s` : '—' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
      <div className="clay relative p-6 sm:p-8" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
        <Confetti fire={newBest || won ? 1 : 0} />
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent)]">{game.title}</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">{verdict ?? (newBest ? 'New best!' : right === results.length && results.length ? 'Perfect run!' : 'Round complete')}</h1>
        {vsBot && (
          <ol className="mt-5 space-y-2" aria-label="Standings">
            {standings.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${p.id === YOU.id ? 'clay' : ''}`}
                data-elev={p.id === YOU.id ? '1' : undefined}
                style={p.id === YOU.id ? undefined : { background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}
              >
                <span className="w-6 text-center text-lg">{['🥇', '🥈', '🥉'][i] ?? <span className="text-sm font-black text-[var(--ink-3)]">{i + 1}</span>}</span>
                <Avatar color={p.color} size={36} mood={i === 0 ? 'happy' : i === standings.length - 1 ? 'sad' : 'idle'} />
                <span className="flex-1 font-black">{p.name}</span>
                <span className="font-black tabular-nums">{p.score.toLocaleString('en')}</span>
              </motion.li>
            ))}
          </ol>
        )}
        {vsBot && newBest && <p className="mt-3 text-sm font-black" style={{ color: 'var(--warn-deep)' }}>New personal best!</p>}
        {!newBest && best != null && <p className="mt-1 text-sm font-bold text-[var(--ink-3)]">Your best here is {best.toLocaleString('en')}.</p>}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="clay rounded-2xl px-4 py-3" data-elev="1">
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{s.label}</dt>
              <dd className="mt-0.5 text-xl font-black tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        <ol className="mt-6 grid gap-1.5 sm:grid-cols-2">
          {results.map((r, i) => {
            const c = byCode.get(r.code);
            return (
              <li key={i} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-bold" style={{ background: `color-mix(in oklab, ${r.correct ? 'var(--c4)' : 'var(--bad)'} 10%, transparent)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c && <img src={c.flagSquare} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" />}
                <span className="min-w-0 flex-1 truncate">{c?.name ?? r.code}</span>
                {r.km != null && r.km > 0 && <span className="text-xs text-[var(--ink-3)]">{Math.round(r.km).toLocaleString('en')} km</span>}
                <span className="tabular-nums">{r.points.toLocaleString('en')}</span>
                {r.tries && r.tries > 1 && r.correct && <span className="text-xs text-[var(--ink-3)]">try {r.tries}</span>}
                <span aria-label={r.correct ? 'correct' : 'wrong'} style={{ color: r.correct ? 'var(--c4)' : 'var(--bad)' }}>
                  {r.correct ? '✓' : '✗'}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={onAgain} autoFocus className="clay-tint tint-accent clay-focus rounded-full px-6 py-3 font-black">
            Play again
          </button>
          <button onClick={onSettings} className="clay clay-interactive clay-focus rounded-full px-5 py-3 font-extrabold" data-elev="1">
            Change settings
          </button>
          <Link href="/play" className="clay-focus rounded-full px-3 py-2 font-extrabold text-[var(--ink-2)] hover:text-[var(--ink)]">
            Other games →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
