'use client';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Segmented } from '@pinpoint/ui';
import { useCountries } from '@/lib/countries';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { LAYERS, buildScale } from '@/lib/layers';
import { openPalette } from '@/components/Palette';
import { CountryPanel } from './CountryPanel';
import { ExploreMap, type ExploreMapHandle } from './ExploreMap';

type Mode = 'flags' | 'data';

export function ExploreScreen() {
  const list = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<ExploreMapHandle>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const selected = params.get('c')?.toUpperCase() ?? null;
  const mode: Mode = params.get('mode') === 'data' ? 'data' : 'flags';
  const layer = LAYERS.find((l) => l.id === params.get('layer')) ?? LAYERS[0];

  useEffect(() => {
    setMounted(true);
    loadWorldShapes().then(setWorld).catch(() => setFailed(true));
  }, []);

  const byCode = useMemo(() => new Map((list ?? []).map((c) => [c.code, c])), [list]);
  const scale = useMemo(() => (list ? buildScale(layer, list.filter((c) => c.un195 || c.hasShape)) : null), [layer, list]);
  const colorFor = useCallback((code: string) => scale?.color(byCode.get(code)) ?? null, [scale, byCode]);
  const describe = useCallback(
    (code: string) => {
      if (mode !== 'data') return byCode.get(code)?.capital?.name ?? null;
      const c = byCode.get(code);
      const v = c ? layer.value(c) : null;
      return v == null ? 'no data' : `${layer.format(v)} ${layer.unit}`;
    },
    [mode, layer, byCode],
  );

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

  // fly to the selected country whenever it changes (clicks, neighbours, search, shared links)
  useEffect(() => {
    if (world && selected && byCode.has(selected)) mapRef.current?.flyTo(selected, { panelOpen: true });
  }, [world, selected, byCode]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-0">
      {/* the map */}
      <div className="absolute inset-x-0 bottom-0 top-16">
        {world && list ? (
          <ExploreMap ref={mapRef} world={world} countries={byCode} mode={mode} colorFor={colorFor} describe={describe} selected={selected} onSelect={select} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
              {failed ? 'The map could not load. Check your connection and refresh.' : 'Unrolling the map…'}
            </p>
          </div>
        )}
      </div>

      {/* controls: mode + layer + legend */}
      <div className="clay fixed left-3 top-[72px] z-10 w-[min(320px,calc(100vw-24px))] p-3 sm:left-4" data-elev="3" style={{ borderRadius: 'var(--radius)' }}>
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

        <AnimatePresence initial={false}>
          {mode === 'data' && scale && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Data layer">
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    role="radio"
                    aria-checked={l.id === layer.id}
                    onClick={() => setQuery({ layer: l.id === LAYERS[0].id ? null : l.id })}
                    className={`clay-focus rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${l.id === layer.id ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`}
                    data-elev="1"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{layer.unit}</p>
              <div className="mt-1.5 flex overflow-hidden rounded-lg" aria-hidden>
                {scale.legend.map((b) => (
                  <span key={b.color} className="h-3 flex-1" style={{ background: b.color }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums text-[var(--ink-3)]">
                <span>{layer.format(scale.legend[0].from)}</span>
                <span>{layer.format(scale.legend[3].from)}</span>
                <span>{layer.format(scale.legend[scale.legend.length - 1].to)}</span>
              </div>
              <a href={layer.source.url} target="_blank" rel="noopener noreferrer" className="clay-focus mt-2 inline-block rounded text-[10px] font-bold text-[var(--ink-3)] underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]" title={layer.source.note}>
                Source: {layer.source.name} ↗
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* zoom controls */}
      <div className="fixed bottom-[100px] left-3 z-10 flex flex-col gap-2 sm:left-4 md:bottom-28">
        {[
          { label: 'Zoom in', icon: '+', act: () => mapRef.current?.zoomBy(1.8) },
          { label: 'Zoom out', icon: '−', act: () => mapRef.current?.zoomBy(1 / 1.8) },
          { label: 'Reset view', icon: '⤢', act: () => mapRef.current?.reset() },
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
