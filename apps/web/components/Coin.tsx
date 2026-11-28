'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useCoins, useWallet } from '@/lib/wallet';

/** a clay coin with a pin pressed into it */
export function Coin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0" style={{ filter: 'drop-shadow(0 1px 1px rgba(120,80,0,.35))' }}>
      <defs>
        <radialGradient id="coin-g" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset=".45" stopColor="#f5c443" />
          <stop offset="1" stopColor="#c98f12" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coin-g)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#b07a08" strokeOpacity=".5" strokeWidth="1.2" />
      <path d="M12 6.2c-2.3 0-4 1.7-4 3.9 0 2.9 4 7.3 4 7.3s4-4.4 4-7.3c0-2.2-1.7-3.9-4-3.9Z" fill="#b07a08" opacity=".75" />
      <circle cx="12" cy="10" r="1.4" fill="#fff2b8" />
    </svg>
  );
}

/** your balance in the top bar, and a "+N coins" pop whenever you earn */
export function CoinChip() {
  const coins = useCoins();
  const last = useWallet((s) => s.last);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ amount: number; reason: string; at: number } | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!last || Date.now() - last.at > 4000) return;
    setToast(last);
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [last]);

  return (
    <div className="relative">
      <Link href="/shop" className="clay-focus flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-black sm:px-3 tabular-nums transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]" aria-label={`${mounted ? coins : ''} coins. Open the shop`}>
        <Coin size={20} />
        {mounted ? coins.toLocaleString('en') : '…'}
      </Link>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.at}
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="clay pointer-events-none absolute right-0 top-12 z-50 flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3.5 text-sm font-black"
            data-elev="3"
            role="status"
          >
            <Coin size={18} />
            <span style={{ color: 'var(--c4)' }}>+{toast.amount}</span>
            <span className="font-bold text-[var(--ink-2)]">{toast.reason}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
