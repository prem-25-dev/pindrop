import type { Difficulty } from '@pinpoint/game';
import type { BotLevel } from './bot';
import { GAMES, type GameId, type Length } from './games';
import type { GameRecord } from './history';
import type { Stamp } from './passport';

/*
 * Everything here is worked out from games and stamps already saved on this device,
 * so it needs no storage of its own. When accounts arrive, the same rules run on the server.
 */

/* ---------------- results ---------------- */

const ranked = (g: GameRecord) => [...g.players].sort((a, b) => b.score - a.score);
/** your finishing place (1-based), or null when you played alone */
export const placeIn = (g: GameRecord) => (g.players.length > 1 ? ranked(g).findIndex((p) => p.id === 'you') + 1 : null);
const you = (g: GameRecord) => g.players.find((p) => p.id === 'you');
/** a win: you beat every bot outright */
export const isWin = (g: GameRecord) => {
  const me = you(g);
  return !!me && g.players.length > 1 && g.players.every((p) => p.id === 'you' || p.score < me.score);
};

/* ---------------- ranked tier ---------------- */

/** bots act as rated opponents until real ranked matches exist */
const BOT_RATING: Record<BotLevel, number> = { easy: 900, medium: 1150, hard: 1400 };
export const START_RATING = 1000;
export const PLACEMENT_GAMES = 3;

export interface Tier {
  id: string;
  label: string;
  min: number;
  color: string;
  light: string;
}
export const TIERS_RANKED: Tier[] = [
  { id: 'bronze', label: 'Bronze', min: 0, color: '#b7713f', light: '#f0b98a' },
  { id: 'silver', label: 'Silver', min: 1050, color: '#7f8ea3', light: '#dfe6ef' },
  { id: 'gold', label: 'Gold', min: 1200, color: '#c9962a', light: '#ffe08a' },
  { id: 'platinum', label: 'Platinum', min: 1350, color: '#2f9e9a', light: '#a8ece6' },
  { id: 'diamond', label: 'Diamond', min: 1500, color: '#4f7fd1', light: '#bcd6ff' },
  { id: 'master', label: 'Master', min: 1650, color: '#8a4fd1', light: '#dcc3ff' },
];

export interface Rating {
  rating: number;
  /** games against bots so far */
  matches: number;
  placed: boolean;
  tier: Tier;
  next: Tier | null;
  /** 0..1 progress from this tier to the next */
  progress: number;
  /** rating change in your latest match */
  last: number | null;
  peak: number;
}

/** Elo against every bot at the table, in the order the games were played */
export function ratingFrom(games: GameRecord[]): Rating {
  let r = START_RATING;
  let matches = 0;
  let last: number | null = null;
  let peak = r;
  for (const g of games) {
    const me = you(g);
    if (!me || !g.botLevel) continue;
    const bots = g.players.filter((p) => p.bot);
    if (!bots.length) continue;
    const before = r;
    const k = matches < PLACEMENT_GAMES ? 40 : 24;
    const opp = BOT_RATING[g.botLevel];
    let delta = 0;
    for (const b of bots) {
      const s = me.score > b.score ? 1 : me.score === b.score ? 0.5 : 0;
      const e = 1 / (1 + 10 ** ((opp - r) / 400));
      delta += (k * (s - e)) / bots.length;
    }
    r = Math.round(r + delta);
    matches++;
    last = r - before;
    peak = Math.max(peak, r);
  }
  let i = 0;
  TIERS_RANKED.forEach((t, j) => r >= t.min && (i = j));
  const tier = TIERS_RANKED[Math.max(0, i)];
  const next = TIERS_RANKED[i + 1] ?? null;
  return {
    rating: r,
    matches,
    placed: matches >= PLACEMENT_GAMES,
    tier,
    next,
    progress: next ? Math.min(1, Math.max(0, (r - tier.min) / (next.min - tier.min))) : 1,
    last,
    peak,
  };
}

/* ---------------- leaderboard standing ---------------- */

export interface Standing {
  game: GameId;
  difficulty: Difficulty;
  length: Length;
  /** your best place on that board (1 = top) */
  rank: number;
  of: number;
  best: number;
}

/** your best position on every local board you have played (same boards as the Leaderboard page) */
export function standingsFrom(games: GameRecord[]): Standing[] {
  const boards = new Map<string, GameRecord[]>();
  for (const g of games) {
    const k = `${g.game}|${g.difficulty}|${g.length}`;
    boards.set(k, [...(boards.get(k) ?? []), g]);
  }
  const out: Standing[] = [];
  for (const list of boards.values()) {
    const runs = list.flatMap((g) => g.players.map((p) => ({ p, g }))).sort((a, b) => b.p.score - a.p.score || a.g.at.localeCompare(b.g.at));
    const mine = runs.findIndex((r) => r.p.id === 'you');
    if (mine < 0) continue;
    const g = list[0];
    out.push({ game: g.game, difficulty: g.difficulty, length: g.length, rank: mine + 1, of: runs.length, best: runs[mine].p.score });
  }
  return out.sort((a, b) => a.rank - b.rank || b.of - a.of);
}

/* ---------------- badges ---------------- */

export type BadgeIcon = 'flag' | 'trophy' | 'calendar' | 'medal' | 'star' | 'podium' | 'fire' | 'compass' | 'skull' | 'stamp' | 'globe' | 'crown';

export interface Badge {
  id: string;
  name: string;
  /** how to earn it */
  how: string;
  icon: BadgeIcon;
  color: string;
  /** 0..1 */
  progress: number;
  /** e.g. "4 / 10" while it is still locked */
  count?: string;
}

const frac = (n: number, of: number) => ({ progress: Math.min(1, n / of), count: `${Math.min(n, of)} / ${of}` });

export function badgesFrom(games: GameRecord[], stamps: Stamp[], regionOf: (code: string) => string | undefined): Badge[] {
  const wins = games.filter(isWin);
  const podiums = games.filter((g) => {
    const p = placeIn(g);
    return p != null && p <= 3 && g.players.length > 3;
  }).length;
  let streak = 0;
  let bestStreak = 0;
  for (const g of games) {
    if (g.players.length < 2) continue;
    streak = isWin(g) ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  const perfect = games.some((g) => g.rounds >= 5 && (you(g)?.right ?? 0) >= g.rounds && g.game !== 'pin-drop');
  const kinds = new Set(games.map((g) => g.game)).size;
  const hardWin = wins.some((g) => g.botLevel === 'hard');
  const regions = new Set(stamps.map((s) => regionOf(s.code)).filter((r) => r && r !== 'Antarctic')).size;
  const entries = stamps.filter((s) => s.tier === 'entry').length;
  const total = Object.keys(GAMES).length;

  return [
    { id: 'first-game', name: 'First Flight', how: 'Finish your first game', icon: 'flag', color: '#ff8a5b', ...frac(games.length, 1) },
    { id: 'first-win', name: 'Bot Beater', how: 'Beat every bot at the table', icon: 'trophy', color: '#f2b53c', ...frac(wins.length, 1) },
    { id: 'regular', name: 'Regular', how: 'Finish 10 games', icon: 'calendar', color: '#4aa8ff', ...frac(games.length, 10) },
    { id: 'veteran', name: 'Veteran', how: 'Finish 50 games', icon: 'medal', color: '#6c7bd9', ...frac(games.length, 50) },
    { id: 'perfect', name: 'Flawless', how: 'Get every question right in a game of 5 or more', icon: 'star', color: '#f2c14e', ...frac(perfect ? 1 : 0, 1) },
    { id: 'podium', name: 'Podium Regular', how: 'Finish in the top 3 of a full table 5 times', icon: 'podium', color: '#c2629a', ...frac(podiums, 5) },
    { id: 'hat-trick', name: 'Hat Trick', how: 'Win 3 games in a row', icon: 'fire', color: '#ff5a5f', ...frac(bestStreak, 3) },
    { id: 'all-rounder', name: 'All-Rounder', how: 'Play every game at least once', icon: 'compass', color: '#2fa36b', ...frac(kinds, total) },
    { id: 'giant', name: 'Giant Slayer', how: 'Win against Hard bots', icon: 'skull', color: '#5b4a8a', ...frac(hardWin ? 1 : 0, 1) },
    { id: 'first-stamp', name: 'Inked', how: 'Earn your first passport stamp', icon: 'stamp', color: '#2b4c9b', ...frac(stamps.length, 1) },
    { id: 'globetrotter', name: 'Globetrotter', how: 'Hold stamps from all 5 continents', icon: 'globe', color: '#0f8f86', ...frac(regions, 5) },
    { id: 'perfectionist', name: 'Perfectionist', how: 'Earn 5 entry stamps (10/10)', icon: 'crown', color: '#b8322f', ...frac(entries, 5) },
  ];
}
