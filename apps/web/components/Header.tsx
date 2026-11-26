'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { PALETTES, useTheme } from '@/lib/theme';
import { useEffect, useRef, useState } from 'react';
import { ClayIcon, Segmented } from '@pinpoint/ui';
import { useSettings } from '@/lib/settings';
import { openPalette } from './Palette';

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-[linear-gradient(to_bottom,var(--bg)_55%,transparent)] px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="clay-focus flex items-center gap-2.5 rounded-2xl pr-2" aria-label="Pinpoint home">
          <ClayIcon name="pin" size={40} />
          <span className="text-xl font-black tracking-tight">Pinpoint</span>
        </Link>
        <div className="flex items-center gap-2.5">
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
      className="clay clay-interactive clay-focus flex h-11 items-center gap-2 rounded-full pl-3 pr-3 text-sm font-bold text-[var(--ink-2)] sm:pr-2"
      data-elev="1"
      aria-label="Search countries and capitals"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="clay-well hidden rounded-lg px-2 py-0.5 font-sans text-[11px] font-extrabold text-[var(--ink-3)] sm:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme, palette, setPalette } = useTheme();
  const { dockPosition, setDockPosition, setTourDone } = useSettings();
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
        className="clay-focus flex h-11 w-11 items-center justify-center rounded-full"
        animate={{ rotate: open ? 90 : 0 }}
        whileHover={{ rotate: open ? 90 : 35, scale: 1.06 }}
        whileTap={{ scale: 0.88, y: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <ClayIcon name="settings" bare size={40} />
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
              <Segmented label="Palette" size="sm" value={palette} onChange={setPalette} options={PALETTES.map((p) => ({ value: p.id, label: p.label }))} />
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
