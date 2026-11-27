'use client';
import { create } from 'zustand';

/** Focus mode: while a game is being played, the app chrome (header, dock, backdrop) steps aside. */
export const useFocusMode = create<{ focus: boolean; setFocus: (f: boolean) => void }>((set) => ({
  focus: false,
  setFocus: (focus) => set({ focus }),
}));
