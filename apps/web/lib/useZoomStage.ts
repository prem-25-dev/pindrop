'use client';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3-zoom';
import { useCallback, useEffect, useRef } from 'react';
import type { GeoProjection } from 'd3-geo';

/**
 * Smooth zoom/pan for an SVG map drawn in a fixed user space (w × h, viewBox "meet").
 * During a gesture only an already-painted layer moves (GPU transform); the SVG is redrawn once
 * when the gesture ends. Gives helpers to fit a lon/lat box and to turn a click into user units.
 *
 * Markup:  <div ref={boxRef}> <div ref={stageRef}> <svg ref={svgRef}> <g ref={gRef}>…
 */
export function useZoomStage(w: number, h: number, opts?: { maxK?: number; onGesture?: (active: boolean) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const maxK = opts?.maxK ?? 24;
  const onGesture = useRef(opts?.onGesture);
  onGesture.current = opts?.onGesture;

  const fit = useCallback(() => {
    const el = boxRef.current!;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const s = Math.min(cw / w, ch / h);
    return { cw, ch, s, ox: (cw - s * w) / 2, oy: (ch - s * h) / 2 };
  }, [w, h]);

  useEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    const svg = svgRef.current;
    const g = gRef.current;
    if (!box || !stage || !svg || !g) return;
    let committed = zoomIdentity;
    const commit = (t: typeof zoomIdentity) => {
      // a transition can end after the map unmounted (round changed mid-zoom)
      if (!boxRef.current) return;
      const { s, ox, oy } = fit();
      g.setAttribute('transform', `translate(${(t.x + t.k * ox - ox) / s},${(t.y + t.k * oy - oy) / s}) scale(${t.k})`);
      svg.style.setProperty('--k', String(t.k));
      stage.style.transform = '';
      committed = t;
    };
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, maxK])
      .on('start', () => onGesture.current?.(true))
      .on('zoom', (e) => {
        const t = e.transform;
        const a = t.k / committed.k;
        stage.style.transform = `translate(${t.x - a * committed.x}px, ${t.y - a * committed.y}px) scale(${a})`;
      })
      .on('end', (e) => {
        onGesture.current?.(false);
        commit(e.transform);
      });
    const bounds = () => {
      const { cw, ch } = fit();
      z.translateExtent([[-cw * 0.15, -ch * 0.25], [cw * 1.15, ch * 1.25]]);
    };
    bounds();
    select(box).call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    window.addEventListener('resize', bounds);
    return () => {
      window.removeEventListener('resize', bounds);
      select(box).interrupt().on('.zoom', null);
    };
  }, [fit, maxK]);

  /** fit a box given in user units */
  const fitBox = useCallback(
    ([[x0, y0], [x1, y1]]: [[number, number], [number, number]], o?: { duration?: number; padding?: number; maxK?: number }) => {
      const box = boxRef.current;
      const z = zoomRef.current;
      if (!box || !z) return;
      const { cw, ch, s, ox, oy } = fit();
      const pad = o?.padding ?? 0.86;
      const k = Math.max(1, Math.min(o?.maxK ?? maxK, pad / Math.max(((x1 - x0) * s) / cw, ((y1 - y0) * s) / ch)));
      const cx = ox + s * ((x0 + x1) / 2);
      const cy = oy + s * ((y0 + y1) / 2);
      const t = zoomIdentity.translate(cw / 2, ch / 2).scale(k).translate(-cx, -cy);
      select(box).transition().duration(o?.duration ?? 800).call(z.transform, t);
    },
    [fit, maxK],
  );

  /** fit a lon/lat box [[west, south], [east, north]] (samples its edges: the projection bends latitudes) */
  const fitView = useCallback(
    (projection: GeoProjection, [[west, south], [east, north]]: [[number, number], [number, number]], o?: { duration?: number }) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        const lon = west + ((east - west) * i) / 8;
        const lat = south + ((north - south) * i) / 8;
        pts.push([lon, south], [lon, north], [west, lat], [east, lat]);
      }
      const xy = pts.map((p) => projection(p)).filter((p): p is [number, number] => !!p);
      const xs = xy.map((p) => p[0]);
      const ys = xy.map((p) => p[1]);
      fitBox([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { duration: o?.duration, padding: 0.94 });
    },
    [fitBox],
  );

  const reset = useCallback((duration = 700) => {
    const box = boxRef.current;
    const z = zoomRef.current;
    if (box && z) select(box).transition().duration(duration).call(z.transform, zoomIdentity);
  }, []);

  const zoomBy = useCallback((f: number) => {
    const box = boxRef.current;
    const z = zoomRef.current;
    if (box && z) select(box).transition().duration(300).call(z.scaleBy, f);
  }, []);

  /** a click position → map user units (accounts for zoom and the letterboxing) */
  const toUser = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const box = boxRef.current;
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const t = zoomTransform(box);
      const { s, ox, oy } = fit();
      const px = (clientX - r.left - t.x) / t.k;
      const py = (clientY - r.top - t.y) / t.k;
      return [(px - ox) / s, (py - oy) / s];
    },
    [fit],
  );

  return { boxRef, stageRef, svgRef, gRef, fitBox, fitView, reset, zoomBy, toUser };
}
