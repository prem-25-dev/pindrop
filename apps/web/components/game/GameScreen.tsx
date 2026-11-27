'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { randomSeed } from '@pinpoint/game';
import type { ClayIconName } from '@pinpoint/ui';
import { BOTS, type BotLevel } from '@/lib/bot';
import { useCountries } from '@/lib/countries';
import { useFocusMode } from '@/lib/focus';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { GAMES, LIVES, buildQuestions, readBest, readSettings, saveBest, saveSettings, type GameId, type GameSettings } from '@/lib/games';
import { FlagRound } from './FlagRound';
import { MapRound } from './MapRound';
import { Results } from './Results';
import { Setup } from './Setup';
import type { RoundResult } from './shared';

type Phase = 'setup' | 'play' | 'results';

const streakOf = (rs: { correct: boolean }[]) => {
  let n = 0;
  for (let i = rs.length - 1; i >= 0 && rs[i].correct; i--) n++;
  return n;
};

export function GameScreen({ gameId, icon }: { gameId: GameId; icon: ClayIconName }) {
  const game = GAMES[gameId];
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<GameSettings>({ difficulty: 'tourist', scope: 'world', length: game.defaultLength, timer: 0, seed: '', opponent: 'solo', borders: false });
  const [questions, setQuestions] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const setFocus = useFocusMode((s) => s.setFocus);

  // remembered settings for this game
  useEffect(() => {
    const saved = readSettings(gameId);
    setSettings((s) => ({ ...s, ...saved, length: saved.length && game.lengths.includes(saved.length) ? saved.length : game.defaultLength }));
  }, [gameId, game]);
  useEffect(() => setBest(readBest(gameId, settings)), [gameId, settings]);
  useEffect(() => {
    if (game.map) loadWorldShapes().then(setWorld);
  }, [game.map]);

  // while playing, the game is its own screen: chrome hidden, page scroll locked
  useEffect(() => {
    const playing = phase === 'play';
    setFocus(playing);
    document.documentElement.style.overflow = playing ? 'hidden' : '';
    return () => {
      setFocus(false);
      document.documentElement.style.overflow = '';
    };
  }, [phase, setFocus]);

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
    window.scrollTo({ top: 0 });
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
  if (phase === 'results') return <Results game={game} settings={settings} results={results} byCode={byCode} newBest={newBest} best={best} onAgain={start} onSettings={() => setPhase('setup')} />;

  /* ---------- play: a full screen of its own ---------- */
  const index = results.length;
  const current = questions[index] ? byCode.get(questions[index]) : undefined;
  const score = results.reduce((s, r) => s + r.points, 0);
  const botScore = results.reduce((s, r) => s + (r.bot?.points ?? 0), 0);
  const streak = streakOf(results);
  const botStreak = streakOf(results.map((r) => ({ correct: !!r.bot?.correct })));
  const misses = results.filter((r) => !r.correct).length;
  const endless = settings.length === 'endless';
  const vsBot = settings.opponent !== 'solo';
  const botName = vsBot ? BOTS[settings.opponent as BotLevel].name : '';

  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col" style={{ background: 'var(--bg)' }} role="application" aria-label={game.title}>
      <div className="clay-wallpaper" aria-hidden />

      {/* HUD */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 sm:px-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setPhase('setup')} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
            ← Quit
          </button>
          <span className="hidden text-sm font-black text-[var(--ink-2)] sm:inline">{game.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
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
          {vsBot ? (
            <span className="clay flex items-center gap-2 rounded-full px-3.5 py-1.5 tabular-nums" data-elev="1" aria-label={`You ${score} points, ${botName} ${botScore} points`}>
              <span style={{ color: score >= botScore ? 'var(--accent)' : undefined }}>You {score.toLocaleString('en')}</span>
              <span className="text-[var(--ink-3)]">vs</span>
              <span style={{ color: botScore > score ? 'var(--c3)' : undefined }}>🤖 {botScore.toLocaleString('en')}</span>
            </span>
          ) : (
            <span className="clay rounded-full px-3.5 py-1.5 tabular-nums" data-elev="1">
              {streak >= 2 ? `🔥 ${streak} · ` : ''}
              {score.toLocaleString('en')} pts
            </span>
          )}
        </div>
      </header>

      {/* the round */}
      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={`${index}-${current.code}`}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              {gameId === 'guess-flag' ? (
                <FlagRound country={current} all={list} settings={settings} streak={streak} botStreak={botStreak} index={index} onDone={onRound} />
              ) : (
                <MapRound kind={gameId === 'pin-drop' ? 'pin' : 'find'} country={current} settings={settings} world={world!} byCode={byCode} index={index} onDone={onRound} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>,
    document.body,
  );
}
