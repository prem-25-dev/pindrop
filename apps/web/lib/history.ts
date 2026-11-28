'use client';
import type { Difficulty } from '@pinpoint/game';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BotLevel } from './bot';
import type { GameId, Length } from './games';
import { coinsForGame, useWallet } from './wallet';

/**
 * Every finished game, kept on this device. It feeds the local leaderboard
 * (you and the bots you played with) until accounts and the global boards arrive.
 */

export interface PlayedBy {
  id: string;
  name: string;
  color: string;
  score: number;
  right: number;
  bot?: boolean;
}

export interface GameRecord {
  id: string;
  game: GameId;
  difficulty: Difficulty;
  scope: string;
  length: Length;
  timer: number;
  borders: boolean;
  botLevel: BotLevel | null;
  /** ISO date-time */
  at: string;
  rounds: number;
  players: PlayedBy[];
}

interface HistoryState {
  games: GameRecord[];
  add: (g: Omit<GameRecord, 'id' | 'at'>) => void;
}

const MAX = 400;

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      games: [],
      add: (g) => {
        const rec: GameRecord = { ...g, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() };
        set((s) => ({ games: [...s.games, rec].slice(-MAX) }));
        // every finished game pays out coins
        const others = rec.players.filter((p) => p.id !== 'you');
        const me = rec.players.find((p) => p.id === 'you');
        const won = !!me && others.length > 0 && others.every((p) => p.score < me.score);
        useWallet.getState().earn(`game:${rec.id}`, coinsForGame(rec), won ? 'Won a game' : 'Finished a game');
      },
    }),
    { name: 'pinpoint-history', version: 1 },
  ),
);

export type Period = 'today' | 'week' | 'all';

export function inPeriod(iso: string, p: Period, now = new Date()) {
  if (p === 'all') return true;
  const d = new Date(iso);
  if (p === 'today') return d.toDateString() === now.toDateString();
  // this week: Monday 00:00 local time onwards
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return d >= start;
}
