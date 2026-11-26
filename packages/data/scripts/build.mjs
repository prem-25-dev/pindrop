// Pinpoint data build: raw sources -> versioned JSON in apps/web/public/data/<version>/
// Every value that is shown to users carries { v, year, src } so the UI can link it to its source.
// Run: npm run data   (from the repo root)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const repo = path.resolve(pkg, '../..');
const require = createRequire(import.meta.url);

const VERSION = 'v2026.11';
const OUT = path.join(repo, 'apps/web/public/data', VERSION);
const FLAGS_OUT = path.join(repo, 'apps/web/public/flags');
const FLAGS_SRC = path.join(path.dirname(require.resolve('flag-icons/package.json')), 'flags/4x3');
// True-proportion flags (Wikipedia-derived, public domain) for showing a flag on its own.
// The 4:3 set above stays for map fills, where every flag needs the same box.
const TRUE_FLAGS_SRC = path.join(path.dirname(require.resolve('svg-country-flags/package.json')), 'svg');
const TRUE_FLAGS_OUT = path.join(repo, 'apps/web/public/flags/true');

/** width / height of an SVG flag, from its viewBox or width/height attributes */
function svgRatio(file) {
  const head = fs.readFileSync(file, 'utf8').slice(0, 2000);
  const vb = head.match(/viewBox="([^"]+)"/);
  if (vb) {
    const [, , w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
    if (w > 0 && h > 0) return +(w / h).toFixed(4);
  }
  const w = parseFloat(head.match(/\swidth="([\d.]+)/)?.[1] ?? '');
  const h = parseFloat(head.match(/\sheight="([\d.]+)/)?.[1] ?? '');
  return w > 0 && h > 0 ? +(w / h).toFixed(4) : null;
}

const raw = (f) => JSON.parse(fs.readFileSync(path.join(pkg, 'raw', f), 'utf8'));
const topo = raw('countries-50m.json');
const facts = raw('mledoze.json');
const [, popRows] = raw('pop.json');

// ---------- sources ----------
const SOURCES = {
  worldbank: { id: 'worldbank', name: 'World Bank Open Data', license: 'CC BY 4.0', url: 'https://data.worldbank.org/' },
  mledoze: { id: 'mledoze', name: 'mledoze/countries', license: 'ODbL', url: 'https://github.com/mledoze/countries' },
  naturalearth: { id: 'naturalearth', name: 'Natural Earth (via world-atlas)', license: 'Public domain', url: 'https://www.naturalearthdata.com/' },
  flagicons: { id: 'flagicons', name: 'flag-icons', license: 'MIT', url: 'https://github.com/lipis/flag-icons' },
  countryflags: { id: 'countryflags', name: 'svg-country-flags (from Wikipedia)', license: 'Public domain', url: 'https://github.com/hjnilsson/country-flags' },
};
// Per-country deep link for a World Bank indicator
const wbLink = (indicator, iso3) => `https://data.worldbank.org/indicator/${indicator}?locations=${iso3}`;

// ---------- helpers ----------
const slugify = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const problems = [];
// Gaps we know about and will fill from another source (never with invented numbers).
const KNOWN_GAPS = { VA: 'not covered by the World Bank; to be filled from Wikidata' };

const popByIso3 = new Map();
for (const r of popRows) if (r.value != null) popByIso3.set(r.countryiso3code, { v: r.value, year: Number(r.date) });

// UN members (193) + the two UN observer states = 195
const isUN195 = (c) => c.unMember || c.cca2 === 'VA' || c.cca2 === 'PS';

// ---------- shapes: ids -> ISO alpha-2, drop Antarctica ----------
const byNumeric = new Map(facts.map((c) => [c.ccn3, c]));
const NAME_FALLBACK = { Kosovo: 'XK', 'Indian Ocean Ter.': 'AU' };
const DISPUTED = new Set(['Somaliland', 'N. Cyprus', 'Siachen Glacier']);
const shapeCodes = new Set();
topo.objects.countries.geometries = topo.objects.countries.geometries.filter((g) => {
  const name = g.properties?.name;
  const code = (g.id && byNumeric.get(g.id)?.cca2) || NAME_FALLBACK[name];
  if (code === 'AQ') return false;
  if (code) { g.id = code; g.properties = {}; shapeCodes.add(code); return true; }
  if (DISPUTED.has(name)) { g.id = null; g.properties = { disputed: name }; return true; }
  problems.push(`shape without match: ${g.id} ${name}`);
  return false;
});

// ---------- country index ----------
const aliasesOf = (c) => {
  const s = new Set([c.name.common, c.name.official, ...(c.altSpellings || [])]);
  for (const n of Object.values(c.name.native || {})) { s.add(n.common); s.add(n.official); }
  for (const n of Object.values(c.translations || {})) s.add(n.common);
  s.delete(c.cca2);
  return [...s].filter((x) => x && x.length > 2);
};

const countries = facts
  .filter((c) => c.cca2 !== 'AQ')
  .map((c) => {
    const flagFile = `${c.cca2.toLowerCase()}.svg`;
    if (!fs.existsSync(path.join(FLAGS_SRC, flagFile))) problems.push(`no flag: ${c.cca2}`);
    const pop = popByIso3.get(c.cca3);
    if (!pop && isUN195(c)) {
      if (KNOWN_GAPS[c.cca2]) console.warn(`note: no World Bank population for ${c.cca2} (${KNOWN_GAPS[c.cca2]})`);
      else problems.push(`no population: ${c.cca2}`);
    }
    const [lat, lng] = c.capitalInfo?.latlng || c.latlng || [];
    return {
      code: c.cca2,
      iso3: c.cca3,
      name: c.name.common,
      official: c.name.official,
      slug: slugify(c.name.common),
      region: c.region,
      subregion: c.subregion || '',
      un195: isUN195(c),
      capital: c.capital?.[0] ? { name: c.capital[0], lat: lat ?? null, lng: lng ?? null } : null,
      latlng: c.latlng,
      area: c.area > 0 ? { v: c.area, year: null, src: 'mledoze' } : null,
      population: pop ? { v: pop.v, year: pop.year, src: 'worldbank', url: wbLink('SP.POP.TOTL', c.cca3) } : null,
      landlocked: !!c.landlocked,
      languages: Object.values(c.languages || {}).slice(0, 3),
      currency: Object.entries(c.currencies || {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol || '' }))[0] ?? null,
      hasShape: shapeCodes.has(c.cca2),
      aliases: aliasesOf(c),
      flag: `/flags/${flagFile}`,
      ...(() => {
        const src = path.join(TRUE_FLAGS_SRC, flagFile);
        if (!fs.existsSync(src)) {
          if (isUN195(c)) problems.push(`no true-proportion flag: ${c.cca2}`);
          return { flagTrue: `/flags/${flagFile}`, flagRatio: 4 / 3 };
        }
        return { flagTrue: `/flags/true/${flagFile}`, flagRatio: svgRatio(src) ?? 1.5 };
      })(),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const un = countries.filter((c) => c.un195).length;
if (un !== 195) problems.push(`expected 195 UN countries, got ${un}`);

// ---------- write ----------
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FLAGS_OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'countries.json'), JSON.stringify(countries));
fs.writeFileSync(path.join(OUT, 'world.topo.json'), JSON.stringify(topo));
fs.writeFileSync(path.join(OUT, 'sources.json'), JSON.stringify(SOURCES, null, 2));
fs.writeFileSync(path.join(repo, 'apps/web/public/data/manifest.json'), JSON.stringify({ version: VERSION, built: new Date().toISOString() }));

// ---------- background map: six continents (Natural Earth 1:110m), no Antarctica ----------
// Countries are merged per continent. Russia is split along the Ural ridge so Siberia sits in Asia.
{
  const { merge } = await import('topojson-client');
  const { geoEqualEarth, geoPath } = await import('d3-geo');
  const t110 = raw('countries-110m.json');
  const regionOf = (c) => {
    if (c.region === 'Americas') return c.subregion === 'South America' ? 'sa' : 'na';
    return { Africa: 'af', Europe: 'eu', Asia: 'as', Oceania: 'oc' }[c.region] ?? null;
  };
  const BY_NAME = { Kosovo: 'eu', 'N. Cyprus': 'eu', Somaliland: 'af' };
  const groups = { na: [], sa: [], eu: [], af: [], as: [], oc: [] };
  let russia = null;
  for (const g of t110.objects.countries.geometries) {
    const c = byNumeric.get(g.id);
    if (c?.cca2 === 'RU') { russia = g; continue; }
    const k = c ? regionOf(c) : BY_NAME[g.properties?.name];
    if (k) groups[k].push(g);
    else if (!c || c.region !== 'Antarctic') problems.push(`continent unknown: ${g.id} ${g.properties?.name}`);
  }

  const { default: clip } = await import('polygon-clipping');
  const { geoGraticule } = await import('d3-geo');
  const shapes = Object.fromEntries(Object.entries(groups).map(([k, gs]) => [k, merge(t110, gs)]));

  // Europe–Asia line through Russia: the Ural ridge from the Kara Sea (Baydaratskaya Bay)
  // south to the Kazakh border near Orsk. West of it is Europe, east of it is Asia.
  const URALS = [[68.5, 69.6], [66.2, 67.8], [64.6, 66.3], [61.2, 64.6], [59.4, 62.4], [59.2, 60.2], [59.6, 58.2], [59.3, 56.4], [59.8, 54.6], [58.9, 52.6], [58.5, 50.6]];
  const EUROPE_SIDE = [[...URALS, [58.5, 40], [15, 40], [15, 85], [70, 85], [70, 70.5], URALS[0]]];
  const ASIA_SIDE = [[...URALS, [58.5, 40], [200, 40], [200, 85], [70, 85], [70, 70.5], URALS[0]]];
  // Russia's outline is stitched across the antimeridian (+180 → −180). On a flat plane that jump
  // spans the whole map, so unwrap it first: −170° becomes 190°. d3-geo reads angles past 180 fine.
  const unwrap = (mp) => mp.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => [lon < -100 ? lon + 360 : lon, lat])));
  const ru = unwrap(merge(t110, [russia]).coordinates);
  // polygon-clipping winds rings for a flat plane; d3-geo is spherical and may read a ring as
  // "everything except this shape". Orient each piece so it covers the smaller area (pieces that
  // cross ±180° come out the other way round, so this is decided per piece, not globally).
  const { geoArea } = await import('d3-geo');
  const forD3 = (mp) =>
    mp.map((poly) => (geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI ? poly.map((ring) => ring.slice().reverse()) : poly));
  const ruEurope = forD3(clip.intersection(ru, EUROPE_SIDE));
  const ruAsia = forD3(clip.intersection(ru, ASIA_SIDE));
  shapes.eu = { type: 'MultiPolygon', coordinates: [...shapes.eu.coordinates, ...ruEurope] };
  shapes.as = { type: 'MultiPolygon', coordinates: [...shapes.as.coordinates, ...ruAsia] };

  // Equal Earth, centred at 11°E (the usual convention) so Chukotka and the Pacific islands stay
  // on the right edge instead of wrapping to the left. Fit the whole oval to the width.
  const W = 1000, PAD = 6;
  const projection = geoEqualEarth().rotate([-11, 0]).fitWidth(W - PAD * 2, { type: 'Sphere' });
  const [tx, ty] = projection.translate();
  projection.translate([tx + PAD, ty + PAD]);
  const gp = geoPath(projection).digits(1);
  const H = Math.ceil(gp.bounds({ type: 'Sphere' })[1][1] + PAD);

  const NAMES = { na: 'North America', sa: 'South America', eu: 'Europe', af: 'Africa', as: 'Asia', oc: 'Oceania' };
  const continents = Object.entries(shapes).map(([id, geom]) => ({ id, name: NAMES[id], d: gp(geom) }));
  fs.writeFileSync(
    path.join(OUT, 'world-continents.json'),
    JSON.stringify({
      w: W,
      h: H,
      projection: 'Equal Earth, centred 11°E',
      sphere: gp({ type: 'Sphere' }),
      graticule: gp(geoGraticule().step([30, 30])()),
      continents,
      src: 'naturalearth',
    }),
  );
}

let copied = 0;
for (const c of countries) {
  const f = `${c.code.toLowerCase()}.svg`;
  const src = path.join(FLAGS_SRC, f);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(FLAGS_OUT, f)); copied++; }
  const trueSrc = path.join(TRUE_FLAGS_SRC, f);
  if (fs.existsSync(trueSrc)) {
    fs.mkdirSync(TRUE_FLAGS_OUT, { recursive: true });
    fs.copyFileSync(trueSrc, path.join(TRUE_FLAGS_OUT, f));
  }
}

const kb = (f) => `${Math.round(fs.statSync(path.join(OUT, f)).size / 1024)} KB`;
console.log(`[data ${VERSION}] countries ${countries.length} (UN-195: ${un}) ${kb('countries.json')} · shapes ${topo.objects.countries.geometries.length} ${kb('world.topo.json')} · flags ${copied}`);
if (problems.length) { console.error('PROBLEMS:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
else console.log('All checks passed.');
