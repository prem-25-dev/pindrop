'use client';
import { scaleQuantile, scaleThreshold } from 'd3-scale';
import { useEffect, useState } from 'react';
import type { CountryIndexItem } from './countries';

/* =====================================================================
   Explore data layers. Every layer names its source.
   - num:  a number per country, usually a year series loaded on demand
   - cat:  a category per country (income group, LDC, driving side…)
   - group: membership of one international organisation
   ===================================================================== */

export type LayerGroup = 'People' | 'Economy' | 'Planet' | 'Politics & culture';

interface Base {
  id: string;
  label: string;
  group: LayerGroup;
  source: { name: string; url: string; note?: string };
}
export interface NumLayer extends Base {
  kind: 'num';
  unit: string;
  /** year series file in /data/<v>/layers/, or a per-country static value */
  series?: string;
  derive?: 'density';
  static?: (c: CountryIndexItem) => number | null;
  scale: 'quantile' | 'growth';
  format: (v: number) => string;
}
export interface CatLayer extends Base {
  kind: 'cat';
  categories: { id: string; label: string; color: string }[];
  value: (c: CountryIndexItem) => string | null;
}
export interface GroupLayer extends Base {
  kind: 'group';
}
export type Layer = NumLayer | CatLayer | GroupLayer;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const money = (v: number) => `$${compact.format(v)}`;
const fixed = (d: number) => (v: number) => v.toFixed(d);
const pct = (v: number) => `${v.toFixed(v < 10 ? 1 : 0)}%`;
const WB = (id: string) => `https://data.worldbank.org/indicator/${id}`;

export const LAYERS: Layer[] = [
  // People
  { kind: 'num', id: 'population', label: 'Population', group: 'People', unit: 'people', series: 'population', scale: 'quantile', format: (v) => compact.format(v), source: { name: 'World Bank, SP.POP.TOTL', url: WB('SP.POP.TOTL') } },
  { kind: 'num', id: 'density', label: 'Density', group: 'People', unit: 'people per km²', series: 'population', derive: 'density', scale: 'quantile', format: (v) => (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en')), source: { name: 'Computed: World Bank population ÷ area', url: WB('SP.POP.TOTL'), note: 'Population (World Bank) divided by land area (mledoze/countries).' } },
  { kind: 'num', id: 'life', label: 'Life expectancy', group: 'People', unit: 'years at birth', series: 'life', scale: 'quantile', format: fixed(1), source: { name: 'World Bank, SP.DYN.LE00.IN', url: WB('SP.DYN.LE00.IN') } },
  { kind: 'num', id: 'hdi', label: 'Human Development Index', group: 'People', unit: 'index, 0 to 1', series: 'hdi', scale: 'quantile', format: fixed(3), source: { name: 'UNDP Human Development Report 2025', url: 'https://hdr.undp.org/data-center/human-development-index' } },
  // Economy
  { kind: 'num', id: 'gdp', label: 'GDP', group: 'Economy', unit: 'current US$', series: 'gdp', scale: 'quantile', format: money, source: { name: 'World Bank, NY.GDP.MKTP.CD', url: WB('NY.GDP.MKTP.CD') } },
  { kind: 'num', id: 'gdp_pc', label: 'GDP per person', group: 'Economy', unit: 'current US$', series: 'gdp_pc', scale: 'quantile', format: money, source: { name: 'World Bank, NY.GDP.PCAP.CD', url: WB('NY.GDP.PCAP.CD') } },
  { kind: 'num', id: 'gdp_growth', label: 'GDP growth', group: 'Economy', unit: '% per year', series: 'gdp_growth', scale: 'growth', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, source: { name: 'World Bank, NY.GDP.MKTP.KD.ZG', url: WB('NY.GDP.MKTP.KD.ZG') } },
  {
    kind: 'cat', id: 'income', label: 'Income group', group: 'Economy',
    categories: [
      { id: 'low', label: 'Low income', color: '#e0745a' },
      { id: 'lower-middle', label: 'Lower-middle', color: '#f2b45b' },
      { id: 'upper-middle', label: 'Upper-middle', color: '#79c08a' },
      { id: 'high', label: 'High income', color: '#3d7fd1' },
    ],
    value: (c) => c.income ?? null,
    source: { name: 'World Bank income classification', url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/906519' },
  },
  {
    kind: 'cat', id: 'ldc', label: 'Least developed', group: 'Economy',
    categories: [
      { id: 'yes', label: 'Least developed country', color: '#e27f68' },
      { id: 'no', label: 'Not on the list', color: '#cdd5dc' },
    ],
    value: (c) => (c.un195 ? (c.ldc ? 'yes' : 'no') : null),
    source: { name: 'UN Statistics Division, M49 (LDC list)', url: 'https://unstats.un.org/unsd/methodology/m49/overview/' },
  },
  // Planet
  { kind: 'num', id: 'internet', label: 'Internet use', group: 'Planet', unit: '% of people online', series: 'internet', scale: 'quantile', format: pct, source: { name: 'World Bank, IT.NET.USER.ZS', url: WB('IT.NET.USER.ZS') } },
  { kind: 'num', id: 'co2_pc', label: 'CO₂ per person', group: 'Planet', unit: 'tonnes per person', series: 'co2_pc', scale: 'quantile', format: fixed(1), source: { name: 'World Bank, EN.GHG.CO2.PC.CE.AR5', url: WB('EN.GHG.CO2.PC.CE.AR5') } },
  { kind: 'num', id: 'area', label: 'Area', group: 'Planet', unit: 'km²', static: (c) => c.area?.v ?? null, scale: 'quantile', format: (v) => compact.format(v), source: { name: 'mledoze/countries', url: 'https://github.com/mledoze/countries' } },
  // Politics & culture
  { kind: 'group', id: 'groups', label: 'Memberships', group: 'Politics & culture', source: { name: 'Official member lists (as of 2025)', url: 'https://github.com/prem-25-dev/pindrop/blob/main/packages/data/scripts/layers.mjs' } },
  {
    kind: 'cat', id: 'driving', label: 'Driving side', group: 'Politics & culture',
    categories: [
      { id: 'left', label: 'Drive on the left', color: '#9b6bd6' },
      { id: 'right', label: 'Drive on the right', color: '#3fa7a0' },
    ],
    value: (c) => c.drivingSide ?? null,
    source: { name: 'Wikidata, property P1622', url: 'https://www.wikidata.org/wiki/Property:P1622' },
  },
];

/* ---------- year series ---------- */
export interface Series {
  years: number[];
  values: Record<string, (number | null)[]>;
}
const seriesCache = new Map<string, Promise<Series>>();
let version: Promise<string> | null = null;
const dataVersion = () => (version ??= fetch('/data/manifest.json').then((r) => r.json()).then((m) => m.version as string));

export function loadSeries(name: string): Promise<Series> {
  if (!seriesCache.has(name)) {
    const p = dataVersion().then((v) => fetch(`/data/${v}/layers/${name}.json`)).then((r) => r.json());
    p.catch(() => seriesCache.delete(name));
    seriesCache.set(name, p);
  }
  return seriesCache.get(name)!;
}

export function useSeries(layer: Layer | null) {
  const name = layer?.kind === 'num' ? layer.series : undefined;
  const [series, setSeries] = useState<Series | null>(null);
  useEffect(() => {
    setSeries(null);
    if (!name) return;
    let alive = true;
    loadSeries(name).then((s) => alive && setSeries(s));
    return () => {
      alive = false;
    };
  }, [name]);
  return series;
}

/** the value of a number layer for a country: at a given year, or its latest available ('latest') */
export function numValue(layer: NumLayer, c: CountryIndexItem | undefined, series: Series | null, year: number | 'latest'): { v: number; year: number | null } | null {
  if (!c) return null;
  if (layer.static) {
    const v = layer.static(c);
    return v == null ? null : { v, year: null };
  }
  const row = series?.values[c.code];
  if (!series || !row) return null;
  let i = year === 'latest' ? -1 : series.years.indexOf(year);
  if (year === 'latest') for (let j = row.length - 1; j >= 0; j--) if (row[j] != null) { i = j; break; }
  const raw = i >= 0 ? row[i] : null;
  if (raw == null) return null;
  const v = layer.derive === 'density' ? (c.area?.v ? raw / c.area.v : null) : raw;
  return v == null ? null : { v, year: series.years[i] };
}

/** years worth sliding through: from the first year at least 40% of countries have data */
export function usefulYears(series: Series | null): number[] {
  if (!series) return [];
  const rows = Object.values(series.values);
  return series.years.filter((_, i) => rows.filter((r) => r[i] != null).length >= rows.length * 0.4);
}

/* ---------- colour scales ---------- */
export const RAMP = ['#fbe8c8', '#f6c98f', '#f0a56f', '#e27f68', '#c9606f', '#9c4c7d', '#64397a'];
const GROWTH = ['#b2182b', '#e0745a', '#f4c3a5', '#e6e1d8', '#b8dca5', '#6fbb7c', '#2b8a4e'];
const GROWTH_STEPS = [-4, -1, 1, 3, 5, 7];

export interface Legend {
  bins: { color: string; label: string }[];
}

/** a stable colour scale for a number layer: pooled over every year so colours mean the same in 1990 and 2024 */
export function numScale(layer: NumLayer, countries: CountryIndexItem[], series: Series | null) {
  if (layer.scale === 'growth') {
    const s = scaleThreshold<number, string>().domain(GROWTH_STEPS).range(GROWTH);
    return {
      color: (v: number) => s(v),
      legend: { bins: GROWTH.map((color, i) => ({ color, label: i === 0 ? `< ${GROWTH_STEPS[0]}%` : i === GROWTH.length - 1 ? `> ${GROWTH_STEPS[i - 1]}%` : `${GROWTH_STEPS[i - 1]}…${GROWTH_STEPS[i]}%` })) },
    };
  }
  const pool: number[] = [];
  for (const c of countries) {
    if (layer.static) {
      const v = layer.static(c);
      if (v != null) pool.push(v);
      continue;
    }
    const row = series?.values[c.code];
    if (!row) continue;
    for (const raw of row) {
      if (raw == null) continue;
      const v = layer.derive === 'density' ? (c.area?.v ? raw / c.area.v : null) : raw;
      if (v != null && Number.isFinite(v)) pool.push(v);
    }
  }
  if (!pool.length) return null;
  const s = scaleQuantile<string>().domain(pool).range(RAMP);
  const q = s.quantiles();
  return {
    color: (v: number) => s(v),
    legend: { bins: RAMP.map((color, i) => ({ color, label: i === 0 ? `< ${layer.format(q[0])}` : i === RAMP.length - 1 ? `> ${layer.format(q[q.length - 1])}` : `${layer.format(q[i - 1])}–${layer.format(q[i])}` })) },
  };
}

/* ---------- groups & latest facts ---------- */
export interface GroupInfo {
  id: string;
  label: string;
  url: string;
  note: string | null;
  asOf: string;
}
export interface Categories {
  groups: GroupInfo[];
  sources: Record<string, { name: string; url: string; retrieved: string }>;
}
export interface Latest {
  sources: Record<string, { name: string; url: string; retrieved: string }>;
  values: Record<string, Record<string, [number, number]>>;
}

const once = <T,>(file: string) => {
  let p: Promise<T> | null = null;
  return () => (p ??= dataVersion().then((v) => fetch(`/data/${v}/${file}`)).then((r) => r.json() as Promise<T>));
};
export const loadCategories = once<Categories>('categories.json');
export const loadLatest = once<Latest>('latest.json');

export function useLoaded<T>(loader: () => Promise<T>) {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    loader().then((x) => alive && setV(x)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [loader]);
  return v;
}
