'use client';
import { useEffect, useMemo } from 'react';
import { useCountries } from '@/lib/countries';
import { useHistory } from '@/lib/history';
import { usePassport } from '@/lib/passport';
import { badgesFrom } from '@/lib/progress';
import { BADGE_COINS, useWallet } from '@/lib/wallet';

/** pays out coins the first time each badge is earned (badges are worked out from your games and stamps) */
export function RewardWatcher() {
  const games = useHistory((s) => s.games);
  const stamps = usePassport((s) => s.stamps);
  const list = useCountries();
  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);

  useEffect(() => {
    if (!list) return;
    const earned = badgesFrom(games, Object.values(stamps), (code) => byCode.get(code)?.region).filter((b) => b.progress >= 1);
    const earn = useWallet.getState().earn;
    for (const b of earned) earn(`badge:${b.id}`, BADGE_COINS, `Badge: ${b.name}`);
  }, [games, stamps, list, byCode]);

  return null;
}
