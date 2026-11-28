'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Segmented } from '@pinpoint/ui';
import type { Difficulty } from '@pinpoint/game';
import { useCountries } from '@/lib/countries';
import { GAMES, type GameId, type Length } from '@/lib/games';
import { inPeriod, useHistory, type GameRecord, type Period, type PlayedBy } from '@/lib/history';
import { DIFFICULTIES } from '@/lib/modes';
import { TIERS, usePassport, type StampTier } from '@/lib/passport';
import { SCOPES } from '@/lib/scopes';
import { Avatar } from '../game/Avatar';

type Board = GameId | 'passport';
const BOARDS: { id: Board; label: string }[] = [
  { id: 'guess-flag', label: 'Guess the Flag' },
  { id: 'pin-drop', label: 'Pin Drop' },
  { id: 'find-region', label: 'Find the Region' },
  { id: 'silhouette', label: 'Silhouette' },
  { id: 'passport', label: 'Passport' },
];
const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
];
const lengthLabel = (l: Length) => (l === 'all' ? 'Every country' : l === 'endless' ? 'Endless' : `${l} rounds`);
const scopeLabel = (id: string) => SCOPES.find((s) => s.id === id)?.label ?? id;
const levelLabel = (d: Difficulty) => DIFFICULTIES.find((x) => x.id === d)?.label ?? d;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return day(iso);
};

interface Run extends PlayedBy {
  g: GameRecord;
}

function Chip({ on, onClick, children, tint = 'accent' }: { on: boolean; onClick: () => void; children: React.ReactNode; tint?: string }) {
  return (
    <button role="radio" aria-checked={on} onClick={onClick} className={`clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold ${on ? `clay-tint tint-${tint}` : 'clay clay-interactive text-[var(--ink-2)]'}`} data-elev="1">
      {children}
    </button>
  );
}

/** three clay pillars; first place in the middle and tallest */
function Podium({ runs, rounds }: { runs: Run[]; rounds: (r: Run) => string }) {
  const order = [1, 0, 2];
  const heights = [148, 112, 88];
  const tones = ['#f2c14e', '#b9c3cf', '#d99a6c'];
  return (
    <div className="flex items-end justify-center gap-3 pt-6 sm:gap-5" aria-label="Top three">
      {order.map((i) => {
        const r = runs[i];
        return (
          <div key={i} className="flex w-[30%] max-w-[170px] flex-col items-center">
            {r ? (
              <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + (2 - i) * 0.1 }}>
                <Avatar color={r.color} size={i === 0 ? 64 : 52} mood={i === 0 ? 'happy' : 'idle'} />
                <p className="mt-1 max-w-full truncate text-sm font-black">{r.name}</p>
                <p className="text-lg font-black tabular-nums leading-tight">{r.score.toLocaleString('en')}</p>
                <p className="mb-2 text-[11px] font-bold text-[var(--ink-3)]">{rounds(r)}</p>
              </motion.div>
            ) : (
              <p className="mb-3 text-xs font-bold text-[var(--ink-3)]">open spot</p>
            )}
            <motion.div
              className="clay relative flex w-full items-start justify-center pt-3"
              data-elev="2"
              style={{ borderRadius: '20px 20px 10px 10px', background: `linear-gradient(180deg, color-mix(in oklab, ${tones[i]} 92%, white), color-mix(in oklab, ${tones[i]} 70%, var(--surface)))` }}
              initial={{ height: 0 }}
              animate={{ height: heights[i] }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: (2 - i) * 0.1 }}
            >
              <span className="text-3xl font-black text-white/90" style={{ textShadow: '0 2px 0 rgba(0,0,0,.18)' }}>
                {i + 1}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function PassportBoard() {
  const all = useCountries();
  const stamps = usePassport((s) => s.stamps);
  const list = Object.values(stamps);
  const byCode = useMemo(() => new Map((all ?? []).map((c) => [c.code, c])), [all]);
  const regions = useMemo(() => {
    const out = new Map<string, { total: number; got: number }>();
    for (const c of all ?? []) {
      if (!c.un195) continue;
      const r = out.get(c.region) ?? { total: 0, got: 0 };
      r.total++;
      if (stamps[c.code]) r.got++;
      out.set(c.region, r);
    }
    return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [all, stamps]);
  const counts = { entry: 0, postage: 0, tag: 0 } as Record<StampTier, number>;
  list.forEach((s) => counts[s.tier]++);
  const recent = [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="clay p-5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Stamps by continent</p>
        <ul className="mt-3 space-y-3">
          {regions.map(([name, r]) => (
            <li key={name}>
              <div className="flex justify-between text-sm font-extrabold">
                <span>{name}</span>
                <span className="tabular-nums text-[var(--ink-2)]">
                  {r.got} / {r.total}
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink)_8%,transparent)]">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--c3))' }} initial={{ width: 0 }} animate={{ width: `${(r.got / r.total) * 100}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="clay p-5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Your collection</p>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {(Object.keys(TIERS) as StampTier[]).map((t) => (
            <div key={t} className="clay rounded-2xl px-3 py-2.5 text-center" data-elev="1">
              <dd className="text-2xl font-black tabular-nums">{counts[t]}</dd>
              <dt className="text-[11px] font-extrabold text-[var(--ink-3)]">{TIERS[t].label}</dt>
            </div>
          ))}
        </dl>
        {recent.length ? (
          <ul className="mt-4 space-y-1.5">
            {recent.map((s) => {
              const c = byCode.get(s.code);
              return (
                <li key={s.code} className="flex items-center gap-2.5 text-sm font-bold">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c && <img src={c.flagSquare} alt="" className="h-6 w-6 rounded-full object-cover" />}
                  <span className="flex-1 truncate">{c?.name ?? s.code}</span>
                  <span className="text-xs text-[var(--ink-3)]">{TIERS[s.tier].label}</span>
                  <span className="tabular-nums">{s.score}/10</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm font-bold text-[var(--ink-2)]">No stamps yet. Pass a country entry exam to start your collection.</p>
        )}
        <Link href="/passport" className="clay-tint tint-accent clay-focus mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-black">
          Open my passport →
        </Link>
      </div>
    </div>
  );
}

export function LeaderboardScreen() {
  const games = useHistory((s) => s.games);
  const stampCount = usePassport((s) => Object.keys(s.stamps).length);
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board>('guess-flag');
  const [period, setPeriod] = useState<Period>('all');
  const [level, setLevel] = useState<Difficulty>('tourist');
  const [length, setLength] = useState<Length>(10);

  // open on whatever was played last
  useEffect(() => {
    setMounted(true);
    const last = useHistory.getState().games.at(-1);
    if (last) {
      setBoard(last.game);
      setLevel(last.difficulty);
      setLength(last.length);
    }
  }, []);

  const game = board === 'passport' ? null : GAMES[board];
  const runs = useMemo(() => {
    if (!game) return [];
    return games
      .filter((g) => g.game === game.id && g.difficulty === level && g.length === length && inPeriod(g.at, period))
      .flatMap((g) => g.players.map((p) => ({ ...p, g })))
      .sort((a, b) => b.score - a.score || a.g.at.localeCompare(b.g.at));
  }, [games, game, level, length, period]);

  const wins = games.filter((g) => g.players.length > 1 && g.players[0].score > Math.max(...g.players.slice(1).map((p) => p.score))).length;
  const podiums = games.filter((g) => g.players.length > 1 && [...g.players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === 'you') < 3).length;
  const recent = [...games].reverse().slice(0, 6);
  const rounds = (r: Run) => (r.g.game === 'pin-drop' ? `${r.right} bullseye${r.right === 1 ? '' : 's'}` : `${r.right}/${r.g.rounds} right`);

  const pickBoard = (b: Board) => {
    setBoard(b);
    if (b !== 'passport' && !GAMES[b].lengths.includes(length)) setLength(GAMES[b].defaultLength);
  };

  if (!mounted) return <div className="min-h-[60vh]" />;

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="px-1">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Leaderboard</h1>
        <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">Your best runs and the bots you played with, on this device.</p>
      </div>

      {/* which board: local now, the rest with accounts */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Boards">
        <span role="tab" aria-selected className="clay-tint tint-c3 rounded-full px-4 py-1.5 text-sm font-black">
          This device
        </span>
        {['Global', 'My country', 'Friends'].map((t) => (
          <span key={t} role="tab" aria-selected={false} aria-disabled className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold text-[var(--ink-3)]" style={{ background: 'color-mix(in oklab, var(--surface) 85%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--ink) 8%, transparent)' }} title="Opens with accounts">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V8a3 3 0 0 0-6 0z" />
            </svg>
            {t}
          </span>
        ))}
      </div>

      {/* you at a glance */}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Games played', value: games.length },
          { label: 'Wins vs bots', value: wins },
          { label: 'Podium finishes', value: podiums },
          { label: 'Passport stamps', value: stampCount },
        ].map((s) => (
          <div key={s.label} className="clay rounded-2xl px-4 py-3" data-elev="1">
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{s.label}</dt>
            <dd className="mt-0.5 text-2xl font-black tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* board picker */}
      <div className="clay mt-5 space-y-3 p-4 sm:p-5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Game">
          {BOARDS.map((b) => (
            <Chip key={b.id} on={board === b.id} onClick={() => pickBoard(b.id)} tint="c2">
              {b.label}
            </Chip>
          ))}
        </div>
        {game && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Segmented label="Level" value={level} onChange={(d: Difficulty) => setLevel(d)} options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))} />
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Length">
              {game.lengths.map((l) => (
                <Chip key={String(l)} on={length === l} onClick={() => setLength(l)}>
                  {lengthLabel(l)}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Period">
              {PERIODS.map((p) => (
                <Chip key={p.id} on={period === p.id} onClick={() => setPeriod(p.id)} tint="c4">
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${board}-${level}-${String(length)}-${period}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="mt-5">
          {board === 'passport' ? (
            <PassportBoard />
          ) : runs.length === 0 ? (
            <div className="clay flex flex-col items-center px-6 py-12 text-center" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
              <Avatar color="#8e6cf0" size={64} mood="thinking" />
              <p className="mt-3 text-xl font-black">No runs here yet</p>
              <p className="mt-1 max-w-sm text-sm font-bold text-[var(--ink-2)]">
                Play {game!.title} on {levelLabel(level)}, {lengthLabel(length).toLowerCase()}
                {period !== 'all' ? (period === 'today' ? ' today' : ' this week') : ''} to claim the top spot. Add bots for some company on the board.
              </p>
              <Link href={`/play/${game!.id}`} className="clay-tint tint-accent clay-focus mt-5 rounded-full px-6 py-3 font-black">
                Play {game!.title}
              </Link>
            </div>
          ) : (
            <>
              <Podium runs={runs.slice(0, 3)} rounds={rounds} />
              {runs.length > 3 && (
                <ol className="mt-4 space-y-2" start={4} aria-label="More runs">
                  {runs.slice(3, 20).map((r, i) => (
                    <motion.li
                      key={`${r.g.id}-${r.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.bot ? '' : 'clay'}`}
                      data-elev={r.bot ? undefined : '1'}
                      style={r.bot ? { background: 'color-mix(in oklab, var(--surface) 82%, transparent)' } : undefined}
                    >
                      <span className="w-6 text-center text-sm font-black tabular-nums text-[var(--ink-3)]">{i + 4}</span>
                      <Avatar color={r.color} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {r.name}
                          {r.bot && <span className="ml-1.5 text-[10px] font-extrabold uppercase text-[var(--ink-3)]">bot</span>}
                        </p>
                        <p className="truncate text-[11px] font-bold text-[var(--ink-3)]">
                          {rounds(r)} · {scopeLabel(r.g.scope)}
                          {r.g.game === 'pin-drop' ? (r.g.borders ? ' · borders' : ' · no borders') : ''} · {day(r.g.at)}
                        </p>
                      </div>
                      <span className="font-black tabular-nums">{r.score.toLocaleString('en')}</span>
                    </motion.li>
                  ))}
                </ol>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* recent games */}
      {recent.length > 0 && (
        <section className="mt-8" aria-labelledby="recent">
          <h2 id="recent" className="px-1 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">
            Recent games
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {recent.map((g) => {
              const ranked = [...g.players].sort((a, b) => b.score - a.score);
              const place = ranked.findIndex((p) => p.id === 'you') + 1;
              const me = g.players.find((p) => p.id === 'you');
              return (
                <li key={g.id} className="clay flex items-center gap-3 rounded-2xl px-3.5 py-3" data-elev="1">
                  <span className="text-xl" aria-hidden>
                    {g.players.length > 1 ? (['🥇', '🥈', '🥉'][place - 1] ?? '🎯') : '🎯'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{GAMES[g.game].title}</p>
                    <p className="truncate text-[11px] font-bold text-[var(--ink-3)]">
                      {levelLabel(g.difficulty)} · {lengthLabel(g.length)} · {scopeLabel(g.scope)}
                      {g.players.length > 1 ? ` · ${place} of ${g.players.length}` : ' · solo'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums">{me?.score.toLocaleString('en')}</p>
                    <p className="text-[11px] font-bold text-[var(--ink-3)]">{ago(g.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
