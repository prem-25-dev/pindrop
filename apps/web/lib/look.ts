'use client';
import { useMemo } from 'react';
import { AVATAR_COLORS, usePassport } from './passport';
import { ITEM, ITEMS } from './shop';
import { useWallet } from './wallet';

/** how you look in rooms and on your passport: colour, hat, glasses and title */
export interface Look {
  color: string;
  hat: string | null;
  glasses: string | null;
  title: string | null;
}

const valueOf = (id: string | null) => (id ? (ITEM.get(id)?.value ?? null) : null);

export function useLook(): Look {
  const color = usePassport((s) => s.color);
  const equipped = useWallet((s) => s.equipped);
  return useMemo(() => ({ color, hat: valueOf(equipped.hat), glasses: valueOf(equipped.glasses), title: valueOf(equipped.title) }), [color, equipped]);
}

/** the same, outside React */
export function currentLook(): Look {
  const { equipped } = useWallet.getState();
  return { color: usePassport.getState().color, hat: valueOf(equipped.hat), glasses: valueOf(equipped.glasses), title: valueOf(equipped.title) };
}

/** the starter colours plus any you bought */
export function useAvatarColors() {
  const owned = useWallet((s) => s.owned);
  return useMemo(() => [...AVATAR_COLORS, ...ITEMS.filter((i) => i.category === 'color' && owned.includes(i.id)).map((i) => i.value)], [owned]);
}
