import { createRng, shuffle, type Rng } from '@pinpoint/game';
import type { CountryIndexItem } from './countries';

/*
 * Daily Mix: five questions of five kinds, the same for everyone on a given day.
 * Seeded by the date, so nothing needs a server.
 */

export type DailyKind = 'flag' | 'shape' | 'capital' | 'bigger' | 'border';
export interface DailyQuestion {
  kind: DailyKind;
  prompt: string;
  /** the country the question is about (its flag or outline is shown for flag/shape) */
  subject: string;
  options: { code: string; label: string }[];
  answer: string;
  /** shown after answering */
  fact: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function pickOthers(rng: Rng, pool: CountryIndexItem[], not: CountryIndexItem, n: number, prefer?: (c: CountryIndexItem) => boolean) {
  const near = shuffle(pool.filter((c) => c.code !== not.code && (prefer ? prefer(c) : true)), rng);
  const rest = shuffle(pool.filter((c) => c.code !== not.code && !near.includes(c)), rng);
  return [...near, ...rest].slice(0, n);
}

export function buildDaily(list: CountryIndexItem[], day: string, canShape: (code: string) => boolean): DailyQuestion[] {
  const rng = createRng(`daily-mix:${day}`);
  const un = list.filter((c) => c.un195);
  const used = new Set<string>();
  const maybe = (pred: (c: CountryIndexItem) => boolean): CountryIndexItem | undefined => {
    const c = shuffle(un.filter((x) => !used.has(x.code) && pred(x)), rng)[0];
    if (c) used.add(c.code);
    return c;
  };
  const take = (pred: (c: CountryIndexItem) => boolean) => maybe(pred) ?? maybe(() => true)!;
  const near = (a: CountryIndexItem) => (c: CountryIndexItem) => c.subregion === a.subregion || c.region === a.region;
  const opts = (answer: CountryIndexItem, others: CountryIndexItem[], label: (c: CountryIndexItem) => string) =>
    shuffle([answer, ...others], rng).map((c) => ({ code: c.code, label: label(c) }));

  // 1. a flag
  const f = take(() => true);
  const q1: DailyQuestion = { kind: 'flag', prompt: 'Whose flag is this?', subject: f.code, answer: f.code, options: opts(f, pickOthers(rng, un, f, 3, near(f)), (c) => c.name), fact: `${f.name} · capital ${f.capital?.name ?? '—'}` };

  // 2. an outline
  const s = take((c) => c.hasShape && canShape(c.code));
  const q2: DailyQuestion = { kind: 'shape', prompt: 'Which country has this shape?', subject: s.code, answer: s.code, options: opts(s, pickOthers(rng, un, s, 3, near(s)), (c) => c.name), fact: `${s.name}, in ${s.subregion || s.region}` };

  // 3. a capital
  const k = take((c) => !!c.capital?.name);
  const capOthers = pickOthers(rng, un.filter((c) => c.capital?.name), k, 3, near(k));
  const q3: DailyQuestion = { kind: 'capital', prompt: `What is the capital of ${k.name}?`, subject: k.code, answer: k.code, options: opts(k, capOthers, (c) => c.capital!.name), fact: `${k.capital!.name} is the capital of ${k.name}` };

  // 4. which has more people
  const a = take((c) => !!c.population);
  const b = maybe((c) => !!c.population && c.region === a.region && Math.abs(Math.log((c.population?.v ?? 1) / (a.population?.v ?? 1))) < 1.2) ?? take((c) => !!c.population);
  const big = (a.population!.v >= b.population!.v ? a : b);
  const q4: DailyQuestion = { kind: 'bigger', prompt: 'Which has more people?', subject: big.code, answer: big.code, options: shuffle([a, b], rng).map((c) => ({ code: c.code, label: c.name })), fact: `${a.name} ${fmt(a.population!.v)} · ${b.name} ${fmt(b.population!.v)}` };

  // 5. which one borders a country
  const h = take((c) => c.borders.filter((x) => un.some((u) => u.code === x)).length >= 2);
  const nCode = shuffle(h.borders.filter((x) => un.some((u) => u.code === x)), rng)[0];
  const neighbour = un.find((c) => c.code === nCode)!;
  const notNeighbours = pickOthers(rng, un.filter((c) => !h.borders.includes(c.code) && c.code !== h.code), neighbour, 3, near(h));
  const q5: DailyQuestion = { kind: 'border', prompt: `Which of these borders ${h.name}?`, subject: h.code, answer: neighbour.code, options: opts(neighbour, notNeighbours, (c) => c.name), fact: `${h.name} borders ${h.borders.length} countries` };

  return [q1, q2, q3, q4, q5];
}

/* ---------------- streak, kept on this device ---------------- */

export interface DailyRecord {
  /** day → answers right/wrong in order */
  days: Record<string, boolean[]>;
}
const KEY = 'pinpoint-daily';
export function readDaily(): DailyRecord {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '') as DailyRecord;
  } catch {
    return { days: {} };
  }
}
export function saveDaily(day: string, answers: boolean[]) {
  const r = readDaily();
  r.days[day] = answers;
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage blocked */
  }
}
const prevDay = (day: string) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** consecutive days played, counting back from today (or yesterday, if today is not played yet) */
export function streakOf(r: DailyRecord, today: string) {
  let d = r.days[today] ? today : prevDay(today);
  let n = 0;
  while (r.days[d]) {
    n++;
    d = prevDay(d);
  }
  return n;
}
