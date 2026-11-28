'use client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClayIcon } from '@pinpoint/ui';
import { CODE_ALPHABET, CODE_LENGTH } from '@pinpoint/game';
import { createRoom } from '@/lib/party';
import { AVATAR_COLORS, usePassport } from '@/lib/passport';
import { Avatar } from '../game/Avatar';

/** create a room, or join one with its code */
export function PartyHome({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const { name, color, setProfile } = usePassport();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState<'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  const cleanCode = code.toUpperCase().split('').filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);
  const create = async () => {
    setBusy('create');
    setError(null);
    const r = await createRoom(name, color);
    setBusy(null);
    if (r.ok) router.push(`/party/${r.code}`);
    else setError(r.error);
  };
  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanCode.length === CODE_LENGTH) router.push(`/party/${cleanCode}`);
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-6 px-1">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Party Rooms</h1>
        <p className="mt-1 max-w-xl text-sm font-bold text-[var(--ink-2)]">Play any game with friends, live. Share a code, vote on the game, and race the same flags and maps at the same time.</p>
      </div>

      {/* you */}
      <section className="clay mb-4 flex flex-wrap items-center gap-4 p-4 sm:p-5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <Avatar color={mounted ? color : AVATAR_COLORS[0]} size={56} mood="happy" />
        <label className="min-w-[200px] flex-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Your name in the room</span>
          <input
            value={mounted ? name : ''}
            onChange={(e) => setProfile({ name: e.target.value.slice(0, 20) })}
            maxLength={20}
            className="clay-well mt-1 h-11 w-full rounded-full px-4 text-base font-black outline-none"
            placeholder="Traveller"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Your colour">
          {AVATAR_COLORS.map((c) => (
            <button key={c} role="radio" aria-checked={color === c} aria-label={`Colour ${c}`} onClick={() => setProfile({ color: c })} className="clay-focus h-8 w-8 rounded-full transition-transform hover:scale-110" style={{ background: c, boxShadow: mounted && color === c ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}` : 'inset -2px -3px 4px rgba(0,0,0,.18), inset 2px 2px 3px rgba(255,255,255,.4)' }} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.section className="clay flex flex-col p-5 sm:p-6" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <ClayIcon name="party" size={52} />
          <h2 className="mt-3 text-xl font-black">Host a room</h2>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">You get a code, a link and a QR code. Up to 50 players.</p>
          <button onClick={create} disabled={!!busy} className="clay-tint tint-accent clay-focus mt-5 h-12 rounded-full px-6 text-base font-black disabled:opacity-60">
            {busy ? 'Opening a room…' : 'Create a room'}
          </button>
        </motion.section>

        <motion.form onSubmit={joinRoom} className="clay flex flex-col p-5 sm:p-6" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <ClayIcon name="play" size={52} />
          <h2 className="mt-3 text-xl font-black">Join a room</h2>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">Type the {CODE_LENGTH}-letter code from the host.</p>
          <label className="mt-5 flex gap-2">
            <span className="sr-only">Room code</span>
            <input
              value={cleanCode}
              onChange={(e) => setCode(e.target.value)}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCDE"
              className="clay-well h-12 min-w-0 flex-1 rounded-full px-5 text-center font-mono text-xl font-black uppercase tracking-[.35em] outline-none placeholder:text-[var(--ink-3)] placeholder:opacity-50"
            />
            <button type="submit" disabled={cleanCode.length !== CODE_LENGTH} className="clay clay-interactive clay-focus h-12 rounded-full px-6 text-base font-black disabled:opacity-50" data-elev="1">
              Join
            </button>
          </label>
        </motion.form>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl px-4 py-3 text-sm font-bold" role="alert" style={{ background: 'color-mix(in oklab, var(--bad) 12%, transparent)', color: 'var(--bad)' }}>
          {error}
        </p>
      )}

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Share the code', 'Friends join from any phone or laptop with the code, the link or the QR.'],
          ['Vote the game', 'Everyone votes on the game, level and region. The host breaks ties.'],
          ['Play live', 'Same question for everyone. Type guesses in the chat, drop pins, race the clock.'],
        ].map(([t, b], i) => (
          <li key={t} className="rounded-3xl p-4" style={{ background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}>
            <p className="text-xs font-black text-[var(--accent)]">STEP {i + 1}</p>
            <p className="mt-1 font-black">{t}</p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">{b}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
