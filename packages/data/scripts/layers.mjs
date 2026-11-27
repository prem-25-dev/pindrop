// Builds the Explore data layers from raw/ (run by build.mjs).
// Numeric layers become year series (one file each, loaded on demand); categorical facts are added
// to the country index. Every layer records its source.
import fs from 'node:fs';
import path from 'node:path';

/** International groups. Curated from each organisation's own member list (Wikidata's membership
 *  statements were incomplete: EU 26, NATO 30). Membership as of 2025. */
export const GROUPS = [
  { id: 'eu', label: 'European Union', url: 'https://european-union.europa.eu/principles-countries-history/eu-countries_en',
    members: 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE' },
  { id: 'nato', label: 'NATO', url: 'https://www.nato.int/cps/en/natohq/nato_countries.htm',
    members: 'AL BE BG CA HR CZ DK EE FI FR DE GR HU IS IT LV LT LU ME NL MK NO PL PT RO SK SI ES SE TR GB US' },
  { id: 'g20', label: 'G20', url: 'https://g20.org/', note: 'The EU and the African Union are also members.',
    members: 'AR AU BR CA CN FR DE IN ID IT JP KR MX RU SA ZA TR GB US' },
  { id: 'brics', label: 'BRICS', url: 'https://brics.br/en/about-the-brics', note: 'Saudi Arabia was invited but has not confirmed membership.',
    members: 'BR RU IN CN ZA EG ET IR AE ID' },
  { id: 'asean', label: 'ASEAN', url: 'https://asean.org/member-states/', note: 'Timor-Leste joined in October 2025.',
    members: 'BN KH ID LA MY MM PH SG TH VN TL' },
  { id: 'opec', label: 'OPEC', url: 'https://www.opec.org/opec_web/en/about_us/25.htm',
    members: 'DZ CG GQ GA IR IQ KW LY NG SA AE VE' },
  { id: 'commonwealth', label: 'Commonwealth', url: 'https://thecommonwealth.org/our-member-countries',
    members: 'AG AU BS BD BB BZ BW BN CM CA CY DM SZ FJ GA GM GH GD GY IN JM KE KI LS MW MY MV MT MU MZ NA NR NZ NG PK PG RW KN LC VC WS SC SL SG SB ZA LK TZ TO TT TG TV UG GB VU ZM' },
  { id: 'au', label: 'African Union', url: 'https://au.int/en/member_states/countryprofiles2', note: 'All 54 African UN members plus the Sahrawi Republic.',
    members: null /* computed: African UN members + EH */ },
  { id: 'arab', label: 'Arab League', url: 'http://www.lasportal.org/',
    members: 'DZ BH KM DJ EG IQ JO KW LB LY MR MA OM PS QA SA SO SD SY TN AE YE' },
];
const EXPECTED = { eu: 27, nato: 32, g20: 19, brics: 10, asean: 11, opec: 12, commonwealth: 56, au: 55, arab: 22 };

const NUMERIC = [
  { id: 'population', file: 'wb/SP.POP.TOTL.json' },
  { id: 'gdp', file: 'wb/NY.GDP.MKTP.CD.json' },
  { id: 'gdp_pc', file: 'wb/NY.GDP.PCAP.CD.json' },
  { id: 'gdp_growth', file: 'wb/NY.GDP.MKTP.KD.ZG.json' },
  { id: 'hdi', file: 'undp/hdi.json' },
  { id: 'life', file: 'wb/SP.DYN.LE00.IN.json' },
  { id: 'internet', file: 'wb/IT.NET.USER.ZS.json' },
  { id: 'co2_pc', file: 'wb/EN.GHG.CO2.PC.CE.AR5.json' },
];

const INCOME = { HIC: 'high', UMC: 'upper-middle', LMC: 'lower-middle', LIC: 'low' };
const round = (v) => +(+v).toPrecision(4);

export function buildLayers({ rawDir, outDir, countries, facts, problems }) {
  const raw = (f) => JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
  const toCode = new Map(facts.map((c) => [c.cca3, c.cca2]));
  toCode.set('XKX', 'XK'); // World Bank code for Kosovo
  const codes = new Set(countries.map((c) => c.code));
  const byCode = new Map(countries.map((c) => [c.code, c]));

  /* numeric layers: year series */
  fs.mkdirSync(path.join(outDir, 'layers'), { recursive: true });
  const latest = {}; // code -> { layerId: [value, year] }
  const sources = {};
  for (const { id, file } of NUMERIC) {
    const src = raw(file);
    sources[id] = { name: src.source, url: src.url, retrieved: src.retrieved };
    const series = new Map();
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [iso3, byYear] of Object.entries(src.series)) {
      const code = toCode.get(iso3);
      if (!code || !codes.has(code)) continue;
      series.set(code, byYear);
      for (const y of Object.keys(byYear)) {
        minY = Math.min(minY, +y);
        maxY = Math.max(maxY, +y);
      }
    }
    const years = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
    const values = {};
    for (const [code, byYear] of series) {
      values[code] = years.map((y) => (byYear[y] == null ? null : round(byYear[y])));
      const lastYear = years.filter((y) => byYear[y] != null).pop();
      if (lastYear != null) (latest[code] ??= {})[id] = [round(byYear[lastYear]), lastYear];
    }
    fs.writeFileSync(path.join(outDir, 'layers', `${id}.json`), JSON.stringify({ id, years, values, source: sources[id] }));
    if (series.size < 150) problems.push(`layer ${id}: only ${series.size} countries`);
  }
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify({ sources, values: latest }));

  /* categorical facts on the index */
  const income = raw('wb/income.json');
  const m49 = raw('un-m49.json');
  const wd = raw('wikidata/countries.json');
  const ldc = new Set(m49.ldc.map((i) => toCode.get(i)).filter(Boolean));
  const lldc = new Set(m49.lldc.map((i) => toCode.get(i)).filter(Boolean));
  const sids = new Set(m49.sids.map((i) => toCode.get(i)).filter(Boolean));

  const groups = GROUPS.map((g) => {
    const members = g.members
      ? g.members.split(/\s+/)
      : [...countries.filter((c) => c.un195 && c.region === 'Africa').map((c) => c.code), 'EH'];
    if (EXPECTED[g.id] && members.length !== EXPECTED[g.id]) problems.push(`group ${g.id}: expected ${EXPECTED[g.id]} members, got ${members.length}`);
    for (const m of members) if (!codes.has(m)) problems.push(`group ${g.id}: unknown code ${m}`);
    return { ...g, members };
  });

  // coastline length (World Factbook archive), matched by internet country domain (.in, .uk…)
  const coast = raw('factbook/coastline.json');
  const tldOf = new Map(facts.map((f) => [f.cca2, f.tld || []]));

  for (const c of countries) {
    const iso3 = c.iso3;
    const w = wd.countries[c.code];
    const cf = (tldOf.get(c.code) ?? []).map((t) => coast.byTld[t]).find(Boolean);
    c.coastline = cf ? { km: cf.km, landlocked: cf.landlocked, text: cf.text, src: 'factbook' } : null;
    c.income = INCOME[income.income[iso3] ?? (c.code === 'XK' ? income.income.XKX : undefined)] ?? null;
    c.ldc = ldc.has(c.code);
    c.lldc = lldc.has(c.code);
    c.sids = sids.has(c.code);
    c.groups = groups.filter((g) => g.members.includes(c.code)).map((g) => g.id);
    c.drivingSide = w?.side ?? null;
    if (w?.websites?.length) c.links.gov = w.websites.find((u) => /\.gov|\.gob|\.gouv|government|gov\./i.test(u)) ?? w.websites[0];
    if (w?.qid) c.links.wikidata = `https://www.wikidata.org/wiki/${w.qid}`;
    // population in the index follows the newest World Bank value
    const pop = latest[c.code]?.population;
    if (pop) c.population = { v: pop[0], year: pop[1], src: 'worldbank', url: `https://data.worldbank.org/indicator/SP.POP.TOTL?locations=${iso3}` };
  }

  fs.writeFileSync(
    path.join(outDir, 'categories.json'),
    JSON.stringify({
      groups: groups.map(({ id, label, url, note }) => ({ id, label, url, note: note ?? null, asOf: '2025' })),
      sources: {
        income: { name: income.source, url: income.url, retrieved: income.retrieved },
        ldc: { name: m49.source, url: m49.url, retrieved: m49.retrieved },
        driving: { name: 'Wikidata (property P1622, driving side)', url: 'https://www.wikidata.org/wiki/Property:P1622', retrieved: wd.retrieved },
        gov: { name: 'Wikidata (property P856, official website)', url: 'https://www.wikidata.org/wiki/Property:P856', retrieved: wd.retrieved },
        coastline: { name: coast.source, url: coast.url, retrieved: coast.retrieved },
      },
    }),
  );

  const un = countries.filter((c) => c.un195);
  return {
    summary: `layers ${NUMERIC.length} · income ${un.filter((c) => c.income).length}/195 · LDC ${un.filter((c) => c.ldc).length} · driving ${un.filter((c) => c.drivingSide).length}/195 · gov sites ${un.filter((c) => c.links.gov).length}/195 · groups ${groups.map((g) => `${g.id}:${g.members.length}`).join(' ')}`,
  };
}
