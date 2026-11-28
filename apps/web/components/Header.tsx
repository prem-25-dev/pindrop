'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { PALETTES, useTheme } from '@/lib/theme';
import { useEffect, useRef, useState } from 'react';
import { ClayIcon, Segmented } from '@pinpoint/ui';
import { useSettings } from '@/lib/settings';
import { openPalette } from './Palette';
import { CoinChip } from './Coin';
import { useWallet } from '@/lib/wallet';

const NAV = [
  { href: '/explore', label: 'Explore' },
  { href: '/play', label: 'Games' },
  { href: '/party', label: 'Party' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/shop', label: 'Shop' },
];

/** a floating clay bar: logo on the left, the main sections in the middle, search and settings on the right */
export function Header() {
  const path = usePathname();
  const active = NAV.find((n) => path.startsWith(n.href))?.href;
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-[max(10px,env(safe-area-inset-top))] sm:px-6">
      <div className="clay pointer-events-auto mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-3 rounded-full pl-2.5 pr-2" data-elev="2">
        <Link href="/" className="clay-focus flex shrink-0 items-center gap-2.5 rounded-full pr-2" aria-label="Pinpoint home">
          <ClayIcon name="pin" size={38} />
          <span className="text-lg font-black tracking-tight">Pinpoint</span>
        </Link>

        {/* the main sections sit on the bar itself; only the current one is raised */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const on = active === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined} className="clay-focus relative rounded-full px-4 py-2 text-sm font-extrabold">
                {on && <motion.span layoutId="nav-on" className="clay absolute inset-0 rounded-full" data-elev="2" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                <span className={`relative ${on ? 'text-[var(--ink)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'}`}>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <CoinChip />
          <SearchButton />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}

function SearchButton() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <button
      onClick={openPalette}
      className="clay-focus flex h-10 items-center gap-2 rounded-full pl-3.5 pr-3.5 text-sm font-bold text-[var(--ink-2)] transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-[var(--ink)] sm:w-40 sm:pr-3"
      aria-label="Search countries and capitals"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="ml-auto hidden font-sans text-[10px] font-bold tracking-wide text-[var(--ink-3)] opacity-60 sm:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme, palette, setPalette } = useTheme();
  const owned = useWallet((s) => s.owned);
  const { dockPosition, setDockPosition, setTourDone, sound, setSound } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* a free-standing clay gear: no box, it is the button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Settings"
        className="clay-focus flex h-10 w-10 items-center justify-center rounded-full"
        animate={{ rotate: open ? 90 : 0 }}
        whileHover={{ rotate: open ? 90 : 35, scale: 1.06 }}
        whileTap={{ scale: 0.88, y: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <ClayIcon name="settings" variant="bare" size={36} />
      </motion.button>
      <AnimatePresence>
        {open && mounted && (
          <motion.div
            role="dialog"
            aria-label="Settings"
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{ transformOrigin: 'top right' }}
            className="clay absolute right-0 top-14 w-[300px] space-y-4 p-5"
            data-elev="4"
          >
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Theme</p>
              <Segmented
                label="Theme"
                size="sm"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Palette</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Palette">
                {PALETTES.filter((p) => owned.includes(`theme-${p.id}`)).map((p) => (
                  <button key={p.id} role="radio" aria-checked={palette === p.id} onClick={() => setPalette(p.id)} className={`clay-focus rounded-full px-3 py-1 text-xs font-extrabold ${palette === p.id ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`} data-elev="1">
                    {p.label}
                  </button>
                ))}
                <Link href="/shop?c=theme" onClick={() => setOpen(false)} className="clay-focus rounded-full px-2 py-1 text-xs font-extrabold text-[var(--ink-3)] hover:text-[var(--ink)]">
                  More in the shop →
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Sound</p>
              <Segmented
                label="Game sounds"
                size="sm"
                value={sound ? 'on' : 'off'}
                onChange={(v) => setSound(v === 'on')}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
            <div className="hidden space-y-2 md:block">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Dock</p>
              <Segmented
                label="Dock position"
                size="sm"
                value={dockPosition}
                onChange={setDockPosition}
                options={[
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'left', label: 'Left' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 border-t border-[var(--line)] pt-3 text-sm font-bold">
              <button className="clay-focus rounded-xl px-2 py-1.5 text-left text-[var(--ink-2)] hover:text-[var(--ink)]" onClick={() => { setTourDone(false); setOpen(false); }}>
                Replay the tour
              </button>
              <Link href="/styleguide" onClick={() => setOpen(false)} className="clay-focus rounded-xl px-2 py-1.5 text-[var(--ink-2)] hover:text-[var(--ink)]">
                Design system
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
