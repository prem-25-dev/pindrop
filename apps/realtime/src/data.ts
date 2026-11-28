import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

/*
 * The same published data the web app serves (apps/web/public/data), read once at start-up.
 * DATA_DIR / FLAGS_DIR can point elsewhere in production.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(here, '../../web/public');
const DATA_ROOT = process.env.DATA_DIR ?? path.join(PUBLIC, 'data');
const FLAGS_DIR = process.env.FLAGS_DIR ?? path.join(PUBLIC, 'flags');

export interface Country {
  code: string;
  name: string;
  region: string;
  subregion: string;
  un195: boolean;
  hasShape: boolean;
  aliases: string[];
}

const manifest = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'manifest.json'), 'utf8')) as { version: string };
const dir = path.join(DATA_ROOT, manifest.version);

export const countries: Country[] = JSON.parse(fs.readFileSync(path.join(dir, 'countries.json'), 'utf8'));
export const byCode = new Map(countries.map((c) => [c.code, c]));

type Shape = Feature<Polygon | MultiPolygon>;
const topo = JSON.parse(fs.readFileSync(path.join(dir, 'world.topo.json'), 'utf8')) as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon>;
const geometry = new Map<string, Shape[]>();
for (const f of fc.features as Shape[]) {
  if (!f.id) continue;
  const code = String(f.id);
  geometry.set(code, [...(geometry.get(code) ?? []), f]);
}

/** km from a [lon, lat] point to a country: 0 if inside, else to its nearest outline point (same rule as the solo games) */
export function kmToCountry(p: [number, number], code: string): number {
  const feats = geometry.get(code);
  if (!feats?.length) return Infinity;
  if (feats.some((f) => geoContains(f, p))) return 0;
  let best = Infinity;
  for (const f of feats) {
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const v of poly[0]) best = Math.min(best, geoDistance(p, v as [number, number]));
  }
  return best * 6371;
}

/** the 4:3 flag as a data URL, with the ids that name the country taken out */
const flagCache = new Map<string, string>();
export function anonymousFlag(code: string): string {
  let url = flagCache.get(code);
  if (!url) {
    const svg = fs
      .readFileSync(path.join(FLAGS_DIR, `${code.toLowerCase()}.svg`), 'utf8')
      .replace(/\s(id|xlink:href|href)="#?[a-z]{2}-([a-z0-9-]+)"/gi, (_m, attr: string, rest: string) => ` ${attr}="${attr === 'id' ? '' : '#'}f-${rest}"`)
      .replace(/url\(#[a-z]{2}-/gi, 'url(#f-')
      .replace(/\sid="flag-icons-[a-z-]+"/gi, '');
    url = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    flagCache.set(code, url);
  }
  return url;
}

/* ---- scopes: mirrors apps/web/lib/scopes.ts ---- */
const ALSO: Record<string, string[]> = { RU: ['asia'], TR: ['europe'], KZ: ['europe'], EG: ['asia'], GE: ['europe'], AZ: ['europe'], AM: ['europe'], CY: ['asia'] };
export function continentsOf(c: Country): string[] {
  const base =
    c.region === 'Africa' ? 'africa'
    : c.region === 'Europe' ? 'europe'
    : c.region === 'Asia' ? 'asia'
    : c.region === 'Oceania' ? 'oceania'
    : c.region === 'Americas' ? (c.subregion === 'South America' ? 'south-america' : 'north-america')
    : null;
  return [...(base ? [base] : []), ...(ALSO[c.code] ?? [])];
}
export const inScope = (c: Country | undefined, scope: string) => scope === 'world' || (!!c && continentsOf(c).includes(scope));

export const dataVersion = manifest.version;
