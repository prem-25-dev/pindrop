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
      hasShape: shapeCodes.has(c.cca2),
      aliases: aliasesOf(c),
      flag: `/flags/${flagFile}`,
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

let copied = 0;
for (const c of countries) {
  const f = `${c.code.toLowerCase()}.svg`;
  const src = path.join(FLAGS_SRC, f);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(FLAGS_OUT, f)); copied++; }
}

const kb = (f) => `${Math.round(fs.statSync(path.join(OUT, f)).size / 1024)} KB`;
console.log(`[data ${VERSION}] countries ${countries.length} (UN-195: ${un}) ${kb('countries.json')} · shapes ${topo.objects.countries.geometries.length} ${kb('world.topo.json')} · flags ${copied}`);
if (problems.length) { console.error('PROBLEMS:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
else console.log('All checks passed.');
