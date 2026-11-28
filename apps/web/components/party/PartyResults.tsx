'use client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { PartyState } from '@pinpoint/game';
import { useHistory } from '@/lib/history';
import { leave, party } from '@/lib/party';
import { Avatar } from '../game/Avatar';
import { Confetti } from '../game/shared';
import { Chat } from '../game/GameRoom';
import { GAME_INFO } from './Lobby';
import { play } from '@/lib/sound';

const MEDALS = ['#f2c14e', '#b9c3cf', '#d99a6c'];

export function PartyResults({ state }: { state: PartyState }) {
  const router = useRouter();
  const addGame = useHistory((s) => s.add);
  const saved = useRef<string | null>(null);
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const place = ranked.findIndex((p) => p.id === state.you) + 1;
  const isHost = state.hostId === state.you;
  const s = state.settings;
  const top = ranked[0];
  const tie = ranked.length > 1 && ranked[1].score === top?.score;
  const won = place === 1 && !tie && ranked.length > 1;

  useEffect(() => {
    if (won) play('win');
    // once, when the results open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep this game in your history (feeds the leaderboard page); once per finished game
  useEffect(() => {
    const key = `${state.code}:${state.chat.at(-1)?.id}`;
    if (saved.current === key || !state.players.some((p) => p.id === state.you)) return;
    saved.current = key;
    addGame({
      game: s.game,
      difficulty: s.difficulty,
      scope: s.scope,
      length: s.rounds,
      timer: s.timer,
      borders: s.borders,
      botLevel: null,
      rounds: s.rounds,
      players: ranked.map((p) => ({ id: p.id === state.you ? 'you' : p.id, name: p.name, color: p.color, score: p.score, right: p.right })),
    });
    // saved once when the results arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="relative mb-5 text-center">
        <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--ink-3)]">{GAME_INFO[s.game].title} · {s.rounds} rounds</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">{ranked.length < 2 ? 'Game over' : tie ? "It's a tie at the top" : won ? 'You win!' : `${top?.name ?? 'Nobody'} wins`}</h1>
        <p className="mt-1 font-bold text-[var(--ink-2)]">
          {ranked.length > 1 ? `You finished ${place} of ${ranked.length}` : `You scored ${(top?.score ?? 0).toLocaleString('en')}. Invite friends for the next one.`}
        </p>
        <div className="absolute left-1/2 top-8">
          <Confetti fire={won ? 1 : 0} />
        </div>
      </div>

      <section className="clay p-3 sm:p-4" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <ol className="space-y-1.5">
          {ranked.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${p.id === state.you ? 'clay' : ''}`} data-elev={p.id === state.you ? '1' : undefined} style={p.id === state.you ? undefined : { background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}>
              <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-black" style={{ background: MEDALS[i] ?? 'transparent', color: MEDALS[i] ? '#2a2418' : 'var(--ink-3)', boxShadow: MEDALS[i] ? 'inset 2px 2px 3px rgba(255,255,255,.6), inset -2px -3px 4px rgba(0,0,0,.18)' : undefined }}>
                {i + 1}
              </span>
              <Avatar color={p.color} size={36} mood={i === 0 ? 'happy' : 'idle'} />
              <span className="min-w-0 flex-1 truncate font-black">
                {p.name}
                {p.id === state.you && <span className="ml-1.5 text-xs text-[var(--ink-3)]">you</span>}
              </span>
              <span className="text-xs font-bold text-[var(--ink-3)]">{p.right} right</span>
              <span className="w-20 text-right text-lg font-black tabular-nums">{p.score.toLocaleString('en')}</span>
            </motion.li>
          ))}
        </ol>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {isHost ? (
          <>
            <button onClick={party.start} className="clay-tint tint-accent clay-focus h-12 rounded-full px-7 text-base font-black">
              Play again
            </button>
            <button onClick={party.lobby} className="clay clay-interactive clay-focus h-12 rounded-full px-6 font-black" data-elev="1">
              Change game
            </button>
          </>
        ) : (
          <p className="clay rounded-full px-4 py-2.5 text-sm font-black text-[var(--ink-2)]" data-elev="1">
            Waiting for {state.players.find((p) => p.id === state.hostId)?.name ?? 'the host'} to pick what is next…
          </p>
        )}
        <button
          onClick={() => {
            leave();
            router.push('/party');
          }}
          className="clay clay-interactive clay-focus h-12 rounded-full px-6 font-black text-[var(--ink-2)]"
          data-elev="1"
        >
          Leave
        </button>
      </div>

      <section className="clay mt-5 p-3 sm:p-4" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="h-[180px]">
          <Chat messages={state.chat} onSend={party.chat} placeholder="GG…" compact={false} />
        </div>
      </section>
    </div>
  );
}
