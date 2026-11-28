'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameRecord } from './history';
import { DEFAULT_EQUIPPED, FREE_ITEMS, ITEM, type Equipped, type ItemCategory } from './shop';

/*
 * Coins, what you own and what you wear. Kept on this device and synced to your account.
 *
 * Every coin movement is an entry in the ledger with a stable id (e.g. "game:<record id>",
 * "badge:hat-trick", "buy:hat-crown"). The balance is the sum of the ledger, so merging two
 * devices is a union of entries by id: nothing is counted twice and nothing is lost.
 */

export interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  at: string;
}

export const WELCOME_COINS = 200;

interface WalletState {
  ledger: LedgerEntry[];
  owned: string[];
  equipped: Equipped;
  /** the latest earning, for the "+N coins" toast */
  last: { amount: number; reason: string; at: number } | null;
  /** add coins once per id (repeat calls with the same id do nothing) */
  earn: (id: string, amount: number, reason: string) => boolean;
  buy: (itemId: string) => { ok: true } | { ok: false; error: string };
  equip: (category: Exclude<ItemCategory, 'theme' | 'color'>, itemId: string | null) => void;
  /** replace everything (after merging with the account) */
  replace: (s: Pick<WalletState, 'ledger' | 'owned' | 'equipped'>) => void;
}

export const balanceOf = (ledger: LedgerEntry[]) => ledger.reduce((s, e) => s + e.amount, 0);

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      ledger: [{ id: 'welcome', amount: WELCOME_COINS, reason: 'Welcome gift', at: new Date().toISOString() }],
      owned: [...FREE_ITEMS],
      equipped: { ...DEFAULT_EQUIPPED },
      last: null,
      earn: (id, amount, reason) => {
        if (amount <= 0 || get().ledger.some((e) => e.id === id)) return false;
        set((s) => ({ ledger: [...s.ledger, { id, amount: Math.round(amount), reason, at: new Date().toISOString() }], last: { amount: Math.round(amount), reason, at: Date.now() } }));
        return true;
      },
      buy: (itemId) => {
        const item = ITEM.get(itemId);
        if (!item) return { ok: false, error: 'That item is not in the shop' };
        const s = get();
        if (s.owned.includes(itemId)) return { ok: false, error: 'You already own it' };
        if (balanceOf(s.ledger) < item.price) return { ok: false, error: 'Not enough coins yet' };
        set({
          ledger: [...s.ledger, { id: `buy:${itemId}`, amount: -item.price, reason: `Bought ${item.name}`, at: new Date().toISOString() }],
          owned: [...s.owned, itemId],
        });
        return { ok: true };
      },
      equip: (category, itemId) => {
        if (itemId && !get().owned.includes(itemId)) return;
        set((s) => ({ equipped: { ...s.equipped, [category]: itemId ?? (category === 'cover' ? DEFAULT_EQUIPPED.cover : null) } }));
      },
      replace: ({ ledger, owned, equipped }) => set({ ledger, owned, equipped }),
    }),
    {
      name: 'pinpoint-wallet',
      version: 1,
      partialize: (s) => ({ ledger: s.ledger, owned: s.owned, equipped: s.equipped }),
    },
  ),
);

export const useCoins = () => useWallet((s) => balanceOf(s.ledger));

/** merge two wallets (this device and the account): union of ledger and items, equipped from the newer side */
export function mergeWallets(a: Pick<WalletState, 'ledger' | 'owned' | 'equipped'>, b: Partial<Pick<WalletState, 'ledger' | 'owned' | 'equipped'>> | undefined) {
  if (!b?.ledger) return a;
  const byId = new Map<string, LedgerEntry>();
  for (const e of [...b.ledger, ...a.ledger]) if (!byId.has(e.id)) byId.set(e.id, e);
  const ledger = [...byId.values()].sort((x, y) => x.at.localeCompare(y.at));
  const owned = [...new Set([...(b.owned ?? []), ...a.owned])];
  // the account's choice wins, as long as the item is owned
  const eq = { ...a.equipped, ...(b.equipped ?? {}) };
  return { ledger, owned, equipped: eq };
}

/* ---------------- how coins are earned ---------------- */


/** a finished game: 5 for playing, 2 per right answer, 15 for beating the table, 5 for a podium at a full table */
export function coinsForGame(g: GameRecord) {
  const me = g.players.find((p) => p.id === 'you');
  if (!me) return 0;
  const others = g.players.filter((p) => p.id !== 'you');
  const won = others.length > 0 && others.every((p) => p.score < me.score);
  const place = [...g.players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === 'you') + 1;
  return 5 + me.right * 2 + (won ? 15 : 0) + (!won && others.length >= 3 && place <= 3 ? 5 : 0);
}

export const STAMP_COINS = { entry: 40, postage: 25, tag: 15 } as const;
export const BADGE_COINS = 50;
