'use client';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ClayIcon } from '@pinpoint/ui';
import { loadCountries, type CountryIndexItem } from '@/lib/countries';
import { MODES } from '@/lib/modes';

const OPEN_EVENT = 'pinpoint:palette';

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ranked substring search: name prefix > name > code > alias prefix > capital > alias. No loose letter-skipping. */
function rank(value: string, search: string, keywords?: string[]) {
  const q = fold(search.trim());
  if (!q) return 1;
  const name = fold(value);
  const kws = (keywords ?? []).map(fold);
  const [code = '', iso3 = '', capital = '', ...aliases] = kws;
  if (name.startsWith(q)) return 1;
  if (q.length <= 3 && (code === q || iso3 === q)) return 0.95;
  if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) return 0.9;
  if (aliases.some((a) => a.startsWith(q))) return 0.8;
  if (capital && capital.startsWith(q)) return 0.75;
  if (name.includes(q)) return 0.6;
  if (q.length >= 3 && aliases.some((a) => a.includes(q))) return 0.4;
  if (q.length >= 3 && capital.includes(q)) return 0.35;
  return 0;
}
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Spotlight-style search: ⌘K / Ctrl+K or "/" anywhere. */
export function Palette() {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryIndexItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open && countries.length === 0) loadCountries().then(setCountries).catch(() => {});
  }, [open, countries.length]);

  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Our own ranking (cmdk's built-in filter is turned off) so the best match is always first.
  const modeHits = useMemo(
    () => MODES.map((m) => ({ m, s: rank(m.title, query, ['', '', '', m.kind]) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.m),
    [query],
  );
  const countryHits = useMemo(() => {
    const scored = countries.map((c) => ({ c, s: rank(c.name, query, [c.code, c.iso3, c.capital?.name ?? '', ...c.aliases]) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s || Number(b.c.un195) - Number(a.c.un195) || a.c.name.localeCompare(b.c.name));
    return scored.slice(0, 60).map((x) => x.c);
  }, [countries, query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="frost fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="w-full max-w-xl"
          >
            <Command label="Search Pinpoint" className="clay overflow-hidden p-3" data-elev="4" loop shouldFilter={false}>
              <div className="clay-well flex items-center gap-3 px-4">
                <ClayIcon name="search" size={30} />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search countries, capitals, games…"
                  className="h-14 w-full bg-transparent text-lg font-bold text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
                  onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                />
              </div>
              <Command.List className="mt-2 max-h-[52vh] overflow-y-auto overscroll-contain px-1 pb-1">
                <Command.Empty className="px-4 py-8 text-center font-bold text-[var(--ink-3)]">No country or capital found.</Command.Empty>
                {modeHits.length > 0 && <Command.Group heading="Games & places">
                  {modeHits.map((m) => (
                    <Command.Item key={m.id} value={`mode ${m.title}`} onSelect={() => go(m.href)} className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5">
                      <ClayIcon name={m.icon} size={34} />
                      <span className="font-extrabold">{m.title}</span>
                      <span className="ml-auto text-xs font-bold text-[var(--ink-3)]">{m.kind === 'game' ? 'Solo · Party' : m.kind === 'party' ? 'Multiplayer' : 'Explore'}</span>
                    </Command.Item>
                  ))}
                </Command.Group>}
                {countryHits.length > 0 && <Command.Group heading="Countries">
                  {countryHits.map((c) => (
                    <Command.Item
                      key={c.code}
                      value={`country ${c.code}`}
                      onSelect={() => go(`/explore?c=${c.code}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="flex h-[27px] w-10 shrink-0 items-center justify-center">
                        <img src={c.flagTrue} alt="" loading="lazy" className="max-h-[27px] max-w-10 rounded-[5px] shadow-[0_2px_6px_var(--clay-drop-2)]" />
                      </span>
                      <span className="font-extrabold">{c.name}</span>
                      {c.capital && <span className="truncate text-sm font-semibold text-[var(--ink-3)]">{c.capital.name}</span>}
                      <span className="ml-auto text-xs font-bold text-[var(--ink-3)]">{c.region}</span>
                    </Command.Item>
                  ))}
                </Command.Group>}
              </Command.List>
              <div className="flex items-center gap-4 border-t border-[var(--line)] px-3 pt-2.5 text-[11px] font-bold text-[var(--ink-3)]">
                <span>↑↓ to move</span>
                <span>↵ to open</span>
                <span>esc to close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
