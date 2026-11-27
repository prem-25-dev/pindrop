'use client';
import { useId } from 'react';
import type { CountryIndexItem } from '@/lib/countries';
import type { WorldShapes } from '@/lib/geo';
import type { Stamp } from '@/lib/passport';
import { ClayRelief } from './Book';

/*
 * Three keepsakes, one per score band. Each one carries the country's own outline as its emblem:
 *  - entry stamp (10/10): rubber-stamp ink, shape set by continent
 *  - postage stamp (8-9): perforated paper with the flag, postmarked
 *  - luggage tag (6-7): kraft tag with a big three-letter code
 */

const INKS = ['#2b4c9b', '#b8322f', '#2e7d4f', '#6b3fa0', '#0f6f78', '#a2522a', '#22304f'];
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
export const inkFor = (code: string) => INKS[Math.abs(hash(code)) % INKS.length];
const tiltFor = (code: string, range = 14) => ((Math.abs(hash(code + 'r')) % (range * 2 + 1)) - range);

const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

/** the country outline, fitted into a box (main landmass, so far islands do not shrink it) */
export function Silhouette({ code, world, x, y, size, fill, opacity = 1 }: { code: string; world: WorldShapes | null; x: number; y: number; size: number; fill: string; opacity?: number }) {
  const s = world?.shapes.find((v) => v.code === code);
  if (!s) return null;
  const [[x0, y0], [x1, y1]] = s.box;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.04;
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`} preserveAspectRatio="xMidYMid meet" overflow="hidden">
      <path d={s.d} fill={fill} opacity={opacity} />
    </svg>
  );
}

/** rough ink edges, so it reads as a real rubber stamp */
function InkFilter({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" result="d" />
      <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed={seed + 3} result="blot" />
      <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.5" result="mask" />
      <feComposite in="d" in2="mask" operator="in" />
    </filter>
  );
}

/** a slight hand-rolled wobble, so clay ropes are not machine perfect */
function Wobble({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
    </filter>
  );
}

function shapeFor(region: string): 'circle' | 'rect' | 'octagon' | 'oval' | 'hex' {
  if (region === 'Europe') return 'circle';
  if (region === 'Asia') return 'rect';
  if (region === 'Africa') return 'octagon';
  if (region === 'Americas') return 'oval';
  return 'hex';
}

const poly = (n: number, r: number, cx: number, cy: number, rot = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/** 10/10: an inked entry stamp */
export function EntryStamp({ c, stamp, world, size = 150 }: { c: CountryIndexItem; stamp: Stamp; world: WorldShapes | null; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ink = inkFor(c.code);
  const kind = shapeFor(c.region);
  const name = c.name.toUpperCase();
  const fs = name.length > 16 ? 8 : name.length > 11 ? 9.5 : 11;
  const border = { fill: 'none', stroke: ink, strokeWidth: 6, strokeLinejoin: 'round' } as const;
  const inner = { fill: 'none', stroke: ink, strokeWidth: 2.4, strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label={`Entry stamp: ${c.name}, ${stamp.score} of 10`} style={{ rotate: `${tiltFor(c.code)}deg`, overflow: 'visible' }}>
      <defs>
        <Wobble id={`w${id}`} seed={Math.abs(hash(c.code)) % 50} />
        <ClayRelief id={`i${id}`} soft={1.1} depth={2.6} />
        <path id={`a${id}`} d="M 30 80 A 50 50 0 0 1 130 80" />
        <path id={`b${id}`} d="M 34 86 A 46 46 0 0 0 126 86" />
      </defs>
      <g filter={`url(#i${id})`}>
       <g filter={`url(#w${id})`}>
        {kind === 'circle' && (
          <>
            <circle cx="80" cy="80" r="70" {...border} />
            <circle cx="80" cy="80" r="62" {...inner} />
            <text fontSize={fs} fontWeight="800" letterSpacing="1.5" fill={ink} textAnchor="middle">
              <textPath href={`#a${id}`} startOffset="50%">{name}</textPath>
            </text>
            <text fontSize="8" fontWeight="800" letterSpacing="2" fill={ink} textAnchor="middle" dy="8">
              <textPath href={`#b${id}`} startOffset="50%">★ ADMITTED ★</textPath>
            </text>
            <Silhouette code={c.code} world={world} x={80} y={78} size={44} fill={ink} />
            <rect x="44" y="104" width="72" height="14" rx="2" fill={ink} />
            <text x="80" y="114.5" fontSize="8.5" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing=".5">{fmtDate(stamp.date)}</text>
          </>
        )}
        {kind === 'oval' && (
          <>
            <ellipse cx="80" cy="80" rx="74" ry="56" {...border} />
            <ellipse cx="80" cy="80" rx="66" ry="48" {...inner} />
            <text x="80" y="48" fontSize={fs} fontWeight="800" letterSpacing="1.2" fill={ink} textAnchor="middle">{name}</text>
            <Silhouette code={c.code} world={world} x={50} y={84} size={40} fill={ink} />
            <text x="98" y="80" fontSize="12" fontWeight="900" fill={ink}>ENTRY</text>
            <text x="98" y="94" fontSize="8" fontWeight="800" fill={ink}>{fmtDate(stamp.date)}</text>
            <text x="80" y="122" fontSize="7" fontWeight="800" letterSpacing="2" fill={ink} textAnchor="middle">IMMIGRATION · {c.iso3}</text>
          </>
        )}
        {kind === 'rect' && (
          <>
            <rect x="10" y="26" width="140" height="108" rx="10" {...border} />
            <rect x="17" y="33" width="126" height="94" rx="6" {...inner} />
            <text x="80" y="50" fontSize={fs} fontWeight="900" letterSpacing="1.2" fill={ink} textAnchor="middle">{name}</text>
            <line x1="24" y1="56" x2="136" y2="56" stroke={ink} strokeWidth="1" />
            <Silhouette code={c.code} world={world} x={50} y={88} size={40} fill={ink} />
            <text x="78" y="82" fontSize="11" fontWeight="900" fill={ink}>ARRIVAL</text>
            <text x="78" y="95" fontSize="7.5" fontWeight="800" fill={ink}>{fmtDate(stamp.date)}</text>
            <text x="78" y="107" fontSize="7" fontWeight="800" fill={ink}>PERMITTED · 10/10</text>
            <text x="80" y="122" fontSize="6.5" fontWeight="800" letterSpacing="3" fill={ink} textAnchor="middle">{c.iso3} · PINPOINT</text>
          </>
        )}
        {kind === 'octagon' && (
          <>
            <polygon points={poly(8, 72, 80, 80, Math.PI / 8)} {...border} />
            <polygon points={poly(8, 63, 80, 80, Math.PI / 8)} {...inner} />
            <text x="80" y="44" fontSize={fs} fontWeight="900" letterSpacing="1.2" fill={ink} textAnchor="middle">{name}</text>
            <Silhouette code={c.code} world={world} x={80} y={80} size={46} fill={ink} />
            <text x="80" y="116" fontSize="10" fontWeight="900" letterSpacing="2" fill={ink} textAnchor="middle">ENTRY</text>
            <text x="80" y="127" fontSize="7.5" fontWeight="800" fill={ink} textAnchor="middle">{fmtDate(stamp.date)}</text>
          </>
        )}
        {kind === 'hex' && (
          <>
            <polygon points={poly(6, 72, 80, 80, Math.PI / 6)} {...border} />
            <polygon points={poly(6, 63, 80, 80, Math.PI / 6)} {...inner} />
            <text x="80" y="46" fontSize={fs} fontWeight="900" letterSpacing="1.2" fill={ink} textAnchor="middle">{name}</text>
            <Silhouette code={c.code} world={world} x={80} y={80} size={42} fill={ink} />
            <text x="80" y="114" fontSize="10" fontWeight="900" letterSpacing="2" fill={ink} textAnchor="middle">WELCOME</text>
            <text x="80" y="125" fontSize="7.5" fontWeight="800" fill={ink} textAnchor="middle">{fmtDate(stamp.date)}</text>
          </>
        )}
       </g>
      </g>
    </svg>
  );
}

/** 8-9: a perforated postage stamp with the flag, and a wavy postmark over the corner */
export function PostageStamp({ c, stamp, world, size = 130 }: { c: CountryIndexItem; stamp: Stamp; world: WorldShapes | null; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 120;
  const H = 150;
  const holes: [number, number][] = [];
  for (let x = 6; x <= W - 6; x += 9.6) holes.push([x, 0], [x, H]);
  for (let y = 6; y <= H - 6; y += 9.6) holes.push([0, y], [W, y]);
  const ink = '#1d2433';
  return (
    <svg viewBox={`-14 -10 ${W + 34} ${H + 20}`} width={size} height={(size * (H + 20)) / (W + 34)} role="img" aria-label={`Postage stamp: ${c.name}, ${stamp.score} of 10`} style={{ rotate: `${tiltFor(c.code, 6)}deg` }}>
      <defs>
        <mask id={`m${id}`}>
          <rect x="0" y="0" width={W} height={H} fill="#fff" />
          {holes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.2" fill="#000" />
          ))}
        </mask>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <rect x="11" y="11" width={W - 22} height="92" rx="2" />
        </clipPath>
        <InkFilter id={`i${id}`} seed={Math.abs(hash(c.code + 'p')) % 50} />
        <ClayRelief id={`r${id}`} soft={2} depth={4} />
      </defs>
      <g filter={`url(#r${id})`}>
        <rect x="0" y="0" width={W} height={H} fill="#fbf6ea" mask={`url(#m${id})`} />
      </g>
      <image href={c.flag} x="11" y="11" width={W - 22} height="92" preserveAspectRatio="xMidYMid slice" clipPath={`url(#c${id})`} />
      {/* the flag is a puffy clay inlay: a soft highlight and shade over it */}
      <rect x="11" y="11" width={W - 22} height="92" rx="2" fill={`url(#g${id})`} />
      <rect x="11" y="11" width={W - 22} height="92" rx="2" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
      {/* the outline in white over the flag, like a printed motif */}
      <Silhouette code={c.code} world={world} x={W / 2} y={57} size={46} fill="#fff" opacity={0.85} />
      <text x="14" y="122" fontSize="11" fontWeight="900" fill={ink}>{c.name.length > 14 ? c.iso3 : c.name.toUpperCase()}</text>
      <text x="14" y="136" fontSize="7" fontWeight="700" fill="#6b6455" letterSpacing="1">PINPOINT POST</text>
      <text x={W - 12} y="136" fontSize="20" fontWeight="900" fill={inkFor(c.code)} textAnchor="end">{stamp.score}0</text>
      {/* postmark */}
      <g filter={`url(#i${id})`} opacity=".8" transform={`translate(${W - 18} 8) rotate(-14)`}>
        <circle r="22" fill="none" stroke={ink} strokeWidth="1.6" />
        <circle r="17" fill="none" stroke={ink} strokeWidth=".8" />
        <text y="-3" fontSize="6" fontWeight="800" fill={ink} textAnchor="middle">{c.iso3}</text>
        <text y="6" fontSize="5" fontWeight="800" fill={ink} textAnchor="middle">{fmtDate(stamp.date).slice(0, 6)}</text>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M -60 ${14 + i * 6} q 7 -4 14 0 t 14 0 t 14 0 t 14 0`} fill="none" stroke={ink} strokeWidth="1.3" />
        ))}
      </g>
    </svg>
  );
}

/** 6-7: a souvenir luggage tag */
export function LuggageTag({ c, stamp, world, size = 150 }: { c: CountryIndexItem; stamp: Stamp; world: WorldShapes | null; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ink = inkFor(c.code);
  const bars = Array.from({ length: 22 }, (_, i) => ((Math.abs(hash(c.code + i)) % 3) + 1) * 0.9);
  let bx = 54;
  return (
    <svg viewBox="0 0 170 100" width={size} height={(size * 100) / 170} role="img" aria-label={`Luggage tag: ${c.name}, ${stamp.score} of 10`} style={{ rotate: `${tiltFor(c.code, 8)}deg`, overflow: 'visible' }}>
      <defs>
        <ClayRelief id={`r${id}`} soft={2} depth={4} />
      </defs>
      {/* string */}
      <path d="M 4 50 C -10 30, 10 10, 30 30" fill="none" stroke="#c79a62" strokeWidth="3" strokeLinecap="round" filter={`url(#r${id})`} />
      <g filter={`url(#r${id})`}>
        <path d="M 22 18 L 40 4 H 162 a 6 6 0 0 1 6 6 V 90 a 6 6 0 0 1 -6 6 H 40 L 22 82 Z" fill="#d9b98a" />
      </g>
      <path d="M 22 18 L 40 4 H 162 a 6 6 0 0 1 6 6 V 90 a 6 6 0 0 1 -6 6 H 40 L 22 82 Z" fill="none" stroke="rgba(0,0,0,.12)" />
      <circle cx="34" cy="50" r="5" fill="var(--paper, #f3ead8)" stroke="#a5865a" strokeWidth="2" />
      <rect x="48" y="4" width="10" height="92" fill={ink} opacity=".85" filter={`url(#r${id})`} />
      <text x="66" y="22" fontSize="7" fontWeight="800" fill="#5b4527" letterSpacing="1.5">SOUVENIR · {stamp.score}/10</text>
      <text x="64" y="54" fontSize="32" fontWeight="900" fill="#2b2115" letterSpacing="1">{c.iso3}</text>
      <text x="66" y="67" fontSize="8" fontWeight="800" fill="#5b4527">{c.name.length > 20 ? c.name.slice(0, 19) + '…' : c.name}</text>
      <Silhouette code={c.code} world={world} x={144} y={40} size={34} fill="#2b2115" opacity={0.75} />
      {bars.map((w, i) => {
        const x = bx;
        bx += w + 1.2;
        return <rect key={i} x={x + 12} y="76" width={w} height="12" fill="#2b2115" />;
      })}
      <text x="160" y="88" fontSize="6" fontWeight="700" fill="#5b4527" textAnchor="end">{fmtDate(stamp.date)}</text>
    </svg>
  );
}

export function StampArt({ c, stamp, world, size }: { c: CountryIndexItem; stamp: Stamp; world: WorldShapes | null; size?: number }) {
  if (stamp.tier === 'entry') return <EntryStamp c={c} stamp={stamp} world={world} size={size} />;
  if (stamp.tier === 'postage') return <PostageStamp c={c} stamp={stamp} world={world} size={size ? size * 0.85 : undefined} />;
  return <LuggageTag c={c} stamp={stamp} world={world} size={size} />;
}
