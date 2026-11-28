'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signIn, signUp, useAccount } from '@/lib/account';
import { useLook } from '@/lib/look';
import { usePassport } from '@/lib/passport';
import { Avatar } from '../game/Avatar';

const ERRORS: Record<string, string> = {
  'google-off': 'Google sign-in is not set up on this server yet. Use email for now.',
  'google-state': 'That Google sign-in expired. Try again.',
  'google-token': 'Google did not confirm the sign-in. Try again.',
  'google-email': 'Your Google account has no verified email.',
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const status = useAccount((s) => s.status);
  const providers = useAccount((s) => s.providers);
  const passportName = usePassport((s) => s.name);
  const look = useLook();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const e = p.get('error');
    if (e) setError(ERRORS[e] ?? 'Sign-in did not work. Try again.');
    if (p.get('mode') === 'signup') setMode('up');
  }, []);
  useEffect(() => {
    if (status === 'signed-in') router.replace('/account');
  }, [status, router]);
  useEffect(() => setName((n) => n || (passportName !== 'Traveller' ? passportName : '')), [passportName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.push('/account');
  };

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-6 pb-10 pt-4 md:grid-cols-[1fr_minmax(0,420px)]">
      <div className="hidden flex-col items-center text-center md:flex">
        <Avatar color={look.color} size={160} mood="happy" hat={look.hat} glasses={look.glasses} />
        <h1 className="mt-4 text-3xl font-black tracking-tight">Keep your passport safe</h1>
        <p className="mt-2 max-w-xs font-bold text-[var(--ink-2)]">Sign in to keep your stamps, coins, items and stats on every device. Everything you have on this device comes with you.</p>
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="clay p-6 sm:p-7" data-elev="3" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="clay-well mb-5 grid grid-cols-2 gap-1 rounded-full p-1" role="tablist" aria-label="Sign in or create an account">
          {(['in', 'up'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`clay-focus rounded-full py-2 text-sm font-black ${mode === m ? 'clay' : 'text-[var(--ink-2)]'}`} data-elev={mode === m ? '2' : undefined}>
              {m === 'in' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <a
          href={providers.google ? '/api/auth/google' : undefined}
          aria-disabled={!providers.google}
          onClick={(e) => {
            if (!providers.google) {
              e.preventDefault();
              setError(ERRORS['google-off']);
            }
          }}
          className={`clay clay-focus flex h-12 w-full items-center justify-center gap-2.5 rounded-full font-black ${providers.google ? 'clay-interactive' : 'opacity-60'}`}
          data-elev="1"
        >
          <GoogleMark />
          Continue with Google
        </a>

        <div className="my-4 flex items-center gap-3 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          or with email
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'up' && (
            <label className="block">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" className="clay-well mt-1 h-12 w-full rounded-full px-4 font-bold outline-none" placeholder="What should we call you?" />
            </label>
          )}
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="clay-well mt-1 h-12 w-full rounded-full px-4 font-bold outline-none" />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Password{mode === 'up' && ' (8 or more characters)'}</span>
            <input type="password" required minLength={mode === 'up' ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="clay-well mt-1 h-12 w-full rounded-full px-4 font-bold outline-none" />
          </label>
          {error && (
            <p className="rounded-2xl px-4 py-2.5 text-sm font-bold" role="alert" style={{ background: 'color-mix(in oklab, var(--bad) 12%, transparent)', color: 'var(--bad)' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="clay-tint tint-accent clay-focus h-12 w-full rounded-full text-base font-black disabled:opacity-60">
            {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs font-bold text-[var(--ink-3)]">
          No account needed to play. <Link href="/play" className="underline underline-offset-2">Keep playing as a guest</Link>
        </p>
      </motion.section>
    </div>
  );
}
