import { createRng, shuffle } from '@pinpoint/game';
import type { CountryIndexItem } from './countries';

/*
 * Border Hop: get from one country to another by land, naming one neighbour at a time.
 * The map is the land-border graph of the 195 countries.
 */

export type Graph = Map<string, string[]>;

export function borderGraph(list: CountryIndexItem[]): Graph {
  const un = new Set(list.filter((c) => c.un195).map((c) => c.code));
  const g: Graph = new Map();
  for (const c of list) if (un.has(c.code)) g.set(c.code, c.borders.filter((b) => un.has(b)));
  // borders are listed both ways in the data, but make sure every edge goes both ways
  for (const [a, ns] of g) for (const b of ns) if (!g.get(b)?.includes(a)) g.get(b)?.push(a);
  return g;
}

/** fewest hops from a to b (inclusive path), or null if no land route */
export function shortestPath(g: Graph, a: string, b: string): string[] | null {
  if (a === b) return [a];
  const prev = new Map<string, string>([[a, '']]);
  const queue = [a];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of g.get(cur) ?? []) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === b) {
        const path = [b];
        for (let x = cur; x; x = prev.get(x)!) path.unshift(x);
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

export interface HopPuzzle {
  from: string;
  to: string;
  /** one of the shortest routes, from start to target */
  best: string[];
}

/** a seeded puzzle whose best route is 3 to 6 hops */
export function makePuzzle(g: Graph, seed: string, minHops = 3, maxHops = 6): HopPuzzle {
  const rng = createRng(`hop:${seed}`);
  const nodes = shuffle([...g.keys()].filter((k) => (g.get(k)?.length ?? 0) > 0), rng);
  for (const from of nodes) {
    for (const to of shuffle(nodes, rng).slice(0, 40)) {
      const best = shortestPath(g, from, to);
      if (best && best.length - 1 >= minHops && best.length - 1 <= maxHops) return { from, to, best };
    }
  }
  // a graph this size always has such a pair; this is only a safety net
  const [from, to] = nodes;
  return { from, to, best: shortestPath(g, from, to) ?? [from, to] };
}

/** stars for a finished hop: the best route is 3, a couple over is 2; each hint costs one (never below 1) */
export function starsFor(hops: number, best: number, hints: number) {
  const base = hops <= best ? 3 : hops <= best + 2 ? 2 : 1;
  return Math.max(1, base - hints);
}

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
