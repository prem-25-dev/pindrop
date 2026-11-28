'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { deleteAccount, signOut, syncNow, useAccount } from '@/lib/account';
import { useHistory } from '@/lib/history';
import { useLook } from '@/lib/look';
import { usePassport } from '@/lib/passport';
import { ratingFrom } from '@/lib/progress';
import { useCoins, useWallet } from '@/lib/wallet';
import { Coin } from '../Coin';
import { Avatar } from '../game/Avatar';

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="clay px-4 py-3 text-center" data-elev="1" style={{ borderRadius: 'var(--radius)' }}>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
    </div>
  );
}

export function AccountScreen() {
  const router = useRouter();
  const { status, user, sync, savedAt } = useAccount();
  const look = useLook();
  const name = usePassport((s) => s.name);
  const stamps = usePassport((s) => Object.keys(s.stamps).length);
  const games = useHistory((s) => s.games);
  const owned = useWallet((s) => s.owned.length);
  const coins = useCoins();
  const [confirm, setConfirm] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (status === 'guest') router.replace('/login');
  }, [status, router]);

  if (!mounted || status !== 'signed-in' || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Checking your account…
        </p>
      </div>
    );
  }

  const rating = ratingFrom(games);
  const syncText = sync === 'saving' ? 'Saving…' : sync === 'error' ? 'Could not save. It will try again.' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Up to date';

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <section className="clay flex flex-col items-center gap-5 p-6 sm:flex-row" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <Avatar color={look.color} size={110} mood="happy" hat={look.hat} glasses={look.glasses} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="truncate text-3xl font-black tracking-tight">{name}</h1>
          {look.title && <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent)]">{look.title}</p>}
          <p className="mt-1 truncate text-sm font-bold text-[var(--ink-2)]">{user.email}</p>
          <p className="text-xs font-bold text-[var(--ink-3)]">
            Signed in with {user.google && user.password ? 'Google and a password' : user.google ? 'Google' : 'email'} · member since {new Date(user.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link href="/customize" className="clay-tint tint-accent clay-focus inline-flex h-10 items-center rounded-full px-5 text-sm font-black">
              Customise
            </Link>
            <Link href="/passport" className="clay clay-interactive clay-focus inline-flex h-10 items-center rounded-full px-5 text-sm font-black" data-elev="1">
              Passport
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Games" value={games.length} />
        <Stat label="Stamps" value={stamps} />
        <Stat label="Items" value={owned} />
        <Stat
          label="Coins"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Coin size={20} />
              {coins.toLocaleString('en')}
            </span>
          }
        />
        <Stat label={rating.placed ? rating.tier.label : 'Ranked'} value={rating.placed ? rating.rating : '–'} />
      </div>

      <section className="clay flex flex-wrap items-center justify-between gap-3 p-4" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div>
          <p className="font-black">Sync</p>
          <p className="text-sm font-bold text-[var(--ink-2)]">Your passport, games, coins and items are saved to your account. {syncText}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => syncNow()} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-black" data-elev="1">
            Save now
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-black" data-elev="1"
          >
            Sign out
          </button>
        </div>
      </section>

      <details className="clay p-4" data-elev="1" style={{ borderRadius: 'var(--radius-lg)' }}>
        <summary className="cursor-pointer font-black text-[var(--ink-2)]">Delete account</summary>
        <p className="mt-2 text-sm font-bold text-[var(--ink-2)]">This removes your account and the progress saved with it from the server. It cannot be undone. What is on this device stays here.</p>
        <label className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Type DELETE to confirm</span>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="clay-well h-10 rounded-full px-4 font-bold outline-none" />
          <button
            disabled={confirm !== 'DELETE'}
            onClick={async () => {
              const r = await deleteAccount();
              if (r.ok) router.push('/');
            }}
            className="clay-focus h-10 rounded-full px-5 text-sm font-black text-white disabled:opacity-40"
            style={{ background: 'var(--bad)' }}
          >
            Delete forever
          </button>
        </label>
      </details>
    </div>
  );
}
