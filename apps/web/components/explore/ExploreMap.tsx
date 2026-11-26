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

/**
 * Fit a 4:3 flag to a country's main landmass so the whole flag spans the country.
 * The flag is stretched to the country's box, but never distorted more than MAX_STRETCH×;
 * past that (Chile, Norway, Russia…) the extra is trimmed evenly from both sides, keeping the
 * flag centred. Returns the pattern tile (= country box) and the image rect inside it.
 */
const FLAG = 4 / 3;
const MAX_STRETCH = 2.2;
function flagFit([[x0, y0], [x1, y1]]: [[number, number], [number, number]]) {
  const bw = Math.max(x1 - x0, 0.5);
  const bh = Math.max(y1 - y0, 0.5);
  const aspect = bw / bh;
  let iw = bw;
  let ih = bh;
  if (aspect / FLAG > MAX_STRETCH) ih = bw / (FLAG * MAX_STRETCH); // very wide: keep width, trim top/bottom
  else if (FLAG / aspect > MAX_STRETCH) iw = (bh * FLAG) / MAX_STRETCH; // very tall: keep height, trim sides
  return { px: x0, py: y0, pw: bw, ph: bh, ix: (bw - iw) / 2, iy: (bh - ih) / 2, iw, ih };
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
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const gesturing = useRef(false);
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

  /** how the SVG (viewBox, "meet") sits inside the container: screen px = o + s × user units */
  const fit = useCallback(() => {
    const el = boxRef.current!;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const s = Math.min(cw / w, ch / h);
    return { cw, ch, s, ox: (cw - s * w) / 2, oy: (ch - s * h) / 2 };
  }, [w, h]);

  // zoom + pan. Smoothness: during a gesture we only move an already-painted layer with a CSS transform
  // (GPU, no repaint of 240 flag-filled shapes). When the gesture ends we commit the transform to the SVG
  // once, so the map is redrawn crisp a single time.
  useEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    const svg = svgRef.current;
    const g = gRef.current;
    if (!box || !stage || !svg || !g) return;
    let committed = zoomIdentity;

    const commit = (t: typeof zoomIdentity) => {
      const { s, ox, oy } = fit();
      // container-pixel transform → user-unit transform for the <g>
      g.setAttribute('transform', `translate(${(t.x + t.k * ox - ox) / s},${(t.y + t.k * oy - oy) / s}) scale(${t.k})`);
      svg.style.setProperty('--k', String(t.k));
      stage.style.transform = '';
      committed = t;
    };

    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, MAX_K])
      .on('start', () => {
        gesturing.current = true;
        setHover(null);
      })
      .on('zoom', (e) => {
        const t = e.transform;
        const a = t.k / committed.k;
        stage.style.transform = `translate(${t.x - a * committed.x}px, ${t.y - a * committed.y}px) scale(${a})`;
      })
      .on('end', (e) => {
        gesturing.current = false;
        commit(e.transform);
      });

    const setBounds = () => {
      const { cw, ch } = fit();
      z.translateExtent([[-cw * 0.15, -ch * 0.25], [cw * 1.15, ch * 1.25]]);
    };
    setBounds();
    select(box).call(z);
    zoomRef.current = z;
    window.addEventListener('resize', setBounds);
    return () => {
      window.removeEventListener('resize', setBounds);
      select(box).on('.zoom', null);
    };
  }, [fit]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(code, opts) {
        const box = boxRef.current;
        const z = zoomRef.current;
        const s = shapeBy.get(code);
        if (!box || !z) return;
        let [[x0, y0], [x1, y1]] = s ? s.box : [[0, 0], [0, 0]];
        if (!s || s.area < TINY) {
          const pin = pins.find((p) => p.code === code);
          if (!pin) return;
          [x0, y0, x1, y1] = [pin.x - 6, pin.y - 4, pin.x + 6, pin.y + 4];
        }
        const { cw, ch, s: px, ox, oy } = fit();
        // leave room for the panel: a side panel on wide screens, a bottom sheet on phones
        const wide = cw >= 768;
        const panelW = opts?.panelOpen && wide ? Math.min(420, cw * 0.4) : 0;
        const panelH = opts?.panelOpen && !wide ? ch * 0.5 : 0;
        const usableW = Math.max(200, cw - panelW);
        const usableH = Math.max(160, ch - panelH);
        // cap the fly-in so small countries keep their neighbours in view
        const k = Math.max(1, Math.min(14, 0.7 / Math.max(((x1 - x0) * px) / usableW, ((y1 - y0) * px) / usableH)));
        // country centre in container pixels, placed in the middle of the space the panel leaves free
        const cx = ox + px * ((x0 + x1) / 2);
        const cy = oy + px * ((y0 + y1) / 2);
        const t = zoomIdentity.translate((cw - panelW) / 2, (ch - panelH) / 2).scale(k).translate(-cx, -cy);
        select(box).transition().duration(900).call(z.transform, t);
      },
      zoomBy(f) {
        const box = boxRef.current;
        const z = zoomRef.current;
        if (box && z) select(box).transition().duration(350).call(z.scaleBy, f);
      },
      reset() {
        const box = boxRef.current;
        const z = zoomRef.current;
        if (box && z) select(box).transition().duration(700).call(z.transform, zoomIdentity);
      },
    }),
    [shapeBy, pins, fit],
  );

  const onEnter = useCallback((code: string | null, e?: React.PointerEvent) => {
    if (gesturing.current) return;
    if (!code || !e || e.pointerType === 'touch') return setHover(null);
    setHover({ code, x: e.clientX, y: e.clientY });
  }, []);
  const onPick = useCallback((code: string) => onSelect(code), [onSelect]);

  const hovered = hover ? shapeBy.get(hover.code) : null;
  const sel = selected ? shapeBy.get(selected) : null;
  const hoverCountry = hover ? countries.get(hover.code) : null;

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full touch-none overflow-hidden"
      onPointerMove={(e) => hover && !gesturing.current && e.pointerType !== 'touch' && setHover((h0) => (h0 ? { ...h0, x: e.clientX, y: e.clientY } : h0))}
    >
      <div ref={stageRef} className="h-full w-full" style={{ transformOrigin: '0 0', willChange: 'transform' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none outline-none"
        role="img"
        aria-label="World map. Use search to find a country by keyboard."
        onClick={(e) => e.target === e.currentTarget && onSelect(null)}
      >
        <defs>
          {mode === 'flags' &&
            world.shapes.map((s) => {
              const c = countries.get(s.code);
              if (!c) return null;
              const f = flagFit(s.box);
              return (
                <pattern key={s.code} id={`pf-${s.code}`} patternUnits="userSpaceOnUse" x={f.px} y={f.py} width={f.pw} height={f.ph}>
                  <image href={c.flag} x={f.ix} y={f.iy} width={f.iw} height={f.ih} preserveAspectRatio="none" />
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
      </div>

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
