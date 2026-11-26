'use client';
import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'pinpoint-theme';

/** Runs in <head> before paint so there is no flash of the wrong theme. Keep in sync with applyTheme(). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var m=window.matchMedia('(prefers-color-scheme: dark)');var d=p==='dark'||(p==='system'&&m.matches);document.documentElement.classList.toggle('dark',d);}catch(e){if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}})();`;

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

const listeners = new Set<(p: ThemePref) => void>();

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>('system');

  useEffect(() => {
    setThemeState(readPref());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => readPref() === 'system' && applyTheme('system');
    mq.addEventListener('change', onSystem);
    listeners.add(setThemeState);
    return () => {
      mq.removeEventListener('change', onSystem);
      listeners.delete(setThemeState);
    };
  }, []);

  const setTheme = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* storage blocked: still apply for this visit */
    }
    applyTheme(p);
    listeners.forEach((l) => l(p));
  }, []);

  return { theme, setTheme };
}
