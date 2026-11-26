'use client';
import { useEffect, useState } from 'react';

export interface CountryIndexItem {
  code: string;
  iso3: string;
  name: string;
  official: string;
  slug: string;
  region: string;
  subregion: string;
  un195: boolean;
  capital: { name: string; lat: number | null; lng: number | null } | null;
  aliases: string[];
  population: { v: number; year: number; src: string; url: string } | null;
  area: { v: number; year: null; src: string } | null;
  languages: string[];
  currency: { code: string; name: string; symbol: string } | null;
  landlocked: boolean;
  /** land neighbours, ISO alpha-2 */
  borders: string[];
  links: { wikipedia: string; worldbank: string | null; gov?: string; wikidata?: string };
  income: 'low' | 'lower-middle' | 'upper-middle' | 'high' | null;
  ldc: boolean;
  lldc: boolean;
  sids: boolean;
  groups: string[];
  drivingSide: 'left' | 'right' | null;
  latlng: [number, number];
  hasShape: boolean;
  /** 4:3 flag, for map fills and uniform boxes */
  flag: string;
  /** square flag (redrawn for circles and avatars) */
  flagSquare: string;
  /** flag in its real proportions, for showing a flag on its own */
  flagTrue: string;
  /** width / height of the real flag */
  flagRatio: number;
}

let cache: Promise<CountryIndexItem[]> | null = null;

/** Loads the versioned country index once (the data build writes it to /public/data). */
export function loadCountries(): Promise<CountryIndexItem[]> {
  cache ??= fetch('/data/manifest.json')
    .then((r) => r.json())
    .then((m: { version: string }) => fetch(`/data/${m.version}/countries.json`))
    .then((r) => r.json());
  cache.catch(() => (cache = null));
  return cache;
}

export function useCountries() {
  const [list, setList] = useState<CountryIndexItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadCountries().then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}
