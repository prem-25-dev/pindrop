'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ClayIcon, type ClayIconName } from '@pinpoint/ui';
import { PARTY_GAMES, PARTY_LEVELS, PARTY_MAX_PLAYERS, PARTY_ROUNDS, PARTY_SCOPES, PARTY_TIMERS, type PartyGame, type PartyState } from '@pinpoint/game';
import { leave, party } from '@/lib/party';
import { DIFFICULTIES } from '@/lib/modes';
import { SCOPES } from '@/lib/scopes';
import { Avatar } from '../game/Avatar';
import { Chat } from '../game/GameRoom';

export const GAME_INFO: Record<PartyGame, { title: string; blurb: string; icon: ClayIconName }> = {
  'guess-flag': { title: 'Guess the Flag', blurb: 'Type the country in the chat', icon: 'flag' },
  'pin-drop': { title: 'Pin Drop', blurb: 'Drop a pin on the country', icon: 'pin' },
  'find-region': { title: 'Find the Region', blurb: 'Tap the country on the map', icon: 'region' },
};
const scopeLabel = (id: string) => SCOPES.find((s) => s.id === id)?.label ?? id;
const levelLabel = (id: string) => DIFFICULTIES.find((d) => d.id === id)?.label ?? id;

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`clay p-4 sm:p-5 ${className}`} data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
      {title && <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{title}</p>}
      {children}
    </section>
  );
}

/** little avatars of who voted for an option */
function Voters({ ids, state }: { ids: string[]; state: PartyState }) {
  if (!ids.length) return null;
  return (
    <span className="flex -space-x-1.5">
      {ids.slice(0, 5).map((id) => {
        const p = state.players.find((x) => x.id === id);
        return p ? <span key={id} className="h-4 w-4 rounded-full ring-2 ring-[var(--surface)]" style={{ background: p.color }} title={p.name} /> : null;
      })}
      {ids.length > 5 && <span className="pl-2 text-[10px] font-black text-[var(--ink-3)]">+{ids.length - 5}</span>}
    </span>
  );
}

function Share({ code }: { code: string }) {
  const [link, setLink] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const url = `${location.origin}/party/${code}`;
    setLink(url);
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2433', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [code]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link is on screen to copy by hand */
    }
  };
  return (
    <Card title="Invite friends">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5" aria-label={`Room code ${code.split('').join(' ')}`}>
            {code.split('').map((ch, i) => (
              <span key={i} className="clay grid h-12 w-10 place-items-center rounded-xl font-mono text-2xl font-black sm:h-14 sm:w-11" data-elev="1">
                {ch}
              </span>
            ))}
          </div>
          <p className="mt-3 truncate text-xs font-bold text-[var(--ink-3)]">{link}</p>
          <button onClick={copy} className="clay clay-interactive clay-focus mt-2 rounded-full px-4 py-2 text-sm font-black" data-elev="1">
            {copied ? 'Link copied ✓' : 'Copy invite link'}
          </button>
        </div>
        {qr && <div className="hidden w-28 shrink-0 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_8px_18px_-8px_var(--clay-drop)] sm:block [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code for the invite link" role="img" />}
      </div>
    </Card>
  );
}

export function Lobby({ state }: { state: PartyState }) {
  const router = useRouter();
  const me = state.players.find((p) => p.id === state.you);
  const isHost = state.hostId === state.you;
  const myVote = state.votes[state.you] ?? {};
  const votersFor = (field: 'game' | 'difficulty' | 'scope', value: string) => Object.entries(state.votes).filter(([, v]) => v[field] === value).map(([id]) => id);
  const s = state.settings;
  const host = state.players.find((p) => p.id === state.hostId);
  const here = state.players.filter((p) => p.connected).length;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Party room</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">Vote on what to play. {isHost ? 'You are the host: you break ties and start the game.' : `${host?.name ?? 'The host'} starts the game.`}</p>
        </div>
        <button
          onClick={() => {
            leave();
            router.push('/party');
          }}
          className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]"
          data-elev="1"
        >
          Leave room
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <Share code={state.code} />

          <Card title={`Players · ${here} here${state.players.length > here ? `, ${state.players.length - here} away` : ''} · max ${PARTY_MAX_PLAYERS}`}>
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {state.players.map((p) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: p.connected ? 1 : 0.5, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 rounded-2xl px-2.5 py-1.5" style={{ background: p.id === state.you ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'color-mix(in oklab, var(--ink) 4%, transparent)' }}>
                    <Avatar color={p.color} size={34} mood={p.connected ? 'happy' : 'idle'} />
                    <span className="min-w-0 flex-1 truncate font-black">
                      {p.name}
                      {p.id === state.you && <span className="ml-1.5 text-xs text-[var(--ink-3)]">you</span>}
                    </span>
                    {p.host && <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: '#d9a53a' }}>HOST</span>}
                    {!p.connected && <span className="text-[10px] font-black text-[var(--ink-3)]">away</span>}
                    {isHost && p.id !== state.you && (
                      <button onClick={() => party.kick(p.id)} className="clay-focus rounded-full px-2 py-0.5 text-[11px] font-black text-[var(--ink-3)] hover:text-[var(--bad)]" aria-label={`Remove ${p.name}`}>
                        Remove
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </Card>

          <Card title="Chat">
            <div className="h-[200px]">
              <Chat messages={state.chat} onSend={party.chat} placeholder="Say hi…" compact={false} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Vote: game">
            <div className="grid gap-2 sm:grid-cols-3">
              {PARTY_GAMES.map((g) => {
                const on = s.game === g;
                const mine = myVote.game === g;
                return (
                  <button
                    key={g}
                    onClick={() => party.vote({ game: g })}
                    aria-pressed={mine}
                    className={`clay-focus relative flex flex-col items-start rounded-3xl p-3.5 text-left transition-transform ${on ? 'clay -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
                    data-elev={on ? '3' : undefined}
                    style={on ? undefined : { background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}
                  >
                    <ClayIcon name={GAME_INFO[g].icon} size={40} />
                    <span className="mt-2 font-black leading-tight">{GAME_INFO[g].title}</span>
                    <span className="mt-0.5 text-xs font-bold text-[var(--ink-3)]">{GAME_INFO[g].blurb}</span>
                    <span className="mt-2 flex min-h-4 items-center gap-2">
                      <Voters ids={votersFor('game', g)} state={state} />
                      {mine && <span className="text-[10px] font-black text-[var(--accent)]">your vote</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Vote: level and region">
            <div className="flex flex-wrap gap-2">
              {PARTY_LEVELS.map((d) => (
                <VoteChip key={d} label={levelLabel(d)} on={s.difficulty === d} mine={myVote.difficulty === d} onClick={() => party.vote({ difficulty: d })} voters={<Voters ids={votersFor('difficulty', d)} state={state} />} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PARTY_SCOPES.map((id) => (
                <VoteChip key={id} label={scopeLabel(id)} on={s.scope === id} mine={myVote.scope === id} onClick={() => party.vote({ scope: id })} voters={<Voters ids={votersFor('scope', id)} state={state} />} />
              ))}
            </div>
          </Card>

          <Card title={isHost ? 'Game settings (host)' : 'Game settings'}>
            <div className="space-y-3">
              <Row label="Rounds">
                {PARTY_ROUNDS.map((n) => (
                  <SetChip key={n} on={s.rounds === n} disabled={!isHost} onClick={() => party.configure({ rounds: n })}>
                    {n}
                  </SetChip>
                ))}
              </Row>
              <Row label="Timer">
                {PARTY_TIMERS.map((t) => (
                  <SetChip key={t} on={s.timer === t} disabled={!isHost} onClick={() => party.configure({ timer: t })}>
                    {t}s
                  </SetChip>
                ))}
              </Row>
              {s.game === 'pin-drop' && (
                <Row label="Map">
                  <SetChip on={!s.borders} disabled={!isHost} onClick={() => party.configure({ borders: false })}>
                    No borders
                  </SetChip>
                  <SetChip on={s.borders} disabled={!isHost} onClick={() => party.configure({ borders: true })}>
                    Borders
                  </SetChip>
                </Row>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
              <p className="text-sm font-bold text-[var(--ink-2)]">
                {GAME_INFO[s.game].title} · {levelLabel(s.difficulty)} · {scopeLabel(s.scope)} · {s.rounds} rounds
              </p>
              {isHost ? (
                <button onClick={party.start} className="clay-tint tint-accent clay-focus h-12 rounded-full px-7 text-base font-black">
                  {here < 2 ? 'Start solo' : `Start with ${here}`}
                </button>
              ) : (
                <p className="clay rounded-full px-4 py-2 text-sm font-black text-[var(--ink-2)]" data-elev="1">
                  Waiting for {host?.name ?? 'the host'}…
                </p>
              )}
            </div>
          </Card>
          {!me && <p className="text-sm font-bold text-[var(--bad)]">You are not in this room any more.</p>}
        </div>
      </div>
    </div>
  );
}

function VoteChip({ label, on, mine, onClick, voters }: { label: string; on: boolean; mine: boolean; onClick: () => void; voters: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={mine}
      className={`clay-focus flex items-center gap-2 rounded-full py-1.5 pl-3.5 pr-2.5 text-sm font-extrabold ${on ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`}
      data-elev={on ? undefined : '1'}
      style={mine && !on ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
    >
      {label}
      {voters}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</span>
      {children}
    </div>
  );
}

function SetChip({ on, disabled, onClick, children }: { on: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold disabled:cursor-default ${on ? 'clay-tint tint-accent' : 'clay text-[var(--ink-2)] enabled:clay-interactive disabled:opacity-60'}`} data-elev={on ? undefined : '1'}>
      {children}
    </button>
  );
}
