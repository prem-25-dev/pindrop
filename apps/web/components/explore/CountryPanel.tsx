'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Segmented } from '@pinpoint/ui';
import type { CountryIndexItem } from '@/lib/countries';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

const SOURCES = [
  { name: 'World Bank Open Data', what: 'Population (indicator SP.POP.TOTL)', license: 'CC BY 4.0', url: 'https://data.worldbank.org/' },
  { name: 'mledoze/countries', what: 'Names, capitals, area, languages, currencies, neighbours', license: 'ODbL', url: 'https://github.com/mledoze/countries' },
  { name: 'Natural Earth', what: 'Country borders (1:50m)', license: 'Public domain', url: 'https://www.naturalearthdata.com/' },
  { name: 'flag-icons', what: 'Flags', license: 'MIT', url: 'https://github.com/lipis/flag-icons' },
];

function Row({ label, children, source }: { label: string; children: ReactNode; source?: { label: string; url?: string } }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 border-t border-[var(--line)] py-2.5">
      <dt className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</dt>
      <dd className="min-w-0 text-sm font-extrabold">
        {children}
        {source &&
          (source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="clay-focus ml-1.5 rounded text-[10px] font-bold text-[var(--ink-3)] underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]">
              {source.label} ↗
            </a>
          ) : (
            <span className="ml-1.5 text-[10px] font-bold text-[var(--ink-3)]">{source.label}</span>
          ))}
      </dd>
    </div>
  );
}

export function CountryPanel({
  country, byCode, onClose, onSelect,
}: {
  country: CountryIndexItem | null;
  byCode: Map<string, CountryIndexItem>;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'sources'>('overview');
  useEffect(() => setTab('overview'), [country?.code]);

  useEffect(() => {
    if (!country) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [country, onClose]);

  const c = country;
  const density = c?.population && c.area ? c.population.v / c.area.v : null;

  return (
    <AnimatePresence>
      {c && (
        <motion.aside
          key="panel"
          aria-label={`${c.name} details`}
          initial={{ opacity: 0, x: 40, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="clay fixed inset-x-3 bottom-[100px] z-20 flex max-h-[48vh] flex-col overflow-hidden md:inset-x-auto md:bottom-28 md:right-4 md:top-20 md:max-h-none md:w-[400px]"
          data-elev="4"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <div className="overflow-y-auto overscroll-contain p-5">
            {/* header */}
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.flag}
                alt={`Flag of ${c.name}`}
                width={96}
                height={72}
                className="h-[72px] w-24 shrink-0 rounded-xl"
                style={{ boxShadow: '0 12px 22px -12px var(--clay-drop), 0 2px 6px var(--clay-drop-2)' }}
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black leading-tight tracking-tight">{c.name}</h2>
                <p className="mt-0.5 text-xs font-bold text-[var(--ink-3)]">{c.official}</p>
                <p className="mt-1.5 text-xs font-extrabold text-[var(--accent)]">{c.subregion || c.region}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="clay clay-interactive clay-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black text-[var(--ink-2)]" data-elev="1">
                ×
              </button>
            </div>

            <div className="mt-4">
              <Segmented
                label="Panel section"
                size="sm"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'sources', label: 'Sources' },
                ]}
              />
            </div>

            {tab === 'overview' ? (
              <>
                <dl className="mt-3">
                  <Row label="Capital">{c.capital?.name ?? '—'}</Row>
                  <Row label="Population" source={c.population ? { label: `World Bank ${c.population.year}`, url: c.population.url } : undefined}>
                    {c.population ? compact.format(c.population.v) : 'No data'}
                  </Row>
                  <Row label="Area" source={c.area ? { label: 'mledoze', url: 'https://github.com/mledoze/countries' } : undefined}>
                    {c.area ? `${whole.format(c.area.v)} km²` : '—'}
                  </Row>
                  <Row label="Density" source={density ? { label: 'computed' } : undefined}>
                    {density ? `${density < 10 ? density.toFixed(1) : whole.format(density)} / km²` : '—'}
                  </Row>
                  <Row label="Languages">{c.languages.join(', ') || '—'}</Row>
                  <Row label="Currency">{c.currency ? `${c.currency.name}${c.currency.symbol ? ` (${c.currency.symbol})` : ''}` : '—'}</Row>
                  <Row label="Coast">{c.landlocked ? 'Landlocked' : 'Has a coastline'}</Row>
                </dl>

                {c.borders.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Neighbours</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.borders.map((b) => {
                        const n = byCode.get(b);
                        if (!n) return null;
                        return (
                          <button key={b} onClick={() => onSelect(b)} className="clay clay-interactive clay-focus flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-extrabold" data-elev="1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={n.flagSquare} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                            {n.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <a href={c.links.wikipedia} target="_blank" rel="noopener noreferrer" className="clay-tint tint-accent clay-focus rounded-full px-4 py-2 text-sm font-extrabold">
                    More on Wikipedia ↗
                  </a>
                  {c.links.worldbank && (
                    <a href={c.links.worldbank} target="_blank" rel="noopener noreferrer" className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold" data-elev="1">
                      World Bank data ↗
                    </a>
                  )}
                </div>
              </>
            ) : (
              <ul className="mt-3">
                {SOURCES.map((s) => (
                  <li key={s.name} className="border-t border-[var(--line)] py-2.5">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="clay-focus rounded text-sm font-extrabold hover:text-[var(--accent)]">
                      {s.name} ↗
                    </a>
                    <p className="text-xs font-semibold text-[var(--ink-2)]">{s.what}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)]">{s.license}</p>
                  </li>
                ))}
                <li className="border-t border-[var(--line)] py-2.5 text-xs font-semibold text-[var(--ink-3)]">
                  Density is computed from population and area. Official government sites arrive with the Wikidata data update.
                </li>
              </ul>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
