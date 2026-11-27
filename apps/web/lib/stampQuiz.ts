import { createRng, shuffle, type Rng } from '@pinpoint/game';
import type { CountryIndexItem } from './countries';

/**
 * Ten questions about one country, built from the sourced data we already publish.
 * Seeded by country and day, so a retry tomorrow is a different paper.
 * (Harder topics like leaders, food and sport arrive with the reviewed trivia bank.)
 */

export interface QuizOption {
  id: string;
  label: string;
  /** a flag image instead of text */
  img?: string;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: QuizOption[];
  answer: string;
  /** shown after answering */
  fact?: string;
}

const GROUP_LABELS: Record<string, string> = {
  eu: 'European Union',
  nato: 'NATO',
  opec: 'OPEC',
  au: 'African Union',
  arab: 'Arab League',
  commonwealth: 'Commonwealth',
  g20: 'G20',
  brics: 'BRICS',
  asean: 'ASEAN',
};

const fmtPop = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} billion` : v >= 1e6 ? `${v >= 1e7 ? Math.round(v / 1e6) : (v / 1e6).toFixed(1)} million` : v >= 1e3 ? `${Math.round(v / 1e3)} thousand` : String(v));
const fmtKm2 = (v: number) => `${Math.round(v).toLocaleString('en')} km²`;

/** n random distinct items from a pool */
function pick<T>(pool: T[], n: number, rng: Rng): T[] {
  return shuffle(pool, rng).slice(0, n);
}

/** neighbours first, then the same subregion, region, then anywhere: distractors that feel plausible */
function lookalikes(c: CountryIndexItem, all: CountryIndexItem[], rng: Rng, keep: (x: CountryIndexItem) => boolean, n = 3) {
  const others = all.filter((x) => x.code !== c.code && x.un195 && keep(x));
  const tiers = [
    others.filter((x) => c.borders.includes(x.code)),
    others.filter((x) => x.subregion === c.subregion && !c.borders.includes(x.code)),
    others.filter((x) => x.region === c.region && x.subregion !== c.subregion),
    others.filter((x) => x.region !== c.region),
  ];
  const out: CountryIndexItem[] = [];
  for (const t of tiers) for (const x of shuffle(t, rng)) if (out.length < n && !out.includes(x)) out.push(x);
  return out;
}

const opts = (rng: Rng, items: QuizOption[]) => shuffle(items, rng);

export function buildStampQuiz(c: CountryIndexItem, all: CountryIndexItem[], day: string): QuizQuestion[] {
  const rng = createRng(`stamp:${c.code}:${day}`);
  const qs: QuizQuestion[] = [];
  const add = (q: QuizQuestion | null) => q && q.options.length >= 2 && new Set(q.options.map((o) => o.label + (o.img ?? ''))).size === q.options.length && qs.push(q);

  // 1. capital
  if (c.capital) {
    const d = lookalikes(c, all, rng, (x) => !!x.capital && x.capital.name !== c.capital!.name);
    add({ id: 'capital', topic: 'Capital', prompt: `What is the capital of ${c.name}?`, answer: c.capital.name, options: opts(rng, [c.capital.name, ...d.map((x) => x.capital!.name)].map((l) => ({ id: l, label: l }))) });
  }

  // 2. the flag, among its neighbours' flags
  {
    const d = lookalikes(c, all, rng, () => true);
    add({ id: 'flag', topic: 'Flag', prompt: `Which one is the flag of ${c.name}?`, answer: c.code, options: opts(rng, [c, ...d].map((x) => ({ id: x.code, label: x.name, img: x.flag }))) });
  }

  // 3. currency
  if (c.currency) {
    const names = [...new Set(lookalikes(c, all, rng, (x) => !!x.currency && x.currency.name !== c.currency!.name, 8).map((x) => x.currency!.name))].slice(0, 3);
    add({ id: 'currency', topic: 'Money', prompt: `Which currency do people pay with in ${c.name}?`, answer: c.currency.name, options: opts(rng, [c.currency.name, ...names].map((l) => ({ id: l, label: l }))), fact: `${c.currency.name} (${c.currency.code}, ${c.currency.symbol})` });
  }

  // 4. a language
  if (c.languages.length) {
    const right = c.languages[Math.floor(rng() * c.languages.length)];
    const pool = [...new Set(lookalikes(c, all, rng, (x) => x.languages.length > 0, 12).flatMap((x) => x.languages))].filter((l) => !c.languages.includes(l));
    const wrong = pick(pool, 3, rng);
    add({ id: 'language', topic: 'Language', prompt: `Which of these is an official language of ${c.name}?`, answer: right, options: opts(rng, [right, ...wrong].map((l) => ({ id: l, label: l }))), fact: `Official: ${c.languages.join(', ')}` });
  }

  // 5. neighbours
  const byCode = new Map(all.map((x) => [x.code, x]));
  if (c.borders.length) {
    const right = byCode.get(c.borders[Math.floor(rng() * c.borders.length)]);
    const wrong = lookalikes(c, all, rng, (x) => !c.borders.includes(x.code));
    if (right) add({ id: 'border', topic: 'Neighbours', prompt: `Which of these countries shares a land border with ${c.name}?`, answer: right.code, options: opts(rng, [right, ...wrong].map((x) => ({ id: x.code, label: x.name }))), fact: `${c.name} borders ${c.borders.map((b) => byCode.get(b)?.name ?? b).join(', ')}` });
  } else {
    add({ id: 'border', topic: 'Neighbours', prompt: `How many countries share a land border with ${c.name}?`, answer: '0', options: opts(rng, ['0', '1', '2', '3'].map((l) => ({ id: l, label: l === '0' ? 'None' : l }))) });
  }

  // 6. subregion
  {
    const subs = [...new Set(all.filter((x) => x.subregion && x.subregion !== c.subregion).map((x) => x.subregion))];
    const near = subs.filter((s) => all.some((x) => x.subregion === s && x.region === c.region));
    const wrong = [...pick(near, 3, rng), ...pick(subs.filter((s) => !near.includes(s)), 3, rng)].slice(0, 3);
    add({ id: 'subregion', topic: 'Where', prompt: `Which part of the world is ${c.name} in?`, answer: c.subregion, options: opts(rng, [c.subregion, ...wrong].map((l) => ({ id: l, label: l }))) });
  }

  // 7. population, in rough bands
  if (c.population) {
    const v = c.population.v;
    const f = [0.18, 0.4, 2.6, 6.5];
    const wrong = pick(f, 3, rng).map((k) => v * k);
    add({ id: 'population', topic: 'People', prompt: `Roughly how many people live in ${c.name}?`, answer: fmtPop(v), options: opts(rng, [v, ...wrong].map((n) => ({ id: fmtPop(n), label: fmtPop(n) }))), fact: `${fmtPop(v)} (World Bank, ${c.population.year})` });
  }

  // 8. which side of the road
  if (c.drivingSide) {
    add({ id: 'driving', topic: 'Roads', prompt: `Which side of the road do people drive on in ${c.name}?`, answer: c.drivingSide, options: [{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }] });
  }

  // 9. size: one listed country is bigger
  if (c.area) {
    const a = c.area.v;
    const sized = all.filter((x) => x.un195 && x.area && x.code !== c.code);
    const bigger = lookalikes(c, sized, rng, (x) => x.area!.v > a * 1.15, 1)[0];
    const smaller = lookalikes(c, sized, rng, (x) => x.area!.v < a * 0.87);
    if (bigger && smaller.length === 3) {
      add({ id: 'area', topic: 'Size', prompt: `Which of these countries is bigger than ${c.name}?`, answer: bigger.code, options: opts(rng, [bigger, ...smaller].map((x) => ({ id: x.code, label: x.name }))), fact: `${c.name} covers ${fmtKm2(a)}; ${bigger.name} ${fmtKm2(bigger.area!.v)}` });
    }
  }

  // 10. a group it belongs to
  if (c.groups.length) {
    const right = c.groups[Math.floor(rng() * c.groups.length)];
    const wrong = pick(Object.keys(GROUP_LABELS).filter((g) => !c.groups.includes(g)), 3, rng);
    add({ id: 'group', topic: 'Alliances', prompt: `${c.name} is a member of which of these?`, answer: right, options: opts(rng, [right, ...wrong].map((g) => ({ id: g, label: GROUP_LABELS[g] }))) });
  }

  // fillers, used when a country lacks some of the above
  add({ id: 'landlocked', topic: 'Coast', prompt: `Does ${c.name} have a coastline?`, answer: c.landlocked ? 'no' : 'yes', options: [{ id: 'yes', label: 'Yes, it touches the sea' }, { id: 'no', label: 'No, it is landlocked' }], fact: c.coastline?.km ? `Coastline: ${c.coastline.km.toLocaleString('en')} km` : undefined });
  if (c.income) {
    const labels = { low: 'Low income', 'lower-middle': 'Lower-middle income', 'upper-middle': 'Upper-middle income', high: 'High income' } as const;
    add({ id: 'income', topic: 'Economy', prompt: `How does the World Bank group ${c.name}?`, answer: c.income, options: (Object.keys(labels) as (keyof typeof labels)[]).map((k) => ({ id: k, label: labels[k] })) });
  }
  if (c.capital) {
    const others = lookalikes(c, all, rng, (x) => !!x.capital);
    add({ id: 'capital-of', topic: 'Cities', prompt: `${c.capital.name} is the capital of…`, answer: c.code, options: opts(rng, [c, ...others].map((x) => ({ id: x.code, label: x.name }))) });
  }
  if (c.official !== c.name) add({ id: 'official', topic: 'Name', prompt: `What is the official name of ${c.name}?`, answer: c.official, options: opts(rng, [c.official, ...lookalikes(c, all, rng, (x) => x.official !== c.official && x.official !== x.name).map((x) => x.official.replace(x.name, c.name))].map((l) => ({ id: l, label: l }))) });

  // the main ten first, in a shuffled order; fillers only if needed
  const FILLERS = ['landlocked', 'income', 'capital-of', 'official'];
  const main = shuffle(qs.filter((q) => !FILLERS.includes(q.id)), rng);
  const fill = qs.filter((q) => FILLERS.includes(q.id));
  return [...main, ...fill].slice(0, 10);
}
