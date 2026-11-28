'use client';
import { create } from 'zustand';
import { readDaily, type DailyRecord } from './daily';
import { useHistory, type GameRecord } from './history';
import { usePassport, type Stamp } from './passport';
import { mergeWallets, useWallet } from './wallet';

/*
 * Your account in the browser: who is signed in, and keeping this device and the account in step.
 * On sign-in the account's saved progress is merged with this device (nothing is lost on either
 * side), then every change here is saved back a moment later.
 */

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  google: boolean;
  password: boolean;
  since: string;
}

interface AccountState {
  status: 'loading' | 'guest' | 'signed-in';
  user: AccountUser | null;
  providers: { google: boolean; email: boolean };
  sync: 'idle' | 'saving' | 'saved' | 'error';
  savedAt: number | null;
}

export const useAccount = create<AccountState>(() => ({ status: 'loading', user: null, providers: { google: false, email: true }, sync: 'idle', savedAt: null }));

type Res<T> = ({ ok: true } & T) | { ok: false; error: string };

async function call<T>(url: string, init?: RequestInit): Promise<Res<T>> {
  try {
    const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, credentials: 'same-origin' });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: body.error ?? 'Something went wrong. Try again.' };
    return { ok: true, ...body };
  } catch {
    return { ok: false, error: 'Cannot reach the server. Check your connection.' };
  }
}

/* ---------------- the profile that is saved to the account ---------------- */

interface Profile {
  v: 1;
  passport: Pick<ReturnType<typeof usePassport.getState>, 'name' | 'home' | 'color' | 'issued' | 'number' | 'stamps' | 'tries'>;
  history: GameRecord[];
  wallet: Pick<ReturnType<typeof useWallet.getState>, 'ledger' | 'owned' | 'equipped'>;
  daily: DailyRecord;
  palette?: string | null;
}

function snapshot(): Profile {
  const p = usePassport.getState();
  const w = useWallet.getState();
  let palette: string | null = null;
  try {
    palette = localStorage.getItem('pinpoint-palette');
  } catch {
    /* storage blocked */
  }
  return {
    v: 1,
    passport: { name: p.name, home: p.home, color: p.color, issued: p.issued, number: p.number, stamps: p.stamps, tries: p.tries },
    history: useHistory.getState().games,
    wallet: { ledger: w.ledger, owned: w.owned, equipped: w.equipped },
    daily: readDaily(),
    palette,
  };
}

const RANK: Record<Stamp['tier'], number> = { tag: 1, postage: 2, entry: 3 };

/** combine the account's copy with this device's: the best of both */
function merge(local: Profile, remote: Profile | null): Profile {
  if (!remote) return local;
  const stamps = { ...remote.passport.stamps };
  for (const [code, s] of Object.entries(local.passport.stamps)) {
    const r = stamps[code];
    if (!r || RANK[s.tier] > RANK[r.tier] || (RANK[s.tier] === RANK[r.tier] && s.score > r.score)) stamps[code] = s;
  }
  const tries = { ...remote.passport.tries };
  for (const [code, d] of Object.entries(local.passport.tries)) if (!tries[code] || d > tries[code]) tries[code] = d;
  const games = new Map<string, GameRecord>();
  for (const g of [...remote.history, ...local.history]) games.set(g.id, g);
  const days = { ...(remote.daily?.days ?? {}), ...local.daily.days };
  return {
    v: 1,
    passport: {
      // the account keeps its name and look; this device keeps its own only if the account has none
      name: remote.passport.name || local.passport.name,
      home: remote.passport.home ?? local.passport.home,
      color: remote.passport.color || local.passport.color,
      issued: remote.passport.issued && remote.passport.issued < local.passport.issued ? remote.passport.issued : local.passport.issued,
      number: remote.passport.number || local.passport.number,
      stamps,
      tries,
    },
    history: [...games.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-400),
    wallet: mergeWallets(local.wallet, remote.wallet),
    daily: { days },
    palette: remote.palette ?? local.palette,
  };
}

function apply(p: Profile) {
  usePassport.setState(p.passport);
  useHistory.setState({ games: p.history });
  useWallet.getState().replace(p.wallet);
  try {
    localStorage.setItem('pinpoint-daily', JSON.stringify(p.daily));
    if (p.palette) {
      localStorage.setItem('pinpoint-palette', p.palette);
      document.documentElement.setAttribute('data-palette', p.palette);
    }
  } catch {
    /* storage blocked */
  }
}

/* ---------------- syncing ---------------- */

let unsubs: (() => void)[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

async function save() {
  if (useAccount.getState().status !== 'signed-in') return;
  useAccount.setState({ sync: 'saving' });
  const r = await call('/api/profile', { method: 'PUT', body: JSON.stringify(snapshot()) });
  useAccount.setState(r.ok ? { sync: 'saved', savedAt: Date.now() } : { sync: 'error' });
}
const scheduleSave = () => {
  if (applying) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(save, 1500);
};

function startSync() {
  stopSync();
  unsubs = [usePassport.subscribe(scheduleSave), useHistory.subscribe(scheduleSave), useWallet.subscribe(scheduleSave)];
}
function stopSync() {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (timer) clearTimeout(timer);
  timer = null;
}

/** pull the account's progress, merge it with this device, save the result back */
export async function pullAndMerge() {
  const r = await call<{ profile: Profile | null }>('/api/profile');
  if (!r.ok) return;
  applying = true;
  apply(merge(snapshot(), r.profile));
  applying = false;
  startSync();
  await save();
}

/* ---------------- actions ---------------- */

let started = false;
/** once per page load: find out who is signed in */
export async function initAccount() {
  if (started) return;
  started = true;
  const r = await call<{ user: AccountUser | null; providers: AccountState['providers'] }>('/api/auth/me');
  if (!r.ok) return useAccount.setState({ status: 'guest' });
  useAccount.setState({ user: r.user, providers: r.providers, status: r.user ? 'signed-in' : 'guest' });
  if (r.user) await pullAndMerge();
}

async function signedIn(user: AccountUser) {
  useAccount.setState({ user, status: 'signed-in' });
  // a brand-new account takes the passport name you already chose here
  await pullAndMerge();
}

export async function signUp(email: string, password: string, name: string) {
  const r = await call<{ user: AccountUser }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) });
  if (r.ok) {
    if (name.trim()) usePassport.getState().setProfile({ name: name.trim().slice(0, 20) });
    await signedIn(r.user);
  }
  return r;
}

export async function signIn(email: string, password: string) {
  const r = await call<{ user: AccountUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (r.ok) await signedIn(r.user);
  return r;
}

export async function signOut() {
  await save();
  stopSync();
  await call('/api/auth/logout', { method: 'POST', body: '{}' });
  useAccount.setState({ user: null, status: 'guest', sync: 'idle', savedAt: null });
}

export async function deleteAccount() {
  stopSync();
  const r = await call('/api/auth/me', { method: 'DELETE' });
  if (r.ok) useAccount.setState({ user: null, status: 'guest', sync: 'idle', savedAt: null });
  return r;
}

export const syncNow = () => save();
