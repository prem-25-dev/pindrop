import { scaleQuantile } from 'd3-scale';
import type { CountryIndexItem } from './countries';

/** A data layer for the Explore map. Every layer names its source. */
export interface Layer {
  id: string;
  label: string;
  unit: string;
  value: (c: CountryIndexItem) => number | null;
  format: (v: number) => string;
  source: { name: string; url: string; note?: string };
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

export const LAYERS: Layer[] = [
  {
    id: 'population',
    label: 'Population',
    unit: 'people',
    value: (c) => c.population?.v ?? null,
    format: (v) => compact.format(v),
    source: { name: 'World Bank, SP.POP.TOTL (2024)', url: 'https://data.worldbank.org/indicator/SP.POP.TOTL' },
  },
  {
    id: 'density',
    label: 'Density',
    unit: 'people per km²',
    value: (c) => (c.population && c.area ? c.population.v / c.area.v : null),
    format: (v) => (v < 10 ? v.toFixed(1) : whole.format(v)),
    source: { name: 'Computed: World Bank population ÷ area', url: 'https://data.worldbank.org/indicator/SP.POP.TOTL', note: 'Population (World Bank, 2024) divided by area (mledoze/countries).' },
  },
  {
    id: 'area',
    label: 'Area',
    unit: 'km²',
    value: (c) => c.area?.v ?? null,
    format: (v) => compact.format(v),
    source: { name: 'mledoze/countries', url: 'https://github.com/mledoze/countries' },
  },
];

/** 7 classes from light sand to deep plum; readable in light and dark. */
export const RAMP = ['#fbe8c8', '#f6c98f', '#f0a56f', '#e27f68', '#c9606f', '#9c4c7d', '#64397a'];

export function buildScale(layer: Layer, countries: CountryIndexItem[]) {
  const values = countries.map(layer.value).filter((v): v is number => v != null && Number.isFinite(v));
  const scale = scaleQuantile<string>().domain(values).range(RAMP);
  const breaks = scale.quantiles();
  return {
    color: (c: CountryIndexItem | undefined) => {
      const v = c ? layer.value(c) : null;
      return v == null ? null : scale(v);
    },
    legend: RAMP.map((color, i) => ({ color, from: i === 0 ? Math.min(...values) : breaks[i - 1], to: i === RAMP.length - 1 ? Math.max(...values) : breaks[i] })),
  };
}
