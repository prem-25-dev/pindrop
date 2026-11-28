'use client';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePassport } from '@/lib/passport';
import { CATEGORIES, ITEMS, RARITY, type ItemCategory, type ShopItem } from '@/lib/shop';
import { play } from '@/lib/sound';
import { useTheme, type PaletteId } from '@/lib/theme';
import { BADGE_COINS, STAMP_COINS, useCoins, useWallet } from '@/lib/wallet';
import { Coin } from '../Coin';
import { Confetti } from '../game/shared';
import { ItemPreview } from './ItemPreview';

/** is this item the one in use right now? */
export function useInUse() {
  const equipped = useWallet((s) => s.equipped);
  const color = usePassport((s) => s.color);
  const { palette } = useTheme();
  return (item: ShopItem) =>
    item.category === 'theme' ? palette === item.value
    : item.category === 'color' ? color === item.value
    : item.category === 'cover' ? equipped.cover === item.id
    : equipped[item.category] === item.id;
}

/** put an owned item on (themes and colours apply straight away) */
export function useApply() {
  const equip = useWallet((s) => s.equip);
  const setProfile = usePassport((s) => s.setProfile);
  const { setPalette } = useTheme();
  return (item: ShopItem) => {
    if (item.category === 'theme') setPalette(item.value as PaletteId);
    else if (item.category === 'color') setProfile({ color: item.value });
    else equip(item.category, item.id);
  };
}

const EARN = [
  ['Finish a game', '5 + 2 per right answer'],
  ['Beat every bot or player', '+15'],
  ['Daily Mix', '5 + 4 per right answer'],
  ['Border Hop', '8 per star'],
  ['Passport stamps', `${STAMP_COINS.tag} / ${STAMP_COINS.postage} / ${STAMP_COINS.entry}`],
  ['Each new badge', `${BADGE_COINS}`],
];

export function ShopScreen() {
  const coins = useCoins();
  const owned = useWallet((s) => s.owned);
  const buy = useWallet((s) => s.buy);
  const color = usePassport((s) => s.color);
  const inUse = useInUse();
  const apply = useApply();
  const [cat, setCat] = useState<ItemCategory>('cover');
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [fire, setFire] = useState(0);

  useEffect(() => {
    setMounted(true);
    const c = new URLSearchParams(location.search).get('c');
    if (c && CATEGORIES.some((x) => x.id === c)) setCat(c as ItemCategory);
  }, []);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(t);
  }, [note]);

  const purchase = (item: ShopItem) => {
    const r = buy(item.id);
    if (!r.ok) {
      setNote({ text: r.error, tone: 'bad' });
      play('wrong');
      return;
    }
    apply(item);
    play('win');
    setFire((f) => f + 1);
    setNote({ text: `${item.name} is yours, and it is on`, tone: 'good' });
  };

  const items = ITEMS.filter((i) => i.category === cat);
  const info = CATEGORIES.find((c) => c.id === cat)!;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Shop</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">Spend the coins you earn by playing. Everything here is cosmetic.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customize" className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
            Customise
          </Link>
          <span className="clay flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 text-lg font-black tabular-nums" data-elev="2" aria-label={`${coins} coins`}>
            <Coin size={26} />
            {mounted ? coins.toLocaleString('en') : '…'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Categories">
            {CATEGORIES.map((c) => (
              <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`clay-focus rounded-full px-4 py-2 text-sm font-extrabold ${cat === c.id ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`} data-elev="1">
                {c.label}
              </button>
            ))}
          </div>
          <p className="mb-3 px-1 text-sm font-bold text-[var(--ink-3)]">{info.blurb}</p>

          <motion.ul layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="tabpanel">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => {
                const have = mounted && owned.includes(item.id);
                const on = mounted && have && inUse(item);
                const short = item.price - coins;
                return (
                  <motion.li key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.02 * i }} className="clay relative flex flex-col items-center p-4 text-center" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
                    <span className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ background: RARITY[item.rarity].color }}>
                      {RARITY[item.rarity].label}
                    </span>
                    <div className="grid h-24 place-items-center pt-3">
                      <ItemPreview item={item} color={color} size={64} />
                    </div>
                    <p className="mt-2 font-black leading-tight">{item.name}</p>
                    {item.blurb && <p className="mt-0.5 text-[11px] font-bold leading-snug text-[var(--ink-3)]">{item.blurb}</p>}
                    <div className="mt-auto w-full pt-3">
                      {on ? (
                        <span className="block rounded-full py-2 text-sm font-black" style={{ background: 'color-mix(in oklab, var(--c4) 16%, transparent)', color: 'var(--c4)' }}>
                          In use ✓
                        </span>
                      ) : have ? (
                        <button onClick={() => apply(item)} className="clay clay-interactive clay-focus w-full rounded-full py-2 text-sm font-black" data-elev="1">
                          Use
                        </button>
                      ) : (
                        <button onClick={() => purchase(item)} disabled={short > 0} className="clay-tint tint-accent clay-focus flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-sm font-black disabled:opacity-50" title={short > 0 ? `${short} more coins needed` : undefined}>
                          <Coin size={16} />
                          {item.price.toLocaleString('en')}
                        </button>
                      )}
                      {!have && short > 0 && mounted && <p className="mt-1 text-[10px] font-bold text-[var(--ink-3)]">{short.toLocaleString('en')} more to go</p>}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        </div>

        <aside className="clay h-fit p-4" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">How to earn coins</p>
          <ul className="mt-2 space-y-2">
            {EARN.map(([what, how]) => (
              <li key={what} className="flex items-start justify-between gap-2 text-sm">
                <span className="font-bold text-[var(--ink-2)]">{what}</span>
                <span className="flex shrink-0 items-center gap-1 font-black">
                  <Coin size={14} />
                  {how}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/play" className="clay-tint tint-accent clay-focus mt-4 flex h-10 items-center justify-center rounded-full text-sm font-black">
            Play to earn
          </Link>
        </aside>
      </div>

      <AnimatePresence>
        {note && (
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="clay fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-black" data-elev="3" role="status" style={{ color: note.tone === 'good' ? 'var(--c4)' : 'var(--bad)' }}>
            {note.text}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed left-1/2 top-1/2">
        <Confetti fire={fire} />
      </div>
    </div>
  );
}
