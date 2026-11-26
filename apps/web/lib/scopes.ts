import type { CountryIndexItem } from './countries';

/** Map scopes: the whole world or one continent. Also used by the games (scope picker). */
export interface Scope {
  id: string;
  label: string;
  /** view to fit, [[west, south], [east, north]] in degrees; none for the world */
  view?: [[number, number], [number, number]];
}

export const SCOPES: Scope[] = [
  { id: 'world', label: 'World' },
  { id: 'africa', label: 'Africa', view: [[-19, -36], [53, 38]] },
  { id: 'europe', label: 'Europe', view: [[-25, 34], [45, 71.5]] },
  { id: 'asia', label: 'Asia', view: [[25, -11], [150, 56]] },
  { id: 'north-america', label: 'North America', view: [[-170, 6], [-52, 74]] },
  { id: 'south-america', label: 'South America', view: [[-82, -56], [-34, 13]] },
  { id: 'oceania', label: 'Oceania', view: [[110, -48], [180, 2]] },
];

/** countries that sit in two continents count in both */
const ALSO: Record<string, string[]> = { RU: ['asia'], TR: ['europe'], KZ: ['europe'], EG: ['asia'], GE: ['europe'], AZ: ['europe'], AM: ['europe'], CY: ['asia'] };

export function continentsOf(c: CountryIndexItem): string[] {
  const base =
    c.region === 'Africa' ? 'africa'
    : c.region === 'Europe' ? 'europe'
    : c.region === 'Asia' ? 'asia'
    : c.region === 'Oceania' ? 'oceania'
    : c.region === 'Americas' ? (c.subregion === 'South America' ? 'south-america' : 'north-america')
    : null;
  return [...(base ? [base] : []), ...(ALSO[c.code] ?? [])];
}

export const inScope = (c: CountryIndexItem | undefined, scope: string) => scope === 'world' || (!!c && continentsOf(c).includes(scope));
