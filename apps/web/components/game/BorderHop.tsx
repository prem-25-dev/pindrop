'use client';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { judge, randomSeed } from '@pinpoint/game';
import { borderGraph, makePuzzle, starsFor, todayKey, type HopPuzzle } from '@/lib/borderHop';
import { useCountries, type CountryIndexItem } from '@/lib/countries';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { ClayFlag } from '../ClayFlag';
import { ClayRelief } from '../passport/Book';
import { Confetti } from './shared';
import { play } from '@/lib/sound';
import { useWallet } from '@/lib/wallet';

type Status = 'play' | 'won' | 'gave-up';
const COLORS = { from: '#2fa36b', to: '#e2603a', hop: '#4f7fd1', best: '#f2b53c', land: '#e6ddcd' };

/** the part of the map around the route, with the start, the target and your hops coloured in */
function HopMap({ world, codes, from, to, chain, reveal }: { world: WorldShapes; codes: string[]; from: string; to: string; chain: string[]; reveal: string[] }) {
  const byCode = useMemo(() => new Map(world.shapes.map((s) => [s.code, s])), [world]);
  const box = useMemo(() => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const c of codes) {
      const s = byCode.get(c);
      if (!s) continue;
      x0 = Math.min(x0, s.box[0][0]);
      y0 = Math.min(y0, s.box[0][1]);
      x1 = Math.max(x1, s.box[1][0]);
      y1 = Math.max(y1, s.box[1][1]);
    }
    const w = x1 - x0;
    const h = y1 - y0;
    const pad = Math.max(w, h) * 0.35 + 8;
    // keep a landscape frame
    const W = Math.max(w + pad * 2, (h + pad * 2) * 1.5);
    const H = W / 1.5;
    return [(x0 + x1) / 2 - W / 2, (y0 + y1) / 2 - H / 2, W, H];
  }, [codes, byCode]);
  const k = 600 / box[2]; // scale up, so the clay filter reads the same at any zoom
  const fill = (code: string) => (code === from ? COLORS.from : code === to ? COLORS.to : chain.includes(code) ? COLORS.hop : reveal.includes(code) ? COLORS.best : null);
  return (
    <svg viewBox={`${box[0] * k} ${box[1] * k} ${box[2] * k} ${box[3] * k}`} className="block h-full w-full" role="img" aria-label="Map of the route">
      <defs>
        <ClayRelief id="hop-relief" soft={1.8} depth={3} />
      </defs>
      <g transform={`scale(${k})`}>
        {world.shapes.map((s) => (
          <path key={s.code} d={s.d} fill={COLORS.land} stroke="#fff" strokeWidth={0.6 / k} />
        ))}
      </g>
      <g filter="url(#hop-relief)">
        <g transform={`scale(${k})`}>
          {world.shapes.map((s) => {
            const f = fill(s.code);
            return f ? <path key={s.code} d={s.d} fill={f} stroke="#fff" strokeWidth={0.8 / k} /> : null;
          })}
        </g>
      </g>
    </svg>
  );
}

function Chip({ c, tone, dashed = false }: { c: CountryIndexItem; tone: string; dashed?: boolean }) {
  return (
    <motion.span layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-black ${dashed ? 'border-2 border-dashed' : 'clay'}`} data-elev={dashed ? undefined : '1'} style={dashed ? { borderColor: tone, color: tone } : undefined}>
      <ClayFlag src={c.flag} width={30} depth={2} />
      <span style={dashed ? undefined : { color: tone }}>{c.name}</span>
    </motion.span>
  );
}

export function BorderHop() {
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [daily, setDaily] = useState(true);
  const [chain, setChain] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('play');
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ text: string; tone: 'bad' | 'good' | 'info' } | null>(null);
  const [hints, setHints] = useState(0);
  const [showNeighbours, setShowNeighbours] = useState(false);
  const [fire, setFire] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWorldShapes().then(setWorld).catch(() => {});
    setSeed(`daily:${todayKey()}`);
  }, []);

  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);
  const graph = useMemo(() => (list ? borderGraph(list) : null), [list]);
  const un = useMemo(() => (list ?? []).filter((c) => c.un195), [list]);
  const puzzle: HopPuzzle | null = useMemo(() => (graph && seed ? makePuzzle(graph, seed) : null), [graph, seed]);

  // a new puzzle starts from its first country
  useEffect(() => {
    if (!puzzle) return;
    setChain([puzzle.from]);
    setStatus('play');
    setHints(0);
    setShowNeighbours(false);
    setNote(null);
    setText('');
  }, [puzzle]);

  if (!list || !world || !puzzle || !graph) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Drawing the borders…
        </p>
      </div>
    );
  }

  const from = byCode.get(puzzle.from)!;
  const to = byCode.get(puzzle.to)!;
  const current = chain[chain.length - 1];
  const hops = chain.length - 1;
  const best = puzzle.best.length - 1;
  const neighbours = (graph.get(current) ?? []).map((c) => byCode.get(c)!).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

  const hop = (code: string) => {
    if (status !== 'play') return;
    const c = byCode.get(code);
    if (!c) return;
    if (chain.includes(code)) return setNote({ text: `You have already been to ${c.name}`, tone: 'info' });
    if (!graph.get(current)?.includes(code)) {
      play('wrong');
      return setNote({ text: `${c.name} does not border ${byCode.get(current)?.name}`, tone: 'bad' });
    }
    const next = [...chain, code];
    setChain(next);
    setShowNeighbours(false);
    if (code === puzzle.to) {
      setStatus('won');
      play('win');
      useWallet.getState().earn(`hop:${seed}`, 8 * starsFor(next.length - 1, puzzle.best.length - 1, hints), 'Border Hop');
      setFire((f) => f + 1);
      setNote({ text: `You made it in ${next.length - 1} hops`, tone: 'good' });
    } else {
      play('pop');
      setNote({ text: `Into ${c.name}`, tone: 'good' });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const v = judge(t, to, un, 'navigator');
    setText('');
    if (!v.matched) return setNote({ text: `"${t}" is not a country we know`, tone: 'bad' });
    hop(v.matched);
  };

  const newPuzzle = (isDaily: boolean) => {
    setDaily(isDaily);
    setSeed(isDaily ? `daily:${todayKey()}` : randomSeed());
    setTimeout(() => input.current?.focus(), 50);
  };

  const stars = status === 'won' ? starsFor(hops, best, hints) : 0;
  const mapCodes = [puzzle.from, puzzle.to, ...chain, ...(status === 'gave-up' ? puzzle.best : [])];

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Border Hop</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">
            Get from <span style={{ color: COLORS.from }}>{from.name}</span> to <span style={{ color: COLORS.to }}>{to.name}</span> by land, one neighbour at a time. Best route: {best} hops.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => newPuzzle(true)} className={`clay-focus rounded-full px-4 py-2 text-sm font-extrabold ${daily ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`} data-elev="1">
            Today&apos;s hop
          </button>
          <button onClick={() => newPuzzle(false)} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
            New random hop
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="clay relative aspect-[3/2] overflow-hidden" data-elev="2" style={{ borderRadius: 'var(--radius-lg)', background: '#cfe5f5' }}>
          <HopMap world={world} codes={mapCodes} from={puzzle.from} to={puzzle.to} chain={chain} reveal={status === 'gave-up' ? puzzle.best : []} />
          <div className="absolute left-1/2 top-1/2">
            <Confetti fire={fire} />
          </div>
        </section>

        <section className="clay flex flex-col p-4 sm:p-5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Your route · {hops} {hops === 1 ? 'hop' : 'hops'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AnimatePresence initial={false}>
              {chain.map((code, i) => (
                <motion.span key={code} layout className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[var(--ink-3)]" aria-hidden>→</span>}
                  <Chip c={byCode.get(code)!} tone={i === 0 ? COLORS.from : code === puzzle.to ? COLORS.to : COLORS.hop} />
                </motion.span>
              ))}
            </AnimatePresence>
            {status === 'play' && (
              <>
                <span className="text-[var(--ink-3)]" aria-hidden>→ … →</span>
                <Chip c={to} tone={COLORS.to} dashed />
              </>
            )}
          </div>

          {status === 'play' ? (
            <>
              <form onSubmit={submit} className="mt-4 flex gap-2">
                <label className="clay-well flex h-12 flex-1 items-center rounded-full px-4">
                  <span className="sr-only">A country that borders {byCode.get(current)?.name}</span>
                  <input ref={input} value={text} onChange={(e) => setText(e.target.value)} autoFocus autoComplete="off" spellCheck={false} placeholder={`A neighbour of ${byCode.get(current)?.name}…`} className="w-full bg-transparent text-base font-bold outline-none placeholder:text-[var(--ink-3)]" />
                </label>
                <button type="submit" className="clay-tint tint-accent clay-focus h-12 rounded-full px-5 font-black">
                  Hop
                </button>
              </form>
              <AnimatePresence mode="wait">
                {note && (
                  <motion.p key={note.text} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm font-black" role="status" style={{ color: note.tone === 'bad' ? 'var(--bad)' : note.tone === 'good' ? 'var(--c4)' : 'var(--ink-2)' }}>
                    {note.text}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (!showNeighbours) setHints((h) => h + 1);
                    setShowNeighbours(true);
                  }}
                  disabled={showNeighbours}
                  className="clay clay-interactive clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold text-[var(--ink-2)] disabled:opacity-60"
                  data-elev="1"
                >
                  Show neighbours (costs a star)
                </button>
                <button onClick={() => chain.length > 1 && setChain(chain.slice(0, -1))} disabled={chain.length < 2} className="clay clay-interactive clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold text-[var(--ink-2)] disabled:opacity-50" data-elev="1">
                  Undo
                </button>
                <button
                  onClick={() => {
                    setStatus('gave-up');
                    setNote({ text: `A best route: ${puzzle.best.map((c) => byCode.get(c)?.name).join(' → ')}`, tone: 'info' });
                  }}
                  className="clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold text-[var(--ink-3)] hover:text-[var(--bad)]"
                >
                  Give up
                </button>
              </div>
              {showNeighbours && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {neighbours.map((c) => (
                    <button key={c.code} onClick={() => hop(c.code)} disabled={chain.includes(c.code)} className="clay clay-interactive clay-focus flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-black disabled:opacity-40" data-elev="1">
                      <ClayFlag src={c.flag} width={24} depth={2} />
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              {status === 'won' ? (
                <>
                  <p className="text-2xl font-black" style={{ color: 'var(--c4)' }}>
                    {hops <= best ? 'Perfect route!' : `Made it in ${hops} hops`}
                  </p>
                  <p className="mt-1 text-3xl" aria-label={`${stars} of 3 stars`}>
                    {Array.from({ length: 3 }, (_, i) => (
                      <span key={i} style={{ color: i < stars ? '#f2b53c' : 'color-mix(in oklab, var(--ink) 15%, transparent)' }}>
                        ★
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">
                    Best route: {best} hops{hints ? ` · ${hints} hint used` : ''}.
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-[var(--ink-2)]">{note?.text}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => newPuzzle(false)} className="clay-tint tint-accent clay-focus h-11 rounded-full px-6 font-black">
                  Next hop
                </button>
                <Link href="/play" className="clay clay-interactive clay-focus inline-flex h-11 items-center rounded-full px-5 font-black" data-elev="1">
                  More games
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
