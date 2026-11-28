'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type DockPosition = 'bottom' | 'left';

interface Settings {
  dockPosition: DockPosition;
  tourDone: boolean;
  favorites: string[];
  /** game sounds on or off */
  sound: boolean;
  setSound: (v: boolean) => void;
  setDockPosition: (p: DockPosition) => void;
  setTourDone: (v: boolean) => void;
}

// Browser storage can be blocked (private mode); fall back to memory so the app still works.
const safeStorage = createJSONStorage(() => {
  try {
    const k = '__pp_test';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      dockPosition: 'bottom',
      tourDone: false,
      favorites: ['guess-flag', 'pin-drop'],
      sound: true,
      setSound: (sound) => set({ sound }),
      setDockPosition: (dockPosition) => set({ dockPosition }),
      setTourDone: (tourDone) => set({ tourDone }),
    }),
    { name: 'pinpoint-settings', storage: safeStorage },
  ),
);
