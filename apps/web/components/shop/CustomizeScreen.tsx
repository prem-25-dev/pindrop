'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLook } from '@/lib/look';
import { usePassport } from '@/lib/passport';
import { CATEGORIES, ITEMS, ITEM, type ItemCategory } from '@/lib/shop';
import { useTheme } from '@/lib/theme';
import { useCoins, useWallet } from '@/lib/wallet';
import { Coin } from '../Coin';
import { Avatar } from '../game/Avatar';
import { ItemPreview, MiniCover } from './ItemPreview';
import { useApply, useInUse } from './ShopScreen';

/** you, as others see you: dress up with what you own */
export function CustomizeScreen() {
  const look = useLook();
  const { name, setProfile } = usePassport();
  const owned = useWallet((s) => s.owned);
  const equipped = useWallet((s) => s.equipped);
  const equip = useWallet((s) => s.equip);
  const coins = useCoins();
  const { palette } = useTheme();
  const inUse = useInUse();
  const apply = useApply();
  const [mounted, setMounted] = useState(false);
  const [mood, setMood] = useState<'happy' | 'idle'>('happy');
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Opening your wardrobe…
        </p>
      </div>
    );
  }

  const coverValue = ITEM.get(equipped.cover)?.value ?? 'classic';
  const removable: ItemCategory[] = ['hat', 'glasses', 'title'];

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Customise</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">How you look in rooms, on the leaderboard and on your passport.</p>
        </div>
        <Link href="/shop" className="clay-tint tint-accent clay-focus flex h-11 items-center gap-2 rounded-full pl-3 pr-5 font-black">
          <Coin size={20} />
          {coins.toLocaleString('en')} · Shop
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* preview */}
        <section className="clay flex h-fit flex-col items-center p-6 text-center lg:sticky lg:top-24" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
          <button onClick={() => setMood((m) => (m === 'happy' ? 'idle' : 'happy'))} className="clay-focus rounded-full" aria-label="Your avatar (tap to wave)">
            <motion.div key={`${look.hat}-${look.glasses}-${look.color}`} initial={{ scale: 0.85, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="pt-6">
              <Avatar color={look.color} size={150} mood={mood} hat={look.hat} glasses={look.glasses} label="Your avatar" />
            </motion.div>
          </button>
          <label className="mt-4 w-full">
            <span className="sr-only">Your name</span>
            <input value={name} maxLength={20} onChange={(e) => setProfile({ name: e.target.value })} className="clay-well h-11 w-full rounded-full px-4 text-center text-lg font-black outline-none" />
          </label>
          <p className="mt-2 min-h-5 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{look.title ?? 'No title'}</p>
          <div className="mt-5 flex items-center gap-4">
            <MiniCover cover={coverValue} size={58} />
            <div className="text-left text-sm font-bold text-[var(--ink-2)]">
              <p>
                Cover: <span className="font-black text-[var(--ink)]">{ITEM.get(equipped.cover)?.name}</span>
              </p>
              <p>
                Theme: <span className="font-black text-[var(--ink)]">{ITEMS.find((i) => i.category === 'theme' && i.value === palette)?.name ?? palette}</span>
              </p>
              <Link href="/passport" className="mt-1 inline-block text-xs font-black text-[var(--accent)] hover:underline">
                Open your passport →
              </Link>
            </div>
          </div>
        </section>

        {/* wardrobe */}
        <div className="space-y-4">
          {CATEGORIES.map((c) => {
            const mine = ITEMS.filter((i) => i.category === c.id && owned.includes(i.id));
            const more = ITEMS.filter((i) => i.category === c.id && !owned.includes(i.id)).length;
            return (
              <section key={c.id} className="clay p-4" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <p className="font-black">{c.label}</p>
                  {more > 0 && (
                    <Link href={`/shop?c=${c.id}`} className="text-xs font-black text-[var(--ink-3)] hover:text-[var(--ink)]">
                      {more} more in the shop →
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {removable.includes(c.id) && (
                    <button
                      onClick={() => equip(c.id as 'hat' | 'glasses' | 'title', null)}
                      aria-pressed={!equipped[c.id as 'hat' | 'glasses' | 'title']}
                      className={`clay-focus grid h-24 w-24 place-items-center rounded-2xl text-xs font-black ${!equipped[c.id as 'hat' | 'glasses' | 'title'] ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-3)]'}`}
                      data-elev="1"
                    >
                      None
                    </button>
                  )}
                  {mine.map((item) => {
                    const on = inUse(item);
                    return (
                      <button key={item.id} onClick={() => apply(item)} aria-pressed={on} title={item.name} className={`clay-focus flex w-24 flex-col items-center justify-between gap-1 rounded-2xl p-2 ${on ? 'clay' : 'clay clay-interactive'}`} data-elev={on ? '3' : '1'} style={on ? { boxShadow: '0 0 0 2.5px var(--accent)' } : undefined}>
                        <span className="grid h-14 place-items-center">
                          <ItemPreview item={item} color={look.color} size={item.category === 'title' ? 40 : 50} />
                        </span>
                        <span className="w-full truncate text-[11px] font-black">{item.name}</span>
                      </button>
                    );
                  })}
                  {mine.length === 0 && !removable.includes(c.id) && <p className="text-sm font-bold text-[var(--ink-3)]">Nothing yet.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
