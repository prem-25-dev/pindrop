// Pinpoint data fetch: downloads remote sources into packages/data/raw/ so the build stays
// reproducible and offline. Run monthly (Coolify job): npm run fetch -w @pinpoint/data && npm run data
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(pkg, 'raw');
const UA = 'PinpointDataBuild/0.1 (open-source geography site)';
const today = new Date().toISOString().slice(0, 10);

const getJSON = async (url, init = {}) => {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};
const write = (file, data) => {
  fs.mkdirSync(path.dirname(path.join(RAW, file)), { recursive: true });
  fs.writeFileSync(path.join(RAW, file), JSON.stringify(data));
  console.log(`  wrote raw/${file}`);
};

/* ---------- World Bank indicators: full time series, compacted to { ISO3: { year: value } } ---------- */
export const WB_INDICATORS = {
  'SP.POP.TOTL': 'Population, total',
  'NY.GDP.MKTP.CD': 'GDP (current US$)',
  'NY.GDP.PCAP.CD': 'GDP per capita (current US$)',
  'NY.GDP.MKTP.KD.ZG': 'GDP growth (annual %)',
  'SP.DYN.LE00.IN': 'Life expectancy at birth, total (years)',
  'IT.NET.USER.ZS': 'Individuals using the Internet (% of population)',
  'EN.GHG.CO2.PC.CE.AR5': 'CO2 emissions excluding LULUCF per capita (t CO2e/capita)',
};

async function worldBank() {
  console.log('World Bank indicators…');
  for (const [id, name] of Object.entries(WB_INDICATORS)) {
    const [meta, rows] = await getJSON(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=20000&date=1960:2030`);
    const series = {};
    for (const r of rows ?? []) {
      if (r.value == null || !r.countryiso3code) continue;
      (series[r.countryiso3code] ??= {})[r.date] = +r.value;
    }
    write(`wb/${id}.json`, { id, name, source: 'World Bank Open Data', url: `https://data.worldbank.org/indicator/${id}`, retrieved: today, lastupdated: meta?.lastupdated ?? null, series });
  }
  console.log('World Bank country metadata (income groups)…');
  const [, countries] = await getJSON('https://api.worldbank.org/v2/country?format=json&per_page=400');
  const income = {};
  for (const c of countries) if (c.incomeLevel?.id && c.incomeLevel.id !== 'NA' && c.region?.id !== 'NA') income[c.id] = c.incomeLevel.id; // id is ISO3
  write('wb/income.json', { source: 'World Bank country classifications by income level', url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/906519', retrieved: today, income });
}

/* ---------- UNDP Human Development Index (HDR 2025 composite indices) ---------- */
async function undp() {
  console.log('UNDP HDI…');
  const url = 'https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const head = headerLine.split(',');
  const iIso = head.indexOf('iso3');
  const hdiCols = head.map((h, i) => [h, i]).filter(([h]) => /^hdi_\d{4}$/.test(h));
  const series = {};
  for (const line of lines) {
    // the only quoted field is the country name; split respecting quotes
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')) ?? [];
    const iso = cells[iIso];
    if (!iso || iso.startsWith('ZZ')) continue; // ZZ* = regional aggregates
    for (const [h, i] of hdiCols) {
      const v = parseFloat(cells[i]);
      if (Number.isFinite(v)) (series[iso] ??= {})[h.slice(4)] = v;
    }
  }
  write('undp/hdi.json', { source: 'UNDP Human Development Report 2025', url: 'https://hdr.undp.org/data-center/documentation-and-downloads', retrieved: today, series });
}

/* ---------- Wikidata: official website and driving side, keyed by ISO alpha-2 ---------- */
async function wikidata() {
  console.log('Wikidata (official websites, driving side)…');
  const query = `
    SELECT ?iso ?item ?site ?sideLabel WHERE {
      ?item wdt:P297 ?iso .
      OPTIONAL { ?item wdt:P856 ?site . }
      OPTIONAL { ?item wdt:P1622 ?side . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const j = await getJSON(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/sparql-results+json' } });
  const out = {};
  for (const b of j.results.bindings) {
    const iso = b.iso.value.toUpperCase();
    const row = (out[iso] ??= { qid: b.item.value.split('/').pop(), websites: [], side: null });
    if (b.site && !row.websites.includes(b.site.value)) row.websites.push(b.site.value);
    if (b.sideLabel) row.side = /left/i.test(b.sideLabel.value) ? 'left' : /right/i.test(b.sideLabel.value) ? 'right' : row.side;
  }
  write('wikidata/countries.json', { source: 'Wikidata', url: 'https://www.wikidata.org/', license: 'CC0', retrieved: today, countries: out });
}

const only = process.argv.slice(2);
const steps = { worldbank: worldBank, undp, wikidata };
for (const [name, fn] of Object.entries(steps)) {
  if (only.length && !only.includes(name)) continue;
  await fn();
}
console.log('Fetch done. Note: UN M49 (LDC/LLDC/SIDS) is parsed from the UNSD overview page into raw/un-m49.json.');
