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
  /** 4:3 flag, for map fills and uniform boxes */
  flag: string;
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
