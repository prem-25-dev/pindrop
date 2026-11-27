import { createRng, shuffle, type Difficulty } from '@pinpoint/game';
import type { BotLevel } from './bot';
import type { CountryIndexItem } from './countries';
import { inScope } from './scopes';

export type GameId = 'guess-flag' | 'pin-drop' | 'find-region';
export type Length = number | 'all' | 'endless';

export interface GameSettings {
  difficulty: Difficulty;
  scope: string;
  length: Length;
  /** seconds per question, 0 = no timer */
  timer: number;
  seed: string;
  /** how many bots join the game (0 = solo) and how good they are */
  bots: number;
  botLevel: BotLevel;
  /** Pin Drop only: show country borders on the map */
  borders: boolean;
}

export interface GameDef {
  id: GameId;
  title: string;
  /** what each difficulty means in this game */
  levels: Record<Difficulty, string>;
  lengths: Length[];
  defaultLength: Length;
  /** needs a map shape for the country */
  map: boolean;
}

export const GAMES: Record<GameId, GameDef> = {
  'guess-flag': {
    id: 'guess-flag',
    title: 'Guess the Flag',
    levels: {
      tourist: 'Pick from four countries',
      navigator: 'Type the name, small typos are fine',
      cartographer: 'Type the name, exact spelling',
    },
    lengths: [10, 25, 'all', 'endless'],
    defaultLength: 10,
    map: false,
  },
  'pin-drop': {
    id: 'pin-drop',
    title: 'Pin Drop',
    levels: {
      tourist: 'Flag and name, map zoomed to the continent',
      navigator: 'Flag and name, whole world',
      cartographer: 'Name only, whole world',
    },
    lengths: [5, 10, 20],
    defaultLength: 5,
    map: true,
  },
  'find-region': {
    id: 'find-region',
    title: 'Find the Region',
    levels: {
      tourist: 'Flag and name, map zoomed to the continent',
      navigator: 'Flag and name, whole world',
      cartographer: 'Name only, whole world',
    },
    lengths: [10, 25, 'all', 'endless'],
    defaultLength: 10,
    map: true,
  },
};

export const isGameId = (id: string): id is GameId => id in GAMES;
export const LIVES = 3;

/** the ordered list of countries for a game (seeded, so it can be replayed or shared) */
export function buildQuestions(game: GameDef, settings: GameSettings, countries: CountryIndexItem[]): CountryIndexItem[] {
  const pool = countries.filter((c) => c.un195 && inScope(c, settings.scope) && (!game.map || c.hasShape));
  const order = shuffle(pool, createRng(`${game.id}:${settings.seed}`));
  if (settings.length === 'all' || settings.length === 'endless') return order;
  return order.slice(0, settings.length);
}

/** four options for the Tourist level: the answer plus three from the same subregion (else region, else anywhere) */
export function choicesFor(answer: CountryIndexItem, countries: CountryIndexItem[], seed: string): CountryIndexItem[] {
  const rng = createRng(`choices:${seed}:${answer.code}`);
  const others = countries.filter((c) => c.un195 && c.code !== answer.code);
  const tiers = [others.filter((c) => c.subregion === answer.subregion), others.filter((c) => c.region === answer.region), others];
  const picked: CountryIndexItem[] = [];
  for (const tier of tiers) {
    for (const c of shuffle(tier, rng)) {
      if (picked.length >= 3) break;
      if (!picked.includes(c)) picked.push(c);
    }
  }
  return shuffle([answer, ...picked], rng);
}

/* ---------- best scores, kept on this device ---------- */
const bestKey = (game: GameId, s: GameSettings) =>
  `pinpoint-best:${game}:${s.difficulty}:${s.scope}:${s.length}${game === 'pin-drop' ? `:${s.borders ? 'borders' : 'borderless'}` : ''}`;

export function readBest(game: GameId, s: GameSettings): number | null {
  try {
    const v = localStorage.getItem(bestKey(game, s));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/** saves the score if it beats the best; returns true when it is a new best */
export function saveBest(game: GameId, s: GameSettings, score: number): boolean {
  const prev = readBest(game, s);
  if (prev != null && prev >= score) return false;
  try {
    localStorage.setItem(bestKey(game, s), String(score));
  } catch {
    /* storage blocked: nothing to keep */
  }
  return true;
}

const SETTINGS_KEY = (game: GameId) => `pinpoint-settings:${game}`;
export function readSettings(game: GameId): Partial<GameSettings> {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY(game)) ?? '{}');
    // settings saved before multiple bots: { opponent: 'solo' | level }
    if (raw.opponent && raw.bots == null) {
      raw.bots = raw.opponent === 'solo' ? 0 : 1;
      if (raw.opponent !== 'solo') raw.botLevel = raw.opponent;
      delete raw.opponent;
    }
    return raw;
  } catch {
    return {};
  }
}
export function saveSettings(game: GameId, s: GameSettings) {
  try {
    const { seed: _seed, ...rest } = s;
    void _seed;
    localStorage.setItem(SETTINGS_KEY(game), JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}
