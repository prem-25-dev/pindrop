'use client';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CountryIndexItem } from '@/lib/countries';
import type { WorldShapes } from '@/lib/geo';

export interface ExploreMapHandle {
  flyTo: (code: string, opts?: { panelOpen?: boolean }) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
}

interface Props {
  world: WorldShapes;
  countries: Map<string, CountryIndexItem>;
  mode: 'flags' | 'data';
  /** fill colour per country in data mode (null = no data) */
  colorFor: (code: string) => string | null;
  /** extra line in the hover tooltip (data mode value) */
  describe?: (code: string) => string | null;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

/** countries smaller than this (user units², largest landmass) also get a round flag pin */
const TINY = 1.2;
const MAX_K = 40;

/* ---------- base layer: rendered once per mode/colours, not on hover ---------- */
const BaseLayer = memo(function BaseLayer({
  world, countries, mode, colorFor, onEnter, onSelect,
}: {
  world: WorldShapes;
  countries: Map<string, CountryIndexItem>;
  mode: 'flags' | 'data';
  colorFor: (code: string) => string | null;
  onEnter: (code: string | null, e?: React.PointerEvent) => void;
  onSelect: (code: string) => void;
}) {
  return (
    <>
      {world.disputed.map((d, i) => (
        <path key={`dp${i}`} d={d} fill="var(--map-empty)" stroke="var(--map-line)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      ))}
      {world.shapes.map((s) => {
        const c = countries.get(s.code);
        const fill = mode === 'flags' ? (c ? `url(#pf-${s.code})` : 'var(--map-empty)') : (colorFor(s.code) ?? 'var(--map-empty)');
        return (
          <path
            key={s.code}
            d={s.d}
            fill={fill}
            stroke="var(--map-line)"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer"
            onPointerEnter={(e) => onEnter(s.code, e)}
            onPointerLeave={() => onEnter(null)}
            onClick={() => onSelect(s.code)}
          />
        );
      })}
    </>
  );
});

/* ---------- pins for tiny countries (constant size on screen) ---------- */
const Pins = memo(function Pins({
  pins, mode, colorFor, onEnter, onSelect,
}: {
  pins: { code: string; x: number; y: number }[];
  mode: 'flags' | 'data';
  colorFor: (code: string) => string | null;
  onEnter: (code: string | null, e?: React.PointerEvent) => void;
  onSelect: (code: string) => void;
}) {
  return (
    <>
      {pins.map((p) => (
        <circle
          key={p.code}
          cx={p.x}
          cy={p.y}
          style={{ r: 'calc(7px / var(--k, 1))' } as CSSProperties}
          fill={mode === 'flags' ? `url(#pp-${p.code})` : (colorFor(p.code) ?? 'var(--map-empty)')}
          stroke="var(--surface)"
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
          className="cursor-pointer"
          filter="url(#pin-shadow)"
          onPointerEnter={(e) => onEnter(p.code, e)}
          onPointerLeave={() => onEnter(null)}
          onClick={() => onSelect(p.code)}
        />
      ))}
    </>
  );
});

export const ExploreMap = forwardRef<ExploreMapHandle, Props>(function ExploreMap({ world, countries, mode, colorFor, describe, selected, onSelect }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const { w, h } = world;

  const shapeBy = useMemo(() => new Map(world.shapes.map((s) => [s.code, s])), [world]);

  // pins: tiny countries with a shape, plus UN countries the 1:50m data has no shape for (e.g. Tuvalu)
  const pins = useMemo(() => {
    const out: { code: string; x: number; y: number }[] = [];
    for (const s of world.shapes) if (s.area < TINY && countries.has(s.code)) out.push({ code: s.code, x: s.centroid[0], y: s.centroid[1] });
    for (const c of countries.values()) {
      if (c.hasShape || !c.un195 || !c.latlng) continue;
      const p = world.projection([c.latlng[1], c.latlng[0]]);
      if (p) out.push({ code: c.code, x: p[0], y: p[1] });
    }
    return out;
  }, [world, countries]);

  // zoom + pan
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_K])
      .translateExtent([[-w * 0.1, -h * 0.15], [w * 1.1, h * 1.15]])
      .on('zoom', (e) => {
        g.setAttribute('transform', e.transform.toString());
        svg.style.setProperty('--k', String(e.transform.k));
      });
    select(svg).call(z);
    zoomRef.current = z;
    return () => {
      select(svg).on('.zoom', null);
    };
  }, [w, h]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(code, opts) {
        const svg = svgRef.current;
        const z = zoomRef.current;
        const s = shapeBy.get(code);
        if (!svg || !z) return;
        let [[x0, y0], [x1, y1]] = s ? s.box : [[0, 0], [0, 0]];
        if (!s || s.area < TINY) {
          const pin = pins.find((p) => p.code === code);
          if (!pin) return;
          [x0, y0, x1, y1] = [pin.x - 6, pin.y - 4, pin.x + 6, pin.y + 4];
        }
        const rect = svg.getBoundingClientRect();
        // leave room for the panel: a side panel on wide screens, a bottom sheet on phones
        const wide = rect.width >= 768;
        const panelW = opts?.panelOpen && wide ? Math.min(420, rect.width * 0.4) : 0;
        const panelH = opts?.panelOpen && !wide ? rect.height * 0.5 : 0;
        const usableW = Math.max(200, rect.width - panelW);
        const usableH = Math.max(160, rect.height - panelH);
        const scaleToScreen = Math.min(rect.width / w, rect.height / h);
        // cap the fly-in so small countries keep their neighbours in view
        const k = Math.max(1, Math.min(14, 0.7 / Math.max(((x1 - x0) * scaleToScreen) / usableW, ((y1 - y0) * scaleToScreen) / usableH)));
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        // centre the country in the space the panel leaves free (screen px → user units)
        const shiftX = panelW / 2 / scaleToScreen;
        const shiftY = panelH / 2 / scaleToScreen;
        const t = zoomIdentity.translate(w / 2 - shiftX, h / 2 - shiftY).scale(k).translate(-cx, -cy);
        select(svg).transition().duration(900).call(z.transform, t);
      },
      zoomBy(f) {
        const svg = svgRef.current;
        const z = zoomRef.current;
        if (svg && z) select(svg).transition().duration(350).call(z.scaleBy, f);
      },
      reset() {
        const svg = svgRef.current;
        const z = zoomRef.current;
        if (svg && z) select(svg).transition().duration(700).call(z.transform, zoomIdentity);
      },
    }),
    [shapeBy, countries, pins, w, h],
  );

  const onEnter = useCallback((code: string | null, e?: React.PointerEvent) => {
    if (!code || !e || e.pointerType === 'touch') return setHover(null);
    setHover({ code, x: e.clientX, y: e.clientY });
  }, []);
  const onPick = useCallback((code: string) => onSelect(code), [onSelect]);

  const hovered = hover ? shapeBy.get(hover.code) : null;
  const sel = selected ? shapeBy.get(selected) : null;
  const hoverCountry = hover ? countries.get(hover.code) : null;

  return (
    <div
      className="relative h-full w-full"
      onPointerMove={(e) => hover && e.pointerType !== 'touch' && setHover((h0) => (h0 ? { ...h0, x: e.clientX, y: e.clientY } : h0))}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none outline-none"
        role="img"
        aria-label="World map. Use search to find a country by keyboard."
        onClick={(e) => e.target === e.currentTarget && onSelect(null)}
      >
        <defs>
          {mode === 'flags' &&
            world.shapes.map((s) => {
              const c = countries.get(s.code);
              if (!c) return null;
              const [[x0, y0], [x1, y1]] = s.box;
              return (
                <pattern key={s.code} id={`pf-${s.code}`} patternUnits="userSpaceOnUse" x={x0} y={y0} width={Math.max(x1 - x0, 0.5)} height={Math.max(y1 - y0, 0.5)}>
                  <image href={c.flag} width={Math.max(x1 - x0, 0.5)} height={Math.max(y1 - y0, 0.5)} preserveAspectRatio="xMidYMid slice" />
                </pattern>
              );
            })}
          {mode === 'flags' &&
            pins.map((p) => {
              const c = countries.get(p.code);
              return c ? (
                <pattern key={p.code} id={`pp-${p.code}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                  <image href={c.flagSquare} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              ) : null;
            })}
          <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        <g ref={gRef}>
          <BaseLayer world={world} countries={countries} mode={mode} colorFor={colorFor} onEnter={onEnter} onSelect={onPick} />

          {/* selected: outlined and lifted */}
          {sel && (
            <path
              d={sel.d}
              fill={mode === 'flags' ? `url(#pf-${sel.code})` : (colorFor(sel.code) ?? 'var(--map-empty)')}
              stroke="var(--surface)"
              strokeWidth={2.4}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
              style={{ filter: 'drop-shadow(0 calc(3px / var(--k, 1)) calc(4px / var(--k, 1)) rgba(0,0,0,.4))' }}
            />
          )}

          {/* hover: the country lifts with a shadow */}
          {hovered && hovered.code !== selected && hovered.area >= TINY && (
            <path
              d={hovered.d}
              fill={mode === 'flags' ? `url(#pf-${hovered.code})` : (colorFor(hovered.code) ?? 'var(--map-empty)')}
              stroke="var(--surface)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
              style={{
                transform: 'translateY(calc(-1.5px / var(--k, 1)))',
                filter: 'drop-shadow(0 calc(2.5px / var(--k, 1)) calc(3px / var(--k, 1)) rgba(0,0,0,.35))',
              }}
            />
          )}

          <Pins pins={pins} mode={mode} colorFor={colorFor} onEnter={onEnter} onSelect={onPick} />
        </g>
      </svg>

      {/* tooltip */}
      {hover && hoverCountry && (
        <div
          className="clay pointer-events-none fixed z-30 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-extrabold"
          data-elev="2"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hoverCountry.flagSquare} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" />
          {hoverCountry.name}
          {describe?.(hover.code) && <span className="font-bold text-[var(--ink-3)]">{describe(hover.code)}</span>}
        </div>
      )}
    </div>
  );
});
