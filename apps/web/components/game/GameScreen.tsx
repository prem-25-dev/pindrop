'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { randomSeed } from '@pinpoint/game';
import type { ClayIconName } from '@pinpoint/ui';
import { useCountries } from '@/lib/countries';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { GAMES, LIVES, buildQuestions, readBest, readSettings, saveBest, saveSettings, type GameId, type GameSettings } from '@/lib/games';
import { FlagRound } from './FlagRound';
import { MapRound } from './MapRound';
import { Results } from './Results';
import { Setup } from './Setup';
import type { RoundResult } from './shared';

type Phase = 'setup' | 'play' | 'results';

export function GameScreen({ gameId, icon }: { gameId: GameId; icon: ClayIconName }) {
  const game = GAMES[gameId];
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<GameSettings>({ difficulty: 'tourist', scope: 'world', length: game.defaultLength, timer: 0, seed: '' });
  const [questions, setQuestions] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);

  // remembered settings for this game
  useEffect(() => {
    const saved = readSettings(gameId);
    setSettings((s) => ({ ...s, ...saved, length: saved.length && game.lengths.includes(saved.length) ? saved.length : game.defaultLength }));
  }, [gameId, game]);
  useEffect(() => setBest(readBest(gameId, settings)), [gameId, settings]);
  useEffect(() => {
    if (game.map) loadWorldShapes().then(setWorld);
  }, [game.map]);

  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);

  const start = useCallback(() => {
    if (!list) return;
    const s = { ...settings, seed: randomSeed() };
    setSettings(s);
    saveSettings(gameId, s);
    setQuestions(buildQuestions(game, s, list).map((c) => c.code));
    setResults([]);
    setNewBest(false);
    setPhase('play');
  }, [list, settings, gameId, game]);

  const finishGame = useCallback(
    (all: RoundResult[]) => {
      const score = all.reduce((sum, r) => sum + r.points, 0);
      setNewBest(all.length > 0 && saveBest(gameId, settings, score));
      setBest(readBest(gameId, settings));
      setPhase('results');
    },
    [gameId, settings],
  );

  const onRound = useCallback(
    (r: RoundResult) => {
      // side effects stay out of the state updater (React may run updaters twice in development)
      const all = [...results, r];
      setResults(all);
      const misses = all.filter((x) => !x.correct).length;
      const over = settings.length === 'endless' ? misses >= LIVES || all.length >= questions.length : all.length >= questions.length;
      if (over) finishGame(all);
    },
    [results, settings.length, questions.length, finishGame],
  );

  const index = results.length;
  const current = questions[index] ? byCode.get(questions[index]) : undefined;
  const score = results.reduce((s, r) => s + r.points, 0);
  let streak = 0;
  for (let i = results.length - 1; i >= 0 && results[i].correct; i--) streak++;
  const misses = results.filter((r) => !r.correct).length;
  const endless = settings.length === 'endless';

  if (!list || (game.map && !world)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Getting the game ready…
        </p>
      </div>
    );
  }

  if (phase === 'setup') return <Setup game={game} icon={icon} settings={settings} onChange={setSettings} onStart={start} best={best} />;
  if (phase === 'results') return <Results game={game} results={results} byCode={byCode} newBest={newBest} best={best} onAgain={start} onSettings={() => setPhase('setup')} />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setPhase('setup')} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
          ← Quit
        </button>
        <div className="flex flex-wrap items-center gap-2.5 text-sm font-extrabold">
          <span className="clay rounded-full px-3.5 py-1.5 tabular-nums" data-elev="1">
            {endless ? `Round ${index + 1}` : `${Math.min(index + 1, questions.length)} / ${questions.length}`}
          </span>
          {endless && (
            <span className="clay rounded-full px-3.5 py-1.5" data-elev="1" aria-label={`${LIVES - misses} lives left`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <span key={i} style={{ color: i < LIVES - misses ? 'var(--bad)' : 'var(--ink-3)', opacity: i < LIVES - misses ? 1 : 0.35 }}>
                  ♥
                </span>
              ))}
            </span>
          )}
          <span className="clay rounded-full px-3.5 py-1.5 tabular-nums" data-elev="1">
            {streak >= 2 ? `🔥 ${streak} · ` : ''}
            {score.toLocaleString('en')} pts
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={`${index}-${current.code}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
            {gameId === 'guess-flag' ? (
              <FlagRound country={current} all={list} settings={settings} streak={streak} onDone={onRound} />
            ) : (
              <MapRound kind={gameId === 'pin-drop' ? 'pin' : 'find'} country={current} settings={settings} world={world!} byCode={byCode} onDone={onRound} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
