'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PARTY_TRIES, type PartyState } from '@pinpoint/game';
import { useCountries } from '@/lib/countries';
import { useFocusMode } from '@/lib/focus';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { leave, party, serverNow, useParty } from '@/lib/party';
import { SCOPES, inScope } from '@/lib/scopes';
import { ClayFlag } from '../ClayFlag';
import { GameMap, type GameMapHandle, type Reveal } from '../game/GameMap';
import { GameRoom, type RoomPlayer } from '../game/GameRoom';
import { Confetti, TimerBar } from '../game/shared';
import { GAME_INFO } from './Lobby';

/** ms left until a server-clock moment, ticking */
function useLeft(until: number | null | undefined) {
  const [left, setLeft] = useState(() => (until ? Math.max(0, until - serverNow()) : 0));
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, until - serverNow()));
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [until]);
  return left;
}

function roomPlayers(state: PartyState): RoomPlayer[] {
  const reveal = state.phase === 'reveal';
  const map = state.settings.game !== 'guess-flag';
  return state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    score: p.score,
    isYou: p.id === state.you,
    gained: reveal ? p.gained : 0,
    status: reveal ? (p.correct ? 'correct' : 'wrong') : !p.done ? 'thinking' : map ? 'answered' : p.correct ? 'correct' : 'wrong',
    tag: !p.connected ? 'away' : reveal && map ? kmTag(state, p.id) : p.host && !p.done ? 'host · thinking…' : undefined,
  }));
}
const kmTag = (state: PartyState, id: string) => {
  const r = state.reveal?.results.find((x) => x.id === id);
  if (!r) return undefined;
  if (r.km == null || !Number.isFinite(r.km)) return r.correct ? 'found it' : 'no answer';
  return r.km === 0 ? 'right on it' : `${Math.round(r.km).toLocaleString('en')} km`;
};

export function PartyPlay({ state }: { state: PartyState }) {
  const router = useRouter();
  const setFocus = useFocusMode((s) => s.setFocus);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setFocus(true);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      setFocus(false);
      document.documentElement.style.overflow = '';
    };
  }, [setFocus]);

  const s = state.settings;
  const q = state.question;
  const typing = s.game === 'guess-flag' && s.difficulty !== 'tourist';
  const me = state.players.find((p) => p.id === state.you);
  const players = useMemo(() => roomPlayers(state), [state]);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col" style={{ background: 'var(--bg)' }} role="application" aria-label={`Party: ${GAME_INFO[s.game].title}`}>
      <div className="clay-wallpaper" aria-hidden />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              leave();
              router.push('/party');
            }}
            className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]"
            data-elev="1"
          >
            ← Leave
          </button>
          <span className="hidden text-sm font-black text-[var(--ink-2)] sm:inline">{GAME_INFO[s.game].title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
          {state.hostId === state.you && (
            <button onClick={party.lobby} className="clay clay-interactive clay-focus rounded-full px-3.5 py-1.5 text-[var(--ink-2)]" data-elev="1">
              End game
            </button>
          )}
          <span className="clay rounded-full px-3.5 py-1.5 font-mono tracking-widest" data-elev="1" title="Room code">
            {state.code}
          </span>
          {q && (
            <span className="clay rounded-full px-3.5 py-1.5 tabular-nums" data-elev="1">
              {q.index + 1} / {q.total}
            </span>
          )}
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1">
        <GameRoom players={players} messages={state.chat} onSend={party.chat} placeholder={typing && state.phase === 'question' && !me?.done ? 'Type your guess…' : 'Say something…'} compact={s.game !== 'guess-flag'}>
          {state.phase === 'countdown' ? (
            <Countdown startsAt={state.startsAt} />
          ) : q ? (
            <AnimatePresence mode="wait">
              <motion.div key={q.index} className="absolute inset-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
                {s.game === 'guess-flag' ? <FlagStage state={state} /> : <MapStage state={state} />}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </GameRoom>
      </div>
    </div>,
    document.body,
  );
}

function Countdown({ startsAt }: { startsAt: number | null }) {
  const left = useLeft(startsAt);
  const n = Math.max(1, Math.ceil(left / 1000));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--ink-3)]">Get ready</p>
      <AnimatePresence mode="popLayout">
        <motion.span key={n} className="clay grid h-32 w-32 place-items-center rounded-full text-6xl font-black tabular-nums" data-elev="3" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
          {n}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** the answer, your points, and when the next round starts */
function RevealBanner({ state }: { state: PartyState }) {
  const r = state.reveal!;
  const mine = r.results.find((x) => x.id === state.you);
  const left = useLeft(r.nextAt);
  const last = r.index + 1 >= (state.question?.total ?? 0);
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="clay flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3" data-elev="3" style={{ borderRadius: 'var(--radius)' }} role="status">
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: mine?.correct ? 'var(--c4)' : 'var(--ink-3)' }}>
          {mine?.correct ? 'You got it' : mine?.answer ? `You said ${mine.answer}` : 'It was'}
        </p>
        <p className="truncate text-xl font-black">{r.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black tabular-nums" style={{ color: mine?.points ? 'var(--c4)' : 'var(--ink-3)' }}>
          +{(mine?.points ?? 0).toLocaleString('en')}
        </span>
        <span className="text-xs font-bold text-[var(--ink-3)]">{last ? 'Results in' : 'Next in'} {Math.ceil(left / 1000)}s</span>
      </div>
    </motion.div>
  );
}

function FlagStage({ state }: { state: PartyState }) {
  const reduce = useReducedMotion();
  const q = state.question!;
  const flag = useParty((s) => s.flag);
  const src = flag?.index === q.index ? flag.flag : null;
  const me = state.players.find((p) => p.id === state.you);
  const left = useLeft(state.phase === 'question' ? q.deadline : null);
  const [picked, setPicked] = useState<string | null>(null);
  const [fire, setFire] = useState(0);
  const reveal = state.phase === 'reveal' ? state.reveal : null;
  const wasCorrect = useRef(false);
  useEffect(() => {
    if (me?.correct && !wasCorrect.current) setFire((f) => f + 1);
    wasCorrect.current = !!me?.correct;
  }, [me?.correct]);
  // typing goes to the chat box
  useEffect(() => {
    if (!q.choices) document.querySelector<HTMLInputElement>('[data-chat-input]')?.focus({ preventScroll: true });
  }, [q.choices, q.index]);

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-5">
      <div className="flex w-full max-w-xl flex-col items-center gap-4">
        {state.phase === 'question' && <TimerBar left={left} total={q.deadline - q.startedAt} />}
        <div className="relative">
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            {src ? <ClayFlag src={src} alt="The flag to identify" depth={9} className="w-[min(340px,72vw)] lg:w-[min(400px,40vw)]" /> : <div className="clay-well aspect-[4/3] w-[min(340px,72vw)] rounded-[12%/16%] lg:w-[min(400px,40vw)]" />}
          </motion.div>
          <Confetti fire={fire} />
        </div>
        <p className="text-xl font-black tracking-tight">Which country is this?</p>

        {state.phase === 'question' && q.choices && (
          <div className="grid w-full grid-cols-2 gap-3" role="group" aria-label="Choose the country">
            {q.choices.map((c) => (
              <button
                key={c.code}
                disabled={!!me?.done}
                onClick={() => {
                  setPicked(c.code);
                  party.answer({ kind: 'choice', code: c.code });
                }}
                className={`clay-focus min-h-14 rounded-2xl px-4 py-3 text-base font-extrabold disabled:cursor-default ${picked === c.code ? 'clay-tint tint-accent' : 'clay clay-interactive'}`}
                data-elev="1"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        {state.phase === 'question' && !q.choices && (
          <div className="flex items-center gap-3 text-sm font-bold text-[var(--ink-3)]">
            {me?.done ? (
              <span style={{ color: me.correct ? 'var(--c4)' : 'var(--bad)' }} className="font-black">
                {me.correct ? 'You got it! Waiting for the others…' : 'Out of guesses. Waiting for the others…'}
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1" aria-label={`${PARTY_TRIES - (me?.tries ?? 0)} tries left`}>
                  {Array.from({ length: PARTY_TRIES }, (_, i) => (
                    <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < PARTY_TRIES - (me?.tries ?? 0) ? 'var(--accent)' : 'color-mix(in oklab, var(--ink) 15%, transparent)' }} />
                  ))}
                </span>
                <span>Type your guess in the chat</span>
              </>
            )}
          </div>
        )}
        {state.phase === 'question' && q.choices && me?.done && <p className="text-sm font-black text-[var(--ink-3)]">Locked in. Waiting for the others…</p>}
        {reveal && <RevealBanner state={state} />}
      </div>
    </div>
  );
}

function MapStage({ state }: { state: PartyState }) {
  const q = state.question!;
  const list = useCountries();
  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const mapRef = useRef<GameMapHandle>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [fire, setFire] = useState(0);
  const me = state.players.find((p) => p.id === state.you);
  const left = useLeft(state.phase === 'question' ? q.deadline : null);
  const isPin = q.game === 'pin-drop';
  const playScope = q.playScope ?? 'world';
  const active = useMemo(() => (code: string) => inScope(byCode.get(code), playScope), [byCode, playScope]);
  const done = !!me?.done || state.phase !== 'question';

  useEffect(() => {
    loadWorldShapes().then(setWorld).catch(() => {});
  }, []);
  // frame the map for this round
  useEffect(() => {
    if (!world) return;
    const view = SCOPES.find((x) => x.id === playScope)?.view;
    const t = setTimeout(() => (view ? mapRef.current?.fitView(view) : mapRef.current?.reset()), 60);
    return () => clearTimeout(t);
  }, [world, playScope, q.index]);

  const r = state.phase === 'reveal' ? state.reveal : null;
  const mine = r?.results.find((x) => x.id === state.you);
  const reveal: Reveal | null = r
    ? {
        target: r.code,
        correct: !!mine?.correct,
        pin: mine?.pin ?? (isPin ? pin : null),
        tapped: mine?.correct ? null : (mine?.tapped ?? null),
        others: r.results
          .filter((x) => x.id !== state.you)
          .map((x) => {
            const p = state.players.find((pl) => pl.id === x.id);
            return { id: x.id, name: p?.name ?? '?', color: p?.color ?? '#888', pin: x.pin ?? null, tapped: x.correct ? null : (x.tapped ?? null) };
          }),
      }
    : null;
  useEffect(() => {
    if (!r) return;
    if (mine?.correct) setFire((f) => f + 1);
    const t = setTimeout(() => mapRef.current?.focusCountry(r.code, mine?.pin ?? undefined), 250);
    return () => clearTimeout(t);
    // once per reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.index]);

  if (!world || !list) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2">
          Unrolling the map…
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <GameMap
          ref={mapRef}
          world={world}
          borders={!!q.borders}
          active={active}
          pin={pin}
          reveal={reveal}
          disabled={done}
          onTapPoint={isPin ? setPin : undefined}
          onTapCountry={
            isPin
              ? undefined
              : (code, lonlat) => {
                  if (!active(code)) return;
                  party.answer({ kind: 'tap', code, lonlat });
                }
          }
        />
        <Confetti fire={fire} />
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl space-y-2">
          <div className="clay flex flex-wrap items-center justify-between gap-3 px-4 py-2.5" data-elev="3" style={{ borderRadius: 'var(--radius)' }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {q.flag && <ClayFlag src={q.flag} alt={`Flag of ${q.name}`} width={56} depth={3} />}
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{isPin ? 'Drop a pin on' : 'Tap the country'}</p>
                <p className="truncate text-xl font-black leading-tight tracking-tight sm:text-2xl">{q.name}</p>
              </div>
            </div>
            {isPin && state.phase === 'question' && !me?.done && (
              <button onClick={() => pin && party.answer({ kind: 'pin', lonlat: pin })} disabled={!pin} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2.5 font-black disabled:opacity-40">
                Drop pin
              </button>
            )}
            {state.phase === 'question' && me?.done && <span className="text-sm font-black text-[var(--ink-3)]">Locked in ✓</span>}
          </div>
          {state.phase === 'question' && <TimerBar left={left} total={q.deadline - q.startedAt} />}
          {isPin && state.phase === 'question' && !pin && !me?.done && <p className="mx-auto w-fit rounded-full bg-[var(--frost)] px-3 py-1 text-xs font-extrabold text-[var(--ink-2)] backdrop-blur">Tap the map to place your pin. Drag to move around.</p>}
        </div>
      </div>

      {r && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl">
            <RevealBanner state={state} />
          </div>
        </div>
      )}
    </div>
  );
}
