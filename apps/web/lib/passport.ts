'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STAMP_COINS, useWallet } from './wallet';

/**
 * The passport is the player's profile: a data page (name, home country, avatar) and stamp pages.
 * Kept on this device until accounts arrive, then it moves to the server.
 */

export type StampTier = 'entry' | 'postage' | 'tag';

export const TIERS: Record<StampTier, { label: string; need: string; blurb: string }> = {
  entry: { label: 'Entry stamp', need: '10 / 10', blurb: 'A perfect score, inked in by the border officer' },
  postage: { label: 'Postage stamp', need: '8 or 9', blurb: 'Nearly perfect: a postage stamp with the flag on it' },
  tag: { label: 'Luggage tag', need: '6 or 7', blurb: 'A good effort: a souvenir tag for your bag' },
};

export const tierFor = (score: number): StampTier | null => (score >= 10 ? 'entry' : score >= 8 ? 'postage' : score >= 6 ? 'tag' : null);
const rank = (t: StampTier | null) => (t === 'entry' ? 3 : t === 'postage' ? 2 : t === 'tag' ? 1 : 0);

export interface Stamp {
  code: string;
  tier: StampTier;
  score: number;
  /** when the current (best) stamp was earned, ISO date */
  date: string;
}

export interface PassportState {
  name: string;
  home: string | null;
  color: string;
  issued: string;
  number: string;
  stamps: Record<string, Stamp>;
  /** last quiz attempt per country, YYYY-MM-DD (one try a day) */
  tries: Record<string, string>;
  setProfile: (p: Partial<Pick<PassportState, 'name' | 'home' | 'color'>>) => void;
  /** records a finished quiz; returns the stamp earned this time (or null) and whether it improved */
  record: (code: string, score: number) => { tier: StampTier | null; improved: boolean };
}

export const AVATAR_COLORS = ['#ff8a5b', '#3d7fd1', '#2fa36b', '#c2629a', '#8e6cf0', '#e0a21b'];

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const newNumber = () => {
  const A = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  let s = A[Math.floor(Math.random() * A.length)] + A[Math.floor(Math.random() * A.length)];
  for (let i = 0; i < 7; i++) s += Math.floor(Math.random() * 10);
  return s;
};

export const usePassport = create<PassportState>()(
  persist(
    (set, get) => ({
      name: 'Traveller',
      home: null,
      color: AVATAR_COLORS[0],
      issued: today(),
      number: newNumber(),
      stamps: {},
      tries: {},
      setProfile: (p) => set(p),
      record: (code, score) => {
        const tier = tierFor(score);
        const prev = get().stamps[code];
        const improved = !!tier && rank(tier) > rank(prev?.tier ?? null);
        set((s) => ({
          tries: { ...s.tries, [code]: today() },
          stamps: improved && tier ? { ...s.stamps, [code]: { code, tier, score, date: today() } } : s.stamps,
        }));
        // a new or better stamp pays out (once per country and tier)
        if (improved && tier) useWallet.getState().earn(`stamp:${code}:${tier}`, STAMP_COINS[tier], `${TIERS[tier].label}`);
        return { tier, improved };
      },
    }),
    { name: 'pinpoint-passport', version: 1 },
  ),
);

export const triedToday = (tries: Record<string, string>, code: string) => tries[code] === today();
