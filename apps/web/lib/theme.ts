'use client';
import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type PaletteId = 'mono' | 'atlas' | 'terra' | 'ocean' | 'sakura' | 'forest' | 'candy';

export const PALETTES: { id: PaletteId; label: string; note: string }[] = [
  { id: 'atlas', label: 'Atlas', note: 'Warm paper clay, vermilion and teal' },
  { id: 'mono', label: 'Mono', note: 'Cool grey clay, cobalt accent' },
  { id: 'terra', label: 'Terra', note: 'Sand and terracotta clay, sage and ochre' },
  // from the shop
  { id: 'ocean', label: 'Ocean', note: 'Sea-glass clay with a coral accent' },
  { id: 'sakura', label: 'Sakura', note: 'Blossom pink clay with plum' },
  { id: 'forest', label: 'Forest', note: 'Moss clay with amber' },
  { id: 'candy', label: 'Candy', note: 'Lilac clay, bubblegum and mint' },
];
export const PALETTE_IDS = PALETTES.map((p) => p.id);

const THEME_KEY = 'pinpoint-theme';
const PALETTE_KEY = 'pinpoint-palette';
const DEFAULT_PALETTE: PaletteId = 'atlas';

/** Runs in <head> before paint so there is no flash of the wrong theme or palette. */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;var p='system',c='${DEFAULT_PALETTE}';try{p=localStorage.getItem('${THEME_KEY}')||'system';c=localStorage.getItem('${PALETTE_KEY}')||'${DEFAULT_PALETTE}';}catch(e){}var dark=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);d.setAttribute('data-palette',c);})();`;

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage blocked: still applies for this visit */
  }
};

function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

type State = { theme: ThemePref; palette: PaletteId };
const listeners = new Set<(s: Partial<State>) => void>();

export function useTheme() {
  const [state, setState] = useState<State>({ theme: 'system', palette: DEFAULT_PALETTE });

  useEffect(() => {
    setState({
      theme: read<ThemePref>(THEME_KEY, ['system', 'light', 'dark'], 'system'),
      palette: read<PaletteId>(PALETTE_KEY, PALETTE_IDS, DEFAULT_PALETTE),
    });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => read(THEME_KEY, ['system', 'light', 'dark'] as const, 'system') === 'system' && applyTheme('system');
    mq.addEventListener('change', onSystem);
    const l = (s: Partial<State>) => setState((prev) => ({ ...prev, ...s }));
    listeners.add(l);
    return () => {
      mq.removeEventListener('change', onSystem);
      listeners.delete(l);
    };
  }, []);

  const setTheme = useCallback((theme: ThemePref) => {
    write(THEME_KEY, theme);
    applyTheme(theme);
    listeners.forEach((l) => l({ theme }));
  }, []);

  const setPalette = useCallback((palette: PaletteId) => {
    write(PALETTE_KEY, palette);
    document.documentElement.setAttribute('data-palette', palette);
    listeners.forEach((l) => l({ palette }));
  }, []);

  return { ...state, setTheme, setPalette };
}
