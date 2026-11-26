'use client';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Segmented } from '@pinpoint/ui';
import { useCountries, type CountryIndexItem } from '@/lib/countries';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { LAYERS, loadCategories, numScale, numValue, useLoaded, useSeries, usefulYears, type Layer } from '@/lib/layers';
import { SCOPES, inScope } from '@/lib/scopes';
import { openPalette } from '@/components/Palette';
import { CountryPanel } from './CountryPanel';
import { ExploreMap, type ExploreMapHandle } from './ExploreMap';

type Mode = 'flags' | 'data';
const GROUPED = ['People', 'Economy', 'Planet', 'Politics & culture'] as const;
const MEMBER = '#3d7fd1';

const selectCls =
  'clay clay-focus w-full appearance-none rounded-full py-2 pl-3.5 pr-9 text-sm font-extrabold text-[var(--ink)] bg-no-repeat bg-[length:14px] bg-[right_12px_center] cursor-pointer';
const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

export function ExploreScreen() {
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const mapRef = useRef<ExploreMapHandle>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cats = useLoaded(loadCategories);

  /* ---------- state from the URL ---------- */
  const selected = params.get('c')?.toUpperCase() ?? null;
  const mode: Mode = params.get('mode') === 'data' ? 'data' : 'flags';
  const layer: Layer = LAYERS.find((l) => l.id === params.get('layer')) ?? LAYERS[0];
  const scope = SCOPES.find((s) => s.id === params.get('scope')) ?? SCOPES[0];
  const groupId = params.get('group') ?? 'eu';
  const showRanks = params.get('rank') === '1';

  useEffect(() => {
    setMounted(true);
    loadWorldShapes().then(setWorld).catch(() => setFailed(true));
  }, []);

  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);
  const mapped = useMemo(() => (list ?? []).filter((c) => c.un195 || c.hasShape), [list]);

  /* ---------- number layers: series, years, scale ---------- */
  const series = useSeries(mode === 'data' ? layer : null);
  const years = useMemo(() => usefulYears(series), [series]);
  const yearParam = params.get('year');
  const year: number | 'latest' = yearParam && years.includes(+yearParam) ? +yearParam : 'latest';
  const scale = useMemo(() => (layer.kind === 'num' && (series || layer.static) ? numScale(layer, mapped, series) : null), [layer, mapped, series]);

  const valueOf = useCallback(
    (c: CountryIndexItem | undefined) => (layer.kind === 'num' ? numValue(layer, c, series, year) : null),
    [layer, series, year],
  );

  const colorFor = useCallback(
    (code: string) => {
      const c = byCode.get(code);
      if (!c) return null;
      if (layer.kind === 'num') {
        const v = valueOf(c);
        return v && scale ? scale.color(v.v) : null;
      }
      if (layer.kind === 'cat') {
        const k = layer.value(c);
        return layer.categories.find((x) => x.id === k)?.color ?? null;
      }
      return c.groups.includes(groupId) ? MEMBER : null;
    },
    [byCode, layer, valueOf, scale, groupId],
  );

  const describe = useCallback(
    (code: string) => {
      const c = byCode.get(code);
      if (mode !== 'data') return c?.capital?.name ?? null;
      if (!c) return null;
      if (layer.kind === 'num') {
        const v = valueOf(c);
        return v ? `${layer.format(v.v)}${v.year && year === 'latest' ? ` (${v.year})` : ''}` : 'no data';
      }
      if (layer.kind === 'cat') return layer.categories.find((x) => x.id === layer.value(c))?.label ?? 'no data';
      const g = cats?.groups.find((x) => x.id === groupId);
      return c.groups.includes(groupId) ? `${g?.label ?? 'Member'} member` : 'not a member';
    },
    [byCode, mode, layer, valueOf, year, cats, groupId],
  );

  /* ---------- URL helpers ---------- */
  const setQuery = useCallback(
    (patch: Record<string, string | null>) => {
      // read the live URL, not the last render's params, so quick successive changes don't overwrite each other
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) (v == null ? next.delete(k) : next.set(k, v));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
  const select = useCallback((code: string | null) => setQuery({ c: code }), [setQuery]);
  const active = useCallback((code: string) => inScope(byCode.get(code), scope.id), [byCode, scope.id]);

  /* ---------- map movement ---------- */
  useEffect(() => {
    if (world && selected && byCode.has(selected)) mapRef.current?.flyTo(selected, { panelOpen: true });
  }, [world, selected, byCode]);

  useEffect(() => {
    if (!world || !list) return;
    if (selected && !inScope(byCode.get(selected), scope.id)) setQuery({ c: null });
    if (selected && inScope(byCode.get(selected), scope.id)) return;
    if (scope.view) mapRef.current?.fitView(scope.view);
    else mapRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, list, scope.id]);

  /* ---------- play through the years ---------- */
  useEffect(() => {
    if (!playing || !years.length) return;
    const t = setInterval(() => {
      const cur = new URLSearchParams(window.location.search).get('year');
      const i = cur ? years.indexOf(+cur) : -1;
      if (i === -1 || i >= years.length - 1) {
        if (i >= years.length - 1) {
          setPlaying(false);
          setQuery({ year: null });
          return;
        }
        setQuery({ year: String(years[0]) });
      } else setQuery({ year: String(years[i + 1]) });
    }, 550);
    return () => clearInterval(t);
  }, [playing, years, setQuery]);
  useEffect(() => setPlaying(false), [layer.id]);

  /* ---------- rankings ---------- */
  const [rankDir, setRankDir] = useState<'desc' | 'asc'>('desc');
  const ranking = useMemo(() => {
    if (!list || mode !== 'data' || !showRanks) return [];
    const pool = list.filter((c) => c.un195 && inScope(c, scope.id));
    if (layer.kind === 'num') {
      return pool
        .map((c) => ({ c, v: valueOf(c) }))
        .filter((x): x is { c: CountryIndexItem; v: { v: number; year: number | null } } => !!x.v)
        .sort((a, b) => (rankDir === 'desc' ? b.v.v - a.v.v : a.v.v - b.v.v));
    }
    return [];
  }, [list, mode, showRanks, scope.id, layer, valueOf, rankDir]);

  const categoryCounts = useMemo(() => {
    if (!list || layer.kind !== 'cat') return null;
    const pool = list.filter((c) => c.un195 && inScope(c, scope.id));
    return Object.fromEntries(layer.categories.map((k) => [k.id, pool.filter((c) => layer.value(c) === k.id)]));
  }, [list, layer, scope.id]);
  const groupMembers = useMemo(
    () => (list && layer.kind === 'group' ? list.filter((c) => c.groups.includes(groupId) && inScope(c, scope.id)).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [list, layer, groupId, scope.id],
  );
  const group = cats?.groups.find((g) => g.id === groupId);

  if (!mounted) return null;

  const yearIndex = year === 'latest' ? years.length : years.indexOf(year);
  const maxRankValue = ranking.length ? Math.max(...ranking.map((r) => Math.abs(r.v.v))) : 1;

  return createPortal(
    <div className="fixed inset-0 z-0">
      {/* the map */}
      <div className="absolute inset-x-0 bottom-0 top-16">
        {world && list ? (
          <ExploreMap ref={mapRef} world={world} countries={byCode} mode={mode} colorFor={colorFor} describe={describe} selected={selected} onSelect={select} active={active} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
              {failed ? 'The map could not load. Check your connection and refresh.' : 'Unrolling the map…'}
            </p>
          </div>
        )}
      </div>

      {/* controls */}
      <div
        className="clay fixed left-3 top-[72px] z-10 max-h-[calc(100dvh-190px)] w-[min(330px,calc(100vw-24px))] overflow-y-auto overscroll-contain p-3 sm:left-4"
        data-elev="3"
        style={{ borderRadius: 'var(--radius)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <Segmented
            label="Map mode"
            size="sm"
            value={mode}
            onChange={(m) => setQuery({ mode: m === 'data' ? 'data' : null })}
            options={[
              { value: 'flags', label: 'Flags' },
              { value: 'data', label: 'Data' },
            ]}
          />
          <button onClick={openPalette} className="clay clay-interactive clay-focus rounded-full px-3 py-1.5 text-xs font-extrabold text-[var(--ink-2)]" data-elev="1">
            Find a country
          </button>
        </div>

        {/* continent scope */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Show">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={s.id === scope.id}
              onClick={() => setQuery({ scope: s.id === 'world' ? null : s.id })}
              className={`clay-focus rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors ${s.id === scope.id ? 'clay-tint tint-c3' : 'clay clay-interactive text-[var(--ink-2)]'}`}
              data-elev="1"
            >
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {mode === 'data' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {/* layer */}
              <label className="mt-3 block">
                <span className="sr-only">Data layer</span>
                <select className={selectCls} style={chevron} value={layer.id} onChange={(e) => setQuery({ layer: e.target.value === LAYERS[0].id ? null : e.target.value, year: null })} data-elev="1">
                  {GROUPED.map((g) => (
                    <optgroup key={g} label={g}>
                      {LAYERS.filter((l) => l.group === g).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {layer.kind === 'group' && (
                <label className="mt-2 block">
                  <span className="sr-only">Organisation</span>
                  <select className={selectCls} style={chevron} value={groupId} onChange={(e) => setQuery({ group: e.target.value })} data-elev="1">
                    {(cats?.groups ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* year slider */}
              {layer.kind === 'num' && years.length > 1 && (
                <div className="mt-3 flex items-center gap-2.5">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? 'Pause' : 'Play through the years'}
                    className="clay-tint tint-accent clay-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  >
                    {playing ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5c0-1.2 1.3-1.9 2.3-1.3l9.3 5.9c.9.6.9 2 0 2.6l-9.3 5.9c-1 .6-2.3-.1-2.3-1.3z" /></svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={years.length}
                    value={yearIndex}
                    onChange={(e) => {
                      setPlaying(false);
                      const i = +e.target.value;
                      setQuery({ year: i >= years.length ? null : String(years[i]) });
                    }}
                    aria-label="Year"
                    aria-valuetext={year === 'latest' ? 'Latest available' : String(year)}
                    className="h-2 w-full cursor-pointer accent-[var(--accent)]"
                  />
                  <span className="w-14 shrink-0 text-right text-sm font-black tabular-nums">{year === 'latest' ? 'Latest' : year}</span>
                </div>
              )}

              {/* legend */}
              <div className="mt-3">
                {layer.kind === 'num' && scale && (
                  <>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{layer.unit}</p>
                    <div className="mt-1.5 flex overflow-hidden rounded-lg" aria-hidden>
                      {scale.legend.bins.map((b) => (
                        <span key={b.color} className="h-3 flex-1" style={{ background: b.color }} title={b.label} />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums text-[var(--ink-3)]">
                      <span>{scale.legend.bins[0].label}</span>
                      <span>{scale.legend.bins[scale.legend.bins.length - 1].label}</span>
                    </div>
                  </>
                )}
                {layer.kind === 'num' && !scale && <p className="text-xs font-bold text-[var(--ink-3)]">Loading data…</p>}
                {layer.kind === 'cat' && (
                  <ul className="space-y-1">
                    {layer.categories.map((k) => (
                      <li key={k.id} className="flex items-center gap-2 text-xs font-bold">
                        <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: k.color }} />
                        <span className="flex-1">{k.label}</span>
                        <span className="tabular-nums text-[var(--ink-3)]">{categoryCounts?.[k.id]?.length ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {layer.kind === 'group' && group && (
                  <p className="text-xs font-bold text-[var(--ink-2)]">
                    <span className="mr-1.5 inline-block h-3 w-3 rounded-[4px] align-[-2px]" style={{ background: MEMBER }} />
                    {groupMembers.length} {scope.id === 'world' ? 'members' : `members in ${scope.label}`}, as of {group.asOf}.
                    {group.note && <span className="block text-[var(--ink-3)]">{group.note}</span>}
                  </p>
                )}
              </div>

              <a
                href={layer.kind === 'group' && group ? group.url : layer.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="clay-focus mt-2 inline-block rounded text-[10px] font-bold text-[var(--ink-3)] underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]"
                title={layer.source.note}
              >
                Source: {layer.kind === 'group' && group ? `${group.label} official member list` : layer.source.name} ↗
              </a>

              {/* rankings */}
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setQuery({ rank: showRanks ? null : '1' })}
                    aria-expanded={showRanks}
                    className="clay clay-interactive clay-focus rounded-full px-3 py-1.5 text-xs font-extrabold"
                    data-elev="1"
                  >
                    {showRanks ? 'Hide' : 'Show'} {layer.kind === 'num' ? 'rankings' : 'countries'}
                  </button>
                  {showRanks && layer.kind === 'num' && (
                    <button onClick={() => setRankDir((d) => (d === 'desc' ? 'asc' : 'desc'))} className="clay-focus rounded-full px-2 py-1 text-xs font-extrabold text-[var(--ink-3)] hover:text-[var(--ink)]">
                      {rankDir === 'desc' ? 'Highest first ↓' : 'Lowest first ↑'}
                    </button>
                  )}
                </div>

                {showRanks && (
                  <ol className="mt-2 space-y-0.5">
                    {layer.kind === 'num' &&
                      ranking.map(({ c, v }, i) => (
                        <li key={c.code}>
                          <button onClick={() => select(c.code)} className={`clay-focus grid w-full grid-cols-[1.9rem_20px_1fr_auto] items-center gap-2 rounded-xl px-1.5 py-1 text-left text-xs font-bold hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] ${c.code === selected ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]' : ''}`}>
                            <span className="tabular-nums text-[var(--ink-3)]">{i + 1}</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.flagSquare} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                            <span className="min-w-0">
                              <span className="block truncate">{c.name}</span>
                              <span className="mt-0.5 block h-1 rounded-full" style={{ width: `${Math.max(4, (Math.abs(v.v) / maxRankValue) * 100)}%`, background: scale?.color(v.v) ?? 'var(--accent)' }} />
                            </span>
                            <span className="tabular-nums">{layer.format(v.v)}</span>
                          </button>
                        </li>
                      ))}
                    {layer.kind === 'cat' &&
                      layer.categories.map((k) => (
                        <li key={k.id} className="pt-1.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{k.label}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(categoryCounts?.[k.id] ?? []).map((c) => (
                              <button key={c.code} onClick={() => select(c.code)} className="clay-focus rounded-full px-2 py-0.5 text-[11px] font-bold hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    {layer.kind === 'group' && (
                      <li className="flex flex-wrap gap-1 pt-1">
                        {groupMembers.map((c) => (
                          <button key={c.code} onClick={() => select(c.code)} className="clay-focus flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-bold hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.flagSquare} alt="" width={16} height={16} className="h-4 w-4 rounded-full object-cover" />
                            {c.name}
                          </button>
                        ))}
                      </li>
                    )}
                  </ol>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* zoom controls */}
      {/* right edge; steps left of the side panel when it is open, hidden behind the phone sheet */}
      <div className={`fixed bottom-[100px] right-3 z-10 flex-col gap-2 sm:right-4 md:bottom-28 ${selected ? 'hidden md:right-[432px] md:flex' : 'flex'}`}>
        {[
          { label: 'Zoom in', icon: '+', act: () => mapRef.current?.zoomBy(1.8) },
          { label: 'Zoom out', icon: '−', act: () => mapRef.current?.zoomBy(1 / 1.8) },
          { label: 'Reset view', icon: '⤢', act: () => (scope.view ? mapRef.current?.fitView(scope.view) : mapRef.current?.reset()) },
        ].map((b) => (
          <button key={b.label} onClick={b.act} aria-label={b.label} title={b.label} className="clay clay-interactive clay-focus flex h-11 w-11 items-center justify-center rounded-full text-xl font-black text-[var(--ink-2)]" data-elev="2">
            {b.icon}
          </button>
        ))}
      </div>

      <CountryPanel country={selected ? (byCode.get(selected) ?? null) : null} byCode={byCode} onClose={() => select(null)} onSelect={select} />
    </div>,
    document.body,
  );
}
