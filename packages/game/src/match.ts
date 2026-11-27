/**
 * Answer judging for typed answers.
 *  - Tourist:      multiple choice (judged by id, not here)
 *  - Navigator:    small typos are fine (similarity ≥ 67%, ≥ 80% for short names)
 *  - Cartographer: exact spelling; case, accents and punctuation don't matter
 *
 * A typed answer that is exactly another country's name is that country, never a near miss
 * ("Niger" is not accepted for Nigeria, "Austria" not for Australia). Fuzzy matching then picks the
 * closest country overall, and only counts it if that is the target.
 */

export type Difficulty = 'tourist' | 'navigator' | 'cartographer';

export interface Answerable {
  code: string;
  name: string;
  official?: string;
  aliases?: string[];
}

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

const namesCache = new WeakMap<Answerable, string[]>();
function namesOf(c: Answerable): string[] {
  let n = namesCache.get(c);
  if (!n) {
    n = [...new Set([c.name, c.official ?? '', ...(c.aliases ?? [])].map(normalize).filter((x) => x.length > 1))];
    namesCache.set(c, n);
  }
  return n;
}

export interface Verdict {
  correct: boolean;
  /** the country the answer was taken to mean, if any */
  matched: string | null;
  /** how close the typed answer was to the target's name (0–1), for "so close!" feedback */
  closeness: number;
}

export function judge(input: string, target: Answerable, all: readonly Answerable[], difficulty: Difficulty): Verdict {
  const q = normalize(input);
  const targetCloseness = q ? Math.max(0, ...namesOf(target).map((n) => similarity(q, n))) : 0;
  if (!q) return { correct: false, matched: null, closeness: 0 };

  // 1. exact name of some country (any language or spelling we know)
  const exact = all.find((c) => namesOf(c).includes(q));
  if (exact) return { correct: exact.code === target.code, matched: exact.code, closeness: targetCloseness };
  if (difficulty === 'cartographer') return { correct: false, matched: null, closeness: targetCloseness };

  // 2. fuzzy: the closest country overall must be the target
  let best: Answerable | null = null;
  let bestSim = 0;
  for (const c of all) {
    for (const n of namesOf(c)) {
      const s = similarity(q, n);
      if (s > bestSim) {
        bestSim = s;
        best = c;
      }
    }
  }
  const threshold = q.length <= 5 ? 0.8 : 0.67;
  const ok = !!best && best.code === target.code && bestSim >= threshold;
  return { correct: ok, matched: ok ? target.code : bestSim >= threshold ? (best?.code ?? null) : null, closeness: targetCloseness };
}
