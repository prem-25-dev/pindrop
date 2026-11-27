import { answerPoints, createRng, pinPoints, regionPoints, type Difficulty } from '@pinpoint/game';
import type { CountryIndexItem } from './countries';
import { kmToCountry, type WorldShapes } from './geo';

/** Bot opponents. Seeded per game + round, scored with exactly the same rules as the player. */
export type BotLevel = 'easy' | 'medium' | 'hard';

export const BOTS: Record<BotLevel, { name: string; blurb: string; accuracy: number; seconds: [number, number]; pinKm: number }> = {
  easy: { name: 'Rookie', blurb: 'About half right, in no hurry', accuracy: 0.5, seconds: [3.5, 8], pinKm: 1100 },
  medium: { name: 'Explorer', blurb: 'About 3 in 4 right, steady pace', accuracy: 0.72, seconds: [2.5, 6], pinKm: 450 },
  hard: { name: 'Atlas', blurb: 'Rarely wrong, very quick', accuracy: 0.9, seconds: [1.5, 4], pinKm: 200 },
};

export interface BotAnswer {
  correct: boolean;
  points: number;
  ms: number;
  /** what the bot answered (wrong answers only) */
  answer: string | null;
  km?: number;
  pin?: [number, number];
  tapped?: string | null;
}

/** a bot at the table: its own name, colour and seeded answers; all share one skill level */
export interface BotPlayer {
  id: string;
  name: string;
  color: string;
  level: BotLevel;
}

const CREW = [
  { id: 'mira', name: 'Mira', color: '#3d7fd1' },
  { id: 'kofi', name: 'Kofi', color: '#2fa36b' },
  { id: 'lars', name: 'Lars', color: '#c2629a' },
];

export const makeBots = (count: number, level: BotLevel): BotPlayer[] => CREW.slice(0, Math.max(0, Math.min(3, count))).map((b) => ({ ...b, level }));

const BANTER = {
  won: ['too easy 😎', 'got it!', 'easy one', 'yes!!', 'I know my flags'],
  lost: ['ugh, so close', 'no way', 'I panicked', 'next one is mine', 'never heard of it'],
  close: ['almost!', 'so close lol', 'that was tight'],
};

/** an occasional chat line from a bot after a round (seeded, about 1 in 3 rounds) */
export function botBanter(bot: BotPlayer, seed: string, index: number, outcome: keyof typeof BANTER): string | null {
  const r = createRng(`banter:${bot.id}:${seed}:${index}`);
  if (r() > 0.34) return null;
  const lines = BANTER[outcome];
  return lines[Math.floor(r() * lines.length)];
}

interface Ctx {
  /** which bot is answering (its own seed) */
  botId?: string;
  level: BotLevel;
  seed: string;
  index: number;
  country: CountryIndexItem;
  timer: number; // seconds, 0 = none
}

const rngFor = (c: Ctx) => createRng(`bot:${c.botId ?? ''}:${c.level}:${c.seed}:${c.index}:${c.country.code}`);
const timeFor = (c: Ctx, r: () => number) => {
  const [a, b] = BOTS[c.level].seconds;
  return (a + (b - a) * r()) * 1000;
};
const timedOut = (c: Ctx, ms: number) => c.timer > 0 && ms > c.timer * 1000;

export function botFlag(c: Ctx & { difficulty: Difficulty; streak: number; options: CountryIndexItem[] }): BotAnswer {
  const r = rngFor(c);
  const ms = timeFor(c, r);
  if (timedOut(c, ms)) return { correct: false, points: 0, ms: c.timer * 1000, answer: null };
  const correct = r() < BOTS[c.level].accuracy;
  const wrongPool = c.options.filter((o) => o.code !== c.country.code);
  const wrong = wrongPool[Math.floor(r() * wrongPool.length)];
  return {
    correct,
    ms,
    answer: correct ? null : (wrong?.name ?? null),
    points: answerPoints({ correct, difficulty: c.difficulty, streak: correct ? c.streak + 1 : 0, timeLeftMs: c.timer ? c.timer * 1000 - ms : undefined, timeTotalMs: c.timer ? c.timer * 1000 : undefined }),
  };
}

/** [lon, lat] reached by travelling `km` on `bearing` degrees from a point */
function destination([lon, lat]: [number, number], bearing: number, km: number): [number, number] {
  const R = 6371;
  const d = km / R;
  const b = (bearing * Math.PI) / 180;
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((((l2 * 180) / Math.PI + 540) % 360) - 180), (p2 * 180) / Math.PI];
}

const centerOf = (world: WorldShapes, code: string): [number, number] | null => {
  const s = world.shapes.find((x) => x.code === code);
  return s ? ((world.projection.invert?.(s.center) as [number, number]) ?? null) : null;
};

export function botPin(c: Ctx & { world: WorldShapes; scaleKm: number }): BotAnswer {
  const r = rngFor(c);
  const ms = timeFor(c, r);
  if (timedOut(c, ms)) return { correct: false, points: 0, ms: c.timer * 1000, answer: null };
  const center = centerOf(c.world, c.country.code);
  if (!center) return { correct: false, points: 0, ms, answer: null };
  // distance off-target: exponential, mean depends on the level
  const off = -BOTS[c.level].pinKm * Math.log(1 - r() * 0.999);
  const pin = destination(center, r() * 360, off);
  const km = kmToCountry(pin, c.world.geometry.get(c.country.code));
  return { correct: km === 0, points: pinPoints(km, c.scaleKm), ms, answer: null, km, pin };
}

export function botFind(c: Ctx & { world: WorldShapes; byCode: Map<string, CountryIndexItem>; active: (code: string) => boolean; scaleKm: number }): BotAnswer {
  const r = rngFor(c);
  const ms = timeFor(c, r);
  if (timedOut(c, ms)) return { correct: false, points: 0, ms: c.timer * 1000, answer: null };
  const correct = r() < BOTS[c.level].accuracy;
  if (correct) {
    return { correct, ms, answer: null, tapped: c.country.code, km: 0, points: regionPoints({ correct, km: 0, timeLeftMs: c.timer ? c.timer * 1000 - ms : undefined, timeTotalMs: c.timer ? c.timer * 1000 : undefined }) };
  }
  // a plausible mistake: a neighbour, else somewhere in the same subregion
  const near = c.country.borders.filter((b) => c.active(b) && c.world.geometry.has(b));
  const same = [...c.byCode.values()].filter((x) => x.code !== c.country.code && x.subregion === c.country.subregion && c.active(x.code) && c.world.geometry.has(x.code));
  const pool = near.length ? near : same.map((x) => x.code);
  const tapped = pool[Math.floor(r() * pool.length)] ?? null;
  const at = tapped ? centerOf(c.world, tapped) : null;
  const km = at ? kmToCountry(at, c.world.geometry.get(c.country.code)) : 3000;
  return { correct: false, ms, answer: tapped ? (c.byCode.get(tapped)?.name ?? tapped) : null, tapped, km, points: regionPoints({ correct: false, km, scaleKm: c.scaleKm }) };
}
