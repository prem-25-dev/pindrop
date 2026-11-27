'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { randomSeed } from '@pinpoint/game';
import type { ClayIconName } from '@pinpoint/ui';
import { botBanter, makeBots } from '@/lib/bot';
import { useCountries } from '@/lib/countries';
import { useFocusMode } from '@/lib/focus';
import { useHistory } from '@/lib/history';
import { usePassport } from '@/lib/passport';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { GAMES, LIVES, buildQuestions, readBest, readSettings, saveBest, saveSettings, type GameId, type GameSettings } from '@/lib/games';
import { FlagRound } from './FlagRound';
import { GameRoom, YOU, type ChatMsg, type RoomPlayer } from './GameRoom';
import { MapRound } from './MapRound';
import { Results } from './Results';
import { Setup } from './Setup';
import type { RoundResult } from './shared';

type Phase = 'setup' | 'play' | 'results';
type Status = RoomPlayer['status'];
export type Post = (m: Omit<ChatMsg, 'id'>) => void;

const streakOf = (rs: { correct: boolean }[]) => {
  let n = 0;
  for (let i = rs.length - 1; i >= 0 && rs[i].correct; i--) n++;
  return n;
};
const kmShort = (km?: number) => (km == null ? 'no pin' : km === 0 ? 'bullseye' : `${Math.round(km).toLocaleString('en')} km`);

export function GameScreen({ gameId, icon }: { gameId: GameId; icon: ClayIconName }) {
  const game = GAMES[gameId];
  const isPin = gameId === 'pin-drop';
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<GameSettings>({ difficulty: 'tourist', scope: 'world', length: game.defaultLength, timer: 20, seed: '', bots: 0, botLevel: 'medium', borders: false });
  const [questions, setQuestions] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  /** the round on screen once it is revealed, until the player moves on */
  const [pending, setPending] = useState<RoundResult | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatusMap] = useState<Record<string, Status>>({});
  const msgId = useRef(0);
  const guessRef = useRef<((text: string) => boolean) | null>(null);
  const setFocus = useFocusMode((s) => s.setFocus);
  const addGame = useHistory((s) => s.add);
  const myColor = usePassport((s) => s.color);

  const bots = useMemo(() => makeBots(settings.bots, settings.botLevel), [settings.bots, settings.botLevel]);

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
  const index = results.length;

  /* ---------- the room: chat and live status ---------- */
  const post = useCallback<Post>((m) => {
    const id = `m${++msgId.current}`;
    setMessages((ms) => [...ms.slice(-120), { ...m, id }]);
  }, []);
  const setStatus = useCallback((id: string, s: Status) => setStatusMap((m) => ({ ...m, [id]: s })), []);
  const bindGuess = useCallback((fn: ((text: string) => boolean) | null) => {
    guessRef.current = fn;
  }, []);
  const onSend = (text: string) => {
    // during a typed round the chat is the answer box; otherwise it is just chat
    if (guessRef.current?.(text)) return;
    post({ from: YOU.id, name: YOU.name, color: myColor, text });
  };

  // every question starts with everyone thinking
  useEffect(() => {
    if (phase !== 'play') return;
    setStatusMap(Object.fromEntries([YOU.id, ...bots.map((b) => b.id)].map((id) => [id, 'thinking' as Status])));
  }, [phase, index, bots]);

  const start = useCallback(() => {
    if (!list) return;
    const s = { ...settings, seed: randomSeed() };
    const crew = makeBots(s.bots, s.botLevel);
    setSettings(s);
    saveSettings(gameId, s);
    setQuestions(buildQuestions(game, s, list).map((c) => c.code));
    setResults([]);
    setPending(null);
    setNewBest(false);
    msgId.current = 0;
    setMessages([
      { id: 'm0', from: 'system', tone: 'info', text: crew.length ? `${crew.map((b) => b.name).join(', ')} joined the room` : 'Solo room. Add bots in the settings for company.' },
      ...(gameId === 'guess-flag' && s.difficulty !== 'tourist' ? [{ id: 'm00', from: 'system', tone: 'info' as const, text: 'Type your guesses here. 3 tries per flag.' }] : []),
    ]);
    setPhase('play');
    window.scrollTo({ top: 0 });
  }, [list, settings, gameId, game]);

  const finishGame = useCallback(
    (all: RoundResult[]) => {
      const score = all.reduce((sum, r) => sum + r.points, 0);
      setNewBest(all.length > 0 && saveBest(gameId, settings, score));
      setBest(readBest(gameId, settings));
      // the local leaderboard keeps every finished game
      if (all.length) {
        const me = usePassport.getState();
        addGame({
          game: gameId,
          difficulty: settings.difficulty,
          scope: settings.scope,
          length: settings.length,
          timer: settings.timer,
          borders: settings.borders,
          botLevel: bots.length ? settings.botLevel : null,
          rounds: all.length,
          players: [
            { id: YOU.id, name: me.name || 'You', color: me.color, score, right: all.filter((r) => r.correct).length },
            ...bots.map((b, i) => ({ id: b.id, name: b.name, color: b.color, bot: true, score: all.reduce((s, r) => s + (r.bots?.[i]?.points ?? 0), 0), right: all.filter((r) => r.bots?.[i]?.correct).length })),
          ],
        });
      }
      setPhase('results');
    },
    [gameId, settings, bots, addGame],
  );

  /** a round is decided on screen: scores update, faces react, bots chat */
  const good = useCallback((x: { correct: boolean; points: number }) => (isPin ? x.points >= 2500 : x.correct), [isPin]);
  const onReveal = useCallback(
    (r: RoundResult) => {
      setPending(r);
      setStatus(YOU.id, good(r) ? 'correct' : 'wrong');
      bots.forEach((b, i) => {
        const a = r.bots?.[i];
        if (!a) return;
        setStatus(b.id, good(a) ? 'correct' : 'wrong');
        const line = botBanter(b, settings.seed, index, good(a) ? 'won' : a.points >= 2000 ? 'close' : 'lost');
        if (line) setTimeout(() => post({ from: b.id, name: b.name, color: b.color, text: line }), 600 + i * 500);
      });
    },
    [bots, good, index, post, setStatus, settings.seed],
  );

  const onNext = useCallback(() => {
    if (!pending) return;
    // side effects stay out of state updaters (React may run updaters twice in development)
    const all = [...results, pending];
    setResults(all);
    setPending(null);
    const misses = all.filter((x) => !x.correct).length;
    const over = settings.length === 'endless' ? misses >= LIVES || all.length >= questions.length : all.length >= questions.length;
    if (over) finishGame(all);
  }, [pending, results, settings.length, questions.length, finishGame]);

  const botStreaks = useMemo(() => bots.map((_, i) => streakOf(results.map((r) => ({ correct: !!r.bots?.[i]?.correct })))), [bots, results]);

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
  const current = questions[index] ? byCode.get(questions[index]) : undefined;
  const shown = pending ? [...results, pending] : results;
  const streak = streakOf(results);
  const misses = shown.filter((r) => !r.correct).length;
  const endless = settings.length === 'endless';
  const typing = gameId === 'guess-flag' && settings.difficulty !== 'tourist' && !pending;

  const players: RoomPlayer[] = [
    {
      ...YOU,
      color: myColor,
      isYou: true,
      score: shown.reduce((s, r) => s + r.points, 0),
      status: status[YOU.id] ?? 'idle',
      gained: pending?.points,
      tag: pending && isPin ? kmShort(pending.km) : !pending && streak >= 2 ? `🔥 ${streak} in a row` : undefined,
    },
    ...bots.map((b, i) => ({
      id: b.id,
      name: b.name,
      color: b.color,
      score: shown.reduce((s, r) => s + (r.bots?.[i]?.points ?? 0), 0),
      status: status[b.id] ?? 'idle',
      gained: pending?.bots?.[i]?.points,
      tag: pending && isPin ? kmShort(pending.bots?.[i]?.km) : undefined,
    })),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col" style={{ background: 'var(--bg)' }} role="application" aria-label={game.title}>
      <div className="clay-wallpaper" aria-hidden />

      {/* HUD */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              guessRef.current = null;
              setPhase('setup');
            }}
            className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]"
            data-elev="1"
          >
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
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1">
        <GameRoom players={players} messages={messages} onSend={onSend} placeholder={typing ? 'Type your guess…' : 'Say something…'} compact={!!game.map}>
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
                  <FlagRound country={current} all={list} settings={settings} streak={streak} bots={bots} botStreaks={botStreaks} index={index} post={post} setStatus={setStatus} bindGuess={bindGuess} onReveal={onReveal} onNext={onNext} />
                ) : (
                  <MapRound kind={isPin ? 'pin' : 'find'} country={current} settings={settings} world={world!} byCode={byCode} index={index} bots={bots} post={post} setStatus={setStatus} onReveal={onReveal} onNext={onNext} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GameRoom>
      </div>
    </div>,
    document.body,
  );
}
