'use client';
import { useId, type ReactNode } from 'react';

/**
 * Pinpoint icon set — 3D clay illustrations.
 *
 *  variant="tile"   (default) a thick clay app tile (slab edge, gloss, rim light) holding the object
 *  variant="object" just the illustrated object + its cast shadow, to sit on coloured cards
 *  variant="bare"   a glyph molded from the page's own surface clay (used for the settings gear)
 *
 * Every object is built from several materials (painted clay, gold, metal, paper, glossy plastic),
 * each with its own gradient, a specular highlight and a soft cast shadow.
 */

export type ClayRole = 'accent' | 'c2' | 'c3' | 'c4' | 'warn' | 'neutral';
export type ClayIconName =
  | 'home' | 'explore' | 'flag' | 'pin' | 'region' | 'party' | 'passport' | 'trophy'
  | 'profile' | 'search' | 'settings' | 'daily' | 'silhouette' | 'hop' | 'rarity' | 'play';
export type ClayIconVariant = 'tile' | 'object' | 'bare';

type U = (k: string) => string;
type Stop = [offset: number, color: string, opacity?: number];
const ref = (u: U, k: string) => `url(#${u(k)})`;

function LG({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }: { id: string; stops: Stop[]; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </linearGradient>
  );
}
function RG({ id, stops, cx = 0.5, cy = 0.5, r = 0.5, fx, fy }: { id: string; stops: Stop[]; cx?: number; cy?: number; r?: number; fx?: number; fy?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </radialGradient>
  );
}
/** soft white specular highlight */
const Spec = ({ u, cx, cy, rx, ry, rot = 0, o = 0.7 }: { u: U; cx: number; cy: number; rx: number; ry: number; rot?: number; o?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#fff" opacity={o} filter={ref(u, 'blur1')} />
);
/** soft cast shadow under an object */
const Shadow = ({ u, cx, cy, rx, ry, o = 0.3 }: { u: U; cx: number; cy: number; rx: number; ry: number; o?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#140a26" opacity={o} filter={ref(u, 'blur2')} />
);

/** The thick clay tile: slab edge, face gradient, top gloss, rim light, bottom shade. */
function Tile({ u, c }: { u: U; c: [string, string, string] }) {
  return (
    <>
      <defs>
        <LG id={u('tf')} x1={0.1} y1={0} x2={0.9} y2={1} stops={[[0, c[0]], [0.55, c[1]], [1, c[2]]]} />
        <LG id={u('tg')} stops={[[0, '#fff', 0.5], [0.42, '#fff', 0.06], [0.5, '#fff', 0]]} />
        <LG id={u('tr')} stops={[[0, '#fff', 0.85], [0.3, '#fff', 0.15], [1, '#fff', 0.05]]} />
        <LG id={u('tb')} stops={[[0.55, '#000', 0], [1, '#000', 0.2]]} />
      </defs>
      <rect x="4" y="8" width="56" height="53.5" rx="17" fill={c[2]} />
      <rect x="4" y="8" width="56" height="53.5" rx="17" fill="#000" opacity=".22" />
      <rect x="4" y="4" width="56" height="54" rx="17" fill={ref(u, 'tf')} />
      <rect x="4" y="4" width="56" height="54" rx="17" fill={ref(u, 'tb')} />
      <rect x="4" y="4" width="56" height="54" rx="17" fill={ref(u, 'tg')} />
      <rect x="4.7" y="4.7" width="54.6" height="52.6" rx="16.3" fill="none" stroke={ref(u, 'tr')} strokeWidth="1.3" />
    </>
  );
}

/* ---------- shared object parts ---------- */
const PIN_PATH = 'M0 -11.5c-6.6 0-11.5 5-11.5 11.2C-11.5 7.5 0 20 0 20S11.5 7.5 11.5-.3C11.5-6.5 6.6-11.5 0-11.5Z';
function Pin({ u, x, y, s = 1, k, colors }: { u: U; x: number; y: number; s?: number; k: string; colors: [string, string, string] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <RG id={u(k)} cx={0.35} cy={0.25} r={0.85} stops={[[0, colors[0]], [0.5, colors[1]], [1, colors[2]]]} />
      </defs>
      <path d={PIN_PATH} fill={ref(u, k)} />
      <circle cx="0" cy="-.5" r="4.3" fill="#fff" />
      <circle cx=".5" cy="0" r="4.3" fill="#000" opacity=".08" />
      <ellipse cx="-4.6" cy="-6" rx="2.2" ry="3.3" transform="rotate(30 -4.6 -6)" fill="#fff" opacity=".65" filter={ref(u, 'blur1')} />
    </g>
  );
}

const RED: [string, string, string] = ['#FF9A8A', '#F2353F', '#B51E2C'];
const BLUE: [string, string, string] = ['#9FD6FF', '#2F86EE', '#1752B5'];

/** One continuous gear outline so it reads as a single molded piece. */
const GEAR_PATH = (() => {
  const cx = 32, cy = 32, rOut = 21.5, rRoot = 16.5, teeth = 8;
  const pt = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = (i * 360) / teeth;
    d += `${i ? 'L' : 'M'}${pt(rRoot, a - 13)} L${pt(rOut, a - 8)} L${pt(rOut, a + 8)} L${pt(rRoot, a + 13)} `;
  }
  return `${d}Z`;
})();

const star = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    return `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(' ') + 'Z';

const sparkle = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy - s} Q${cx + s * 0.18} ${cy - s * 0.18} ${cx + s} ${cy} Q${cx + s * 0.18} ${cy + s * 0.18} ${cx} ${cy + s} Q${cx - s * 0.18} ${cy + s * 0.18} ${cx - s} ${cy} Q${cx - s * 0.18} ${cy - s * 0.18} ${cx} ${cy - s}Z`;

/* ---------- the icons ---------- */
const ICONS: Record<ClayIconName, { tile: [string, string, string]; draw: (u: U) => ReactNode }> = {
  home: {
    tile: ['#9AD8FF', '#3E9BF2', '#2266C2'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('wall')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#FFFCF6'], [0.7, '#F6E8D4'], [1, '#E0C7A6']]} />
          <LG id={u('roof')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FF9F7C'], [0.5, '#F25A3A'], [1, '#C4321C']]} />
          <LG id={u('door')} stops={[[0, '#D08A4E'], [1, '#86461B']]} />
          <RG id={u('win')} stops={[[0, '#FFF6C2'], [0.6, '#FFD24D'], [1, '#F2A516']]} />
        </defs>
        <Shadow u={u} cx={32} cy={52} rx={17} ry={2.6} />
        <rect x="38.5" y="17" width="5.5" height="11" rx="1.2" fill="#D9472C" />
        <rect x="37.6" y="15.4" width="7.3" height="3" rx="1.3" fill="#F57A5C" />
        <path d="M18.5 31H45.5V47a3.5 3.5 0 0 1-3.5 3.5H22a3.5 3.5 0 0 1-3.5-3.5Z" fill={ref(u, 'wall')} />
        <rect x="18.5" y="34" width="27" height="2.4" fill="#7a4a20" opacity=".12" />
        <path d="M12.5 32.5 30 17.2a3 3 0 0 1 4 0L51.5 32.5a1.9 1.9 0 0 1-1.25 3.3H13.75a1.9 1.9 0 0 1-1.25-3.3Z" fill={ref(u, 'roof')} />
        <path d="M13.5 34.6H50.5" stroke="#8E1F0E" strokeOpacity=".3" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M16.6 31 30.4 18.9" stroke="#fff" strokeOpacity=".6" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M28.3 50.5V41.7a3.7 3.7 0 0 1 7.4 0v8.8Z" fill={ref(u, 'door')} />
        <circle cx="33.9" cy="45.4" r=".9" fill="#FFD45C" />
        <rect x="20.8" y="38.4" width="5.6" height="5.6" rx="1.4" fill={ref(u, 'win')} />
        <rect x="37.6" y="38.4" width="5.6" height="5.6" rx="1.4" fill={ref(u, 'win')} />
        <path d="M23.6 38.4v5.6M20.8 41.2h5.6M40.4 38.4v5.6M37.6 41.2h5.6" stroke="#D98A0E" strokeWidth=".75" />
      </>
    ),
  },

  explore: {
    tile: ['#86F2D6', '#1FC0A0', '#0C8A72'],
    draw: (u) => (
      <>
        <defs>
          <RG id={u('ocean')} cx={0.36} cy={0.3} r={0.78} stops={[[0, '#B4ECFF'], [0.42, '#3AA2F0'], [1, '#1546A0']]} />
          <LG id={u('land')} stops={[[0, '#A6EB7F'], [1, '#2B9443']]} />
          <LG id={u('ring')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#B97A0B'], [0.3, '#FFE99A'], [0.65, '#F5B829'], [1, '#A86C08']]} />
          <RG id={u('term')} cx={0.3} cy={0.25} r={0.95} stops={[[0, '#000', 0], [0.62, '#000', 0], [1, '#061d4a', 0.55]]} />
          <clipPath id={u('gc')}><circle cx="32" cy="33" r="15" /></clipPath>
        </defs>
        <Shadow u={u} cx={32} cy={52.5} rx={15} ry={2.6} />
        <g transform="translate(32 33) rotate(-20)">
          <ellipse rx="22.5" ry="7.2" fill="none" stroke={ref(u, 'ring')} strokeWidth="3" />
        </g>
        <circle cx="32" cy="33" r="15" fill={ref(u, 'ocean')} />
        <g clipPath={ref(u, 'gc')}>
          <path fill={ref(u, 'land')} d="M21 22.5c2.6-2.2 6.4-2.4 8.2-.4 1.3 1.5.2 3.4 1.2 4.6 1.2 1.4 3 1.6 2.6 3.6-.4 2-2.6 2.2-3.2 4-.7 2-.1 4.4-1.7 5.4-1.8 1.1-3.3-.8-3.7-2.7-.5-2.3-2.2-3.4-3.6-5-1.6-1.8-2.1-4.4-1.2-6.6.5-1.2 1.4-2.2 1.4-2.9z" />
          <path fill={ref(u, 'land')} d="M35.5 30.5c2.2-1.2 5.6-.6 7.4 1.6 1.6 2 1.2 5.2-.6 7.2-1.6 1.8-3.6 2.8-5.2 4.6-.9 1-2.4.6-2.6-.8-.3-2.2.6-4.2-.2-6.2-.6-1.6-.9-4.8 1.2-6.4z" />
          <path fill={ref(u, 'land')} d="M35 19.5c1.6-1 4-.8 5.6.2 1 .7.6 2-.6 2.2-1.4.2-2.6.9-4 .6-1.3-.3-2-2.1-1-3z" />
          <circle cx="32" cy="33" r="15" fill={ref(u, 'term')} />
        </g>
        <Spec u={u} cx={26} cy={24.5} rx={4.6} ry={2.4} rot={-35} o={0.8} />
        <g transform="translate(32 33) rotate(-20)">
          <path d="M-22.5 0A22.5 7.2 0 0 0 22.5 0" fill="none" stroke={ref(u, 'ring')} strokeWidth="3" strokeLinecap="round" />
        </g>
        <Pin u={u} k="gpin" x={40} y={23} s={0.42} colors={RED} />
      </>
    ),
  },

  play: {
    tile: ['#C9AEFF', '#7C55F0', '#4C2DBD'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('body')} stops={[[0, '#FFFFFF'], [0.55, '#EEEAFB'], [1, '#C5BAE8']]} />
          <LG id={u('dpad')} stops={[[0, '#4B4568'], [1, '#26213D']]} />
        </defs>
        <Shadow u={u} cx={32} cy={51.5} rx={18} ry={2.6} />
        <path fill={ref(u, 'body')} d="M23 22H41C46 22 49.5 25 50.5 30L52.5 39.5C53.5 45 50.5 48.5 46.5 48.5C43.5 48.5 41.5 46.5 39.5 43.5L38 41H26L24.5 43.5C22.5 46.5 20.5 48.5 17.5 48.5C13.5 48.5 10.5 45 11.5 39.5L13.5 30C14.5 25 18 22 23 22Z" />
        <path fill="#6a58b0" opacity=".14" d="M11.6 39c.2 4.6 3 7.4 6.2 7.4 2.6 0 4.6-1.7 6.4-4.4L26 39.3h12l1.8 2.7c1.8 2.7 3.8 4.4 6.4 4.4 3.2 0 6-2.8 6.2-7.4.6 5.6-2.4 9.5-6.4 9.5-3 0-5-2-7-5L38 41H26l-1.5 2.5c-2 3-4 5-7 5-4 0-7-3.9-5.9-9.5z" />
        <rect x="20.4" y="27.4" width="3.6" height="10" rx="1.2" fill={ref(u, 'dpad')} />
        <rect x="17.2" y="30.6" width="10" height="3.6" rx="1.2" fill={ref(u, 'dpad')} />
        <rect x="21" y="28.2" width="1.2" height="3" rx=".6" fill="#fff" opacity=".35" />
        {([
          [41, 28.6, '#FFC93C'],
          [44.6, 32.2, '#FF5A5F'],
          [41, 35.8, '#3CCB7F'],
          [37.4, 32.2, '#4AA8FF'],
        ] as const).map(([x, y, c]) => (
          <g key={c}>
            <circle cx={x} cy={y + 0.5} r="2.2" fill="#000" opacity=".18" />
            <circle cx={x} cy={y} r="2.2" fill={c} />
            <circle cx={x - 0.7} cy={y - 0.7} r=".75" fill="#fff" opacity=".85" />
          </g>
        ))}
        <rect x="28.3" y="31" width="3" height="1.7" rx=".85" fill="#B9AEDB" />
        <rect x="32.7" y="31" width="3" height="1.7" rx=".85" fill="#B9AEDB" />
        <path d="M23.5 24.4H40.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
      </>
    ),
  },

  party: {
    tile: ['#FFB8CB', '#FF5E8E', '#CC2C60'],
    draw: (u) => (
      <>
        <defs>
          <RG id={u('b1')} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#FFF4B8'], [0.45, '#FFC928'], [1, '#D98A06']]} />
          <RG id={u('b2')} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#C8F3FF'], [0.45, '#22B4EA'], [1, '#0B6FA3']]} />
        </defs>
        <Shadow u={u} cx={32} cy={53} rx={12} ry={2} o={0.22} />
        <path d="M25 37.5q-2.4 5 .8 9t-.5 6.5M39.5 35.5q2.4 6-.8 10t.8 7" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="39.5" cy="24.5" rx="8.6" ry="10.2" fill={ref(u, 'b2')} />
        <path d="M38.2 34.4h2.6l-1.3 1.8z" fill="#0B6FA3" />
        <ellipse cx="25" cy="26.5" rx="9.2" ry="11" fill={ref(u, 'b1')} />
        <path d="M23.6 37.3h2.8l-1.4 2z" fill="#D98A06" />
        <Spec u={u} cx={21.2} cy={21} rx={2.4} ry={3.8} rot={25} o={0.85} />
        <Spec u={u} cx={36} cy={19.6} rx={2} ry={3.2} rot={25} o={0.8} />
        {([
          [13, 14, '#FFE066', 20], [48.5, 12.5, '#7CF0B4', -25], [51, 41, '#FFFFFF', 35], [13, 44, '#5EC2FF', -15],
          [47, 50, '#FFE066', 10], [17, 33, '#FFFFFF', 50],
        ] as const).map(([x, y, c, r], i) => (
          <rect key={i} x={x - 1.6} y={y - 0.8} width="3.2" height="1.6" rx=".6" fill={c} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <circle cx="31" cy="12" r="1.1" fill="#fff" />
        <circle cx="52" cy="25" r="1" fill="#FFE066" />
      </>
    ),
  },

  passport: {
    tile: ['#A8B3FF', '#4F60E8', '#2B36A8'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('cover')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#E8647A'], [0.5, '#B92D49'], [1, '#7F1A30']]} />
          <LG id={u('gold')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FFF0A8'], [0.5, '#F5C23A'], [1, '#C98A12']]} />
          <LG id={u('pages')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#E9DCC4'], [1, '#FFF8EA']]} />
        </defs>
        <Shadow u={u} cx={33} cy={52.5} rx={15} ry={2.4} />
        <rect x="21.5" y="16" width="24" height="34" rx="3.6" fill={ref(u, 'pages')} />
        <path d="M44.2 18v30" stroke="#C9B89A" strokeWidth=".6" />
        <path d="M42.8 17.5v31" stroke="#C9B89A" strokeWidth=".6" />
        <rect x="18.5" y="14" width="24" height="34" rx="3.6" fill={ref(u, 'cover')} />
        <rect x="18.5" y="14" width="4" height="34" rx="2" fill="#000" opacity=".16" />
        <circle cx="31" cy="27.5" r="6.2" fill="none" stroke={ref(u, 'gold')} strokeWidth="1.6" />
        <ellipse cx="31" cy="27.5" rx="2.6" ry="6.2" fill="none" stroke={ref(u, 'gold')} strokeWidth="1.1" />
        <path d="M24.8 27.5h12.4M25.6 24.4h10.8M25.6 30.6h10.8" stroke={ref(u, 'gold')} strokeWidth=".9" />
        <rect x="25" y="38.5" width="12" height="1.9" rx=".95" fill={ref(u, 'gold')} />
        <rect x="27" y="42" width="8" height="1.4" rx=".7" fill={ref(u, 'gold')} opacity=".8" />
        <Spec u={u} cx={24} cy={18} rx={3.4} ry={1.4} rot={-10} o={0.5} />
        <g transform="rotate(-14 46 42)">
          <rect x="39.5" y="36.5" width="13" height="11" rx="2" fill="#FFF8EC" />
          <rect x="39.5" y="36.5" width="13" height="11" rx="2" fill="none" stroke="#E7D8BD" strokeWidth=".6" strokeDasharray="1 1" />
          <circle cx="46" cy="42" r="3.3" fill="none" stroke="#2E7BEA" strokeWidth="1.1" />
          <path d="M44.3 42.2l1.2 1.2 2.4-2.6" fill="none" stroke="#2E7BEA" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </>
    ),
  },

  trophy: {
    tile: ['#8DBBFF', '#3F7BF0', '#1F45B3'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('g')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#D9900F'], [0.28, '#FFEFA6'], [0.55, '#F7BE2B'], [1, '#B8770C']]} />
          <LG id={u('wood')} stops={[[0, '#6B4430'], [1, '#3A2216']]} />
        </defs>
        <Shadow u={u} cx={32} cy={53} rx={13} ry={2.2} />
        <path d="M22 18.5h-4.3a5.6 5.6 0 0 0 5.3 10M42 18.5h4.3a5.6 5.6 0 0 1-5.3 10" fill="none" stroke={ref(u, 'g')} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M21 15H43V24C43 31 38 35.5 32 35.5S21 31 21 24Z" fill={ref(u, 'g')} />
        <ellipse cx="32" cy="15" rx="11" ry="2.3" fill="#FFF2BD" />
        <ellipse cx="32" cy="15.2" rx="9.3" ry="1.4" fill="#D99A1C" />
        <path d="M29.6 35.2h4.8l1 5h-6.8z" fill={ref(u, 'g')} />
        <rect x="23.5" y="40" width="17" height="3.8" rx="1.4" fill={ref(u, 'g')} />
        <rect x="21.5" y="43.5" width="21" height="7" rx="2.2" fill={ref(u, 'wood')} />
        <rect x="28" y="45.7" width="8" height="2.6" rx=".8" fill={ref(u, 'g')} />
        <path d={star(32, 24.2, 4.4, 1.9)} fill="#fff" opacity=".92" />
        <rect x="24.6" y="17" width="2.1" height="11" rx="1.05" fill="#fff" opacity=".6" filter={ref(u, 'blur1')} />
      </>
    ),
  },

  profile: {
    tile: ['#FFD394', '#FF9A3D', '#DC6610'],
    draw: (u) => (
      <>
        <defs>
          <RG id={u('body')} cx={0.38} cy={0.3} r={0.8} stops={[[0, '#E2D3FF'], [0.5, '#9C7CF5'], [1, '#5E40C9']]} />
          <RG id={u('eye')} cx={0.4} cy={0.35} r={0.7} stops={[[0, '#FFFFFF'], [1, '#E4E0F2']]} />
        </defs>
        <Shadow u={u} cx={32} cy={52.5} rx={14} ry={2.4} />
        <ellipse cx="25.5" cy="50" rx="4.2" ry="2" fill="#5E40C9" />
        <ellipse cx="38.5" cy="50" rx="4.2" ry="2" fill="#5E40C9" />
        <path d="M32 15C42 15 48 22 48 32 48 42.5 42 50 32 50S16 42.5 16 32C16 22 22 15 32 15Z" fill={ref(u, 'body')} />
        <path d="M32 15.5c0-4 3-6.4 6.4-5.6-.8 3.4-3.2 5.6-6.4 5.6Z" fill="#4FCB82" />
        <path d="M32 15.5c-.4-3-2.6-4.8-5.2-4.4.6 2.6 2.6 4.4 5.2 4.4Z" fill="#7BE3A3" />
        <ellipse cx="26.4" cy="30.5" rx="4.4" ry="5.2" fill={ref(u, 'eye')} />
        <ellipse cx="37.6" cy="30.5" rx="4.4" ry="5.2" fill={ref(u, 'eye')} />
        <circle cx="27.4" cy="31.6" r="2.5" fill="#1F1A33" />
        <circle cx="38.6" cy="31.6" r="2.5" fill="#1F1A33" />
        <circle cx="28.3" cy="30.6" r=".9" fill="#fff" />
        <circle cx="39.5" cy="30.6" r=".9" fill="#fff" />
        <ellipse cx="21.6" cy="38" rx="2.8" ry="1.6" fill="#FF8FB1" opacity=".75" />
        <ellipse cx="42.4" cy="38" rx="2.8" ry="1.6" fill="#FF8FB1" opacity=".75" />
        <path d="M28.6 39.2Q32 42.6 35.4 39.2" fill="none" stroke="#1F1A33" strokeWidth="1.7" strokeLinecap="round" />
        <Spec u={u} cx={23.5} cy={21.5} rx={4.8} ry={2.6} rot={-35} o={0.6} />
      </>
    ),
  },

  flag: {
    tile: ['#FFE38F', '#FFB627', '#DB8400'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('pole')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#7C8797'], [0.35, '#F4F7FB'], [0.7, '#B8C2CF'], [1, '#6E7888']]} />
          <RG id={u('ball')} cx={0.35} cy={0.3} r={0.8} stops={[[0, '#FFF3B5'], [0.5, '#F5C23A'], [1, '#B97A0B']]} />
          <LG id={u('cloth')} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#FF7F70'], [0.55, '#F03A47'], [1, '#B91E35']]} />
          <LG id={u('folds')} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#000', 0.12], [0.22, '#fff', 0.14], [0.42, '#000', 0.2], [0.65, '#fff', 0.12], [0.85, '#000', 0.16], [1, '#000', 0.05]]} />
        </defs>
        <Shadow u={u} cx={24} cy={53} rx={9} ry={1.8} />
        <rect x="18" y="14.5" width="3.4" height="38" rx="1.7" fill={ref(u, 'pole')} />
        <circle cx="19.7" cy="13.2" r="2.9" fill={ref(u, 'ball')} />
        <path d="M21.4 17C27 14 31 19 37 16.5C41 15 44.5 15.5 48 16.8V34.5C44.5 33.2 41 32.7 37 34.2C31 36.7 27 31.7 21.4 34.7Z" fill={ref(u, 'cloth')} />
        <path d="M21.4 17C27 14 31 19 37 16.5C41 15 44.5 15.5 48 16.8V34.5C44.5 33.2 41 32.7 37 34.2C31 36.7 27 31.7 21.4 34.7Z" fill={ref(u, 'folds')} />
        <path d={star(33.5, 25.6, 4, 1.7)} fill="#fff" />
        <path d="M22.5 17.6C27.5 15.2 31 19.5 36.5 17.4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" />
      </>
    ),
  },

  pin: {
    tile: ['#A2F2C0', '#2FC46E', '#168748'],
    draw: (u) => (
      <>
        <Shadow u={u} cx={32} cy={53} rx={21} ry={2} o={0.22} />
        <path d="M10 42 22 37V47L10 52Z" fill="#FFF6E2" />
        <path d="M22 37 33 41V51L22 47Z" fill="#E6D4B5" />
        <path d="M33 41 45 36V46L33 51Z" fill="#FFF6E2" />
        <path d="M45 36 55 40V50L45 46Z" fill="#E6D4B5" />
        <path d="M12 47.5Q17 44 22.5 44.5T33.5 46.5 45 41.5 54 44.5" fill="none" stroke="#4BAEEF" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="40" cy="44.2" rx="3" ry="1.3" fill="#8BD86E" transform="rotate(-20 40 44.2)" />
        <ellipse cx="16" cy="44.5" rx="2.2" ry="1" fill="#F7C873" transform="rotate(-20 16 44.5)" />
        <ellipse cx="34" cy="44" rx="4.2" ry="1.4" fill="#1a1030" opacity=".35" filter={ref(u, 'blur1')} />
        <Pin u={u} k="mpin" x={34} y={21} colors={RED} />
      </>
    ),
  },

  region: {
    tile: ['#90F0B4', '#22B573', '#127D4D'],
    draw: (u) => (
      <>
        <defs>
          <RG id={u('shade')} cx={0.32} cy={0.28} r={0.9} stops={[[0, '#fff', 0.35], [0.5, '#fff', 0], [1, '#000', 0.22]]} />
          <LG id={u('barrel')} stops={[[0, '#8FD2FF'], [0.5, '#2F86EE'], [1, '#1752B5']]} />
          <LG id={u('fl')} stops={[[0, '#FFE066'], [1, '#FF8A1F']]} />
        </defs>
        <Shadow u={u} cx={32} cy={53} rx={15} ry={2.4} />
        <circle cx="30" cy="35.2" r="16" fill="#B9AFCC" />
        <circle cx="30" cy="33" r="16" fill="#FFFFFF" />
        <circle cx="30" cy="33" r="12.6" fill="#F0394C" />
        <circle cx="30" cy="33" r="9.2" fill="#FFFFFF" />
        <circle cx="30" cy="33" r="5.8" fill="#F0394C" />
        <circle cx="30" cy="33" r="2.4" fill="#FFD24D" />
        <circle cx="30" cy="33" r="16" fill={ref(u, 'shade')} />
        <path d="M31.5 32.6 41 25" stroke="#000" strokeOpacity=".25" strokeWidth="1.6" strokeLinecap="round" filter={ref(u, 'blur1')} />
        <g transform="rotate(-40 30 33)">
          <rect x="30" y="32.3" width="7" height="1.4" rx=".7" fill="#C8D0DC" />
          <rect x="36" y="30.9" width="9" height="4.2" rx="2.1" fill={ref(u, 'barrel')} />
          <rect x="37" y="31.4" width="6" height="1" rx=".5" fill="#fff" opacity=".6" />
          <path d="M44.5 33 51.5 26.5H53L50 33 53 39.5H51.5Z" fill={ref(u, 'fl')} />
          <path d="M44.5 33H52" stroke="#D96A0E" strokeWidth=".7" />
        </g>
      </>
    ),
  },

  daily: {
    tile: ['#FFB79A', '#FF6A45', '#D2401C'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('page')} stops={[[0, '#FFFFFF'], [1, '#EFE4DE']]} />
          <LG id={u('head')} stops={[[0, '#7A8BFF'], [1, '#4A56D8']]} />
          <RG id={u('flame')} cx={0.5} cy={0.75} r={0.75} stops={[[0, '#FFF6B0'], [0.35, '#FFC93C'], [0.75, '#FF7A1F'], [1, '#E9441B']]} />
        </defs>
        <Shadow u={u} cx={31} cy={52.5} rx={16} ry={2.3} />
        <rect x="14.5" y="18" width="30" height="31" rx="5.5" fill={ref(u, 'page')} />
        <path d="M14.5 23.5a5.5 5.5 0 0 1 5.5-5.5h19a5.5 5.5 0 0 1 5.5 5.5v3H14.5Z" fill={ref(u, 'head')} />
        <rect x="20.5" y="14.5" width="3.4" height="7.5" rx="1.7" fill="#E5E9F2" />
        <rect x="35.5" y="14.5" width="3.4" height="7.5" rx="1.7" fill="#E5E9F2" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect key={`${r}${c}`} x={18.5 + c * 6} y={30 + r * 5.6} width="4" height="3.4" rx="1" fill={r === 1 && c === 2 ? '#FF6A45' : '#E7DCD6'} />
          )),
        )}
        <path d="M45 53c-6 0-9.2-4-9.2-8.6 0-4 2.6-6.2 4.1-9.2.5 2.1 2 3.2 3.1 3.2-.5-3.2 1-6.2 3.6-8.3 0 3.6 4.6 5.6 4.6 11.3 0 6.6-2.6 11.6-6.2 11.6z" fill={ref(u, 'flame')} />
        <path d="M45.3 52.4c-2.6 0-4-1.8-4-3.8 0-2.2 1.6-3.2 2.4-4.9.8 1.5 1.8 1.9 2.6 1.9 0-1.5.6-2.6 1.4-3.2.6 2.3 1.6 3.4 1.6 5.6 0 2.6-1.6 4.4-4 4.4z" fill="#FFF3B0" />
      </>
    ),
  },

  rarity: {
    tile: ['#9AA8FF', '#5B67F0', '#3540C2'],
    draw: (u) => (
      <>
        <defs>
          <RG id={u('glow')} stops={[[0, '#C8F6FF', 0.85], [1, '#C8F6FF', 0]]} />
        </defs>
        <circle cx="32" cy="32" r="18" fill={ref(u, 'glow')} />
        <Shadow u={u} cx={32} cy={52} rx={11} ry={2} />
        <path d="M19.5 26 25.8 17.5H38.2L44.5 26Z" fill="#A8F0FF" />
        <path d="M19.5 26 25.8 17.5 29 26Z" fill="#D4FAFF" />
        <path d="M25.8 17.5H38.2L35 26H29Z" fill="#F2FDFF" />
        <path d="M38.2 17.5 44.5 26H35Z" fill="#7EE0FF" />
        <path d="M19.5 26H29L32 47Z" fill="#69C6FF" />
        <path d="M29 26H35L32 47Z" fill="#B7A4FF" />
        <path d="M35 26H44.5L32 47Z" fill="#4A6CF2" />
        <path d="M19.5 26 25.8 17.5H38.2L44.5 26 32 47Z M19.5 26H44.5" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth=".8" strokeLinejoin="round" />
        <path d={sparkle(47.5, 15, 3.6)} fill="#fff" />
        <path d={sparkle(15.5, 38, 2.4)} fill="#fff" />
        <path d={sparkle(48, 42, 1.8)} fill="#fff" opacity=".8" />
      </>
    ),
  },

  silhouette: {
    tile: ['#B3BDD0', '#6C7891', '#434E66'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('land')} stops={[[0, '#3A4460'], [1, '#1E2436']]} />
          <RG id={u('lens')} cx={0.35} cy={0.3} r={0.8} stops={[[0, '#FFFFFF', 0.75], [0.5, '#BFE6FF', 0.35], [1, '#7CC4F5', 0.3]]} />
          <LG id={u('brass')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FFEFA6'], [0.5, '#E8AE2A'], [1, '#A86E0A']]} />
        </defs>
        <Shadow u={u} cx={30} cy={52} rx={17} ry={2.2} />
        <g transform="translate(-4 -3) scale(1.08)">
          <path fill={ref(u, 'land')} d="M13 31c2-5 7-7 11-6 2-3 6-3 8 0 4-1 7 1 8 4 3 1 5 4 4 8-1 3-4 4-6 6-2 3-6 4-9 3-3 2-7 1-9-1-4 0-7-3-7-7 0-3 0-5 0-7z" />
          <path d="M15 31c2-4 6-5.6 9.4-4.8" fill="none" stroke="#9FB0D8" strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
        </g>
        <g transform="rotate(45 47 47)">
          <rect x="44.8" y="43" width="4.4" height="11" rx="2.2" fill="#3B2A22" />
          <rect x="44.8" y="43" width="4.4" height="2.4" rx="1" fill={ref(u, 'brass')} />
        </g>
        <circle cx="40.5" cy="37.5" r="7.6" fill={ref(u, 'lens')} />
        <circle cx="40.5" cy="37.5" r="7.6" fill="none" stroke={ref(u, 'brass')} strokeWidth="2.8" />
        <path d="M36.2 34.8a5.2 5.2 0 0 1 3.6-3" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
      </>
    ),
  },

  hop: {
    tile: ['#D6F58E', '#86CF33', '#55961A'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('plane')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FFFFFF'], [1, '#D9E2EC']]} />
        </defs>
        <Shadow u={u} cx={32} cy={53} rx={18} ry={2} o={0.2} />
        <path d="M18 41C19 25 34 13 46 19" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="0.5 3.6" strokeLinecap="round" />
        <ellipse cx="18" cy="50.5" rx="4" ry="1.2" fill="#1a1030" opacity=".3" filter={ref(u, 'blur1')} />
        <Pin u={u} k="p1" x={18} y={38} s={0.55} colors={RED} />
        <ellipse cx="47" cy="32" rx="3.4" ry="1" fill="#1a1030" opacity=".3" filter={ref(u, 'blur1')} />
        <Pin u={u} k="p2" x={47} y={21.5} s={0.5} colors={BLUE} />
        <g transform="translate(30.5 21.5) rotate(-24) scale(1.55)">
          <path d="M-7 0 8-5-1 6Z" fill={ref(u, 'plane')} />
          <path d="M-1 6 1 1 8-5Z" fill="#B9C6D6" />
          <path d="M-7 0 1 1 8-5Z" fill="#fff" />
        </g>
      </>
    ),
  },

  search: {
    tile: ['#CFD7E4', '#8D9AB0', '#5A667C'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('ring')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FFFFFF'], [0.5, '#C9D2DE'], [1, '#8592A6']]} />
          <RG id={u('lens')} cx={0.35} cy={0.3} r={0.8} stops={[[0, '#FFFFFF', 0.85], [0.5, '#BFE6FF', 0.45], [1, '#5EB3F0', 0.4]]} />
          <LG id={u('handle')} stops={[[0, '#4A5266'], [1, '#1E2330']]} />
        </defs>
        <Shadow u={u} cx={33} cy={52.5} rx={15} ry={2.2} />
        <g transform="rotate(45 41 41)">
          <rect x="38" y="36" width="6" height="16" rx="3" fill={ref(u, 'handle')} />
          <rect x="38" y="36" width="6" height="3" rx="1.2" fill="#F5C23A" />
          <rect x="39" y="40" width="1.3" height="10" rx=".65" fill="#fff" opacity=".25" />
        </g>
        <circle cx="28" cy="28" r="11" fill={ref(u, 'lens')} />
        <circle cx="28" cy="28" r="11" fill="none" stroke={ref(u, 'ring')} strokeWidth="4.2" />
        <path d="M21.6 24.6a7.2 7.2 0 0 1 5-4.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },

  settings: {
    tile: ['#C3CBD8', '#76829A', '#485268'],
    draw: (u) => (
      <>
        <defs>
          <LG id={u('metal')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#FFFFFF'], [0.45, '#D6DCE6'], [1, '#7F8BA0']]} />
          <LG id={u('hole')} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#5A6479'], [1, '#C9D0DC']]} />
        </defs>
        <Shadow u={u} cx={32} cy={52.5} rx={16} ry={2.4} />
        <path d={GEAR_PATH} fill={ref(u, 'metal')} stroke={ref(u, 'metal')} strokeWidth="2.5" strokeLinejoin="round" transform="translate(0 -1)" />
        <circle cx="32" cy="31" r="6.2" fill={ref(u, 'hole')} />
        <Spec u={u} cx={25} cy={22.5} rx={4} ry={2} rot={-40} o={0.7} />
      </>
    ),
  },
};

/** Variant "bare": a glyph molded from the page surface clay (theme-aware). */
function BareGear({ u }: { u: U }) {
  return (
    <>
      <defs>
        <linearGradient id={u('bb')} gradientUnits="userSpaceOnUse" x1="12" y1="10" x2="52" y2="54">
          <stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--surface) 72%, white)' }} />
          <stop offset=".5" style={{ stopColor: 'var(--surface)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in oklab, var(--surface-2) 82%, black)' }} />
        </linearGradient>
        <linearGradient id={u('bs')} gradientUnits="userSpaceOnUse" x1="27" y1="27" x2="37" y2="37">
          <stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--surface-2) 70%, black)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in oklab, var(--surface) 80%, white)' }} />
        </linearGradient>
        <filter id={u('bi')} x="-10%" y="-10%" width="120%" height="120%">
          <feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation="1.6" result="blur" />
          <feOffset in="blur" dx="-1.6" dy="-1.8" result="dk" />
          <feFlood floodColor="#000" floodOpacity="0.32" />
          <feComposite in2="dk" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="shadeDark" />
          <feOffset in="blur" dx="1.4" dy="1.6" result="lt" />
          <feFlood floodColor="#fff" floodOpacity="0.75" />
          <feComposite in2="lt" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="shadeLight" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="shadeDark" /><feMergeNode in="shadeLight" /></feMerge>
        </filter>
      </defs>
      <g filter={ref(u, 'bi')}>
        <path d={GEAR_PATH} fill={ref(u, 'bb')} stroke={ref(u, 'bb')} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <circle cx="32" cy="32" r="5.8" fill={ref(u, 'bs')} />
    </>
  );
}

export function ClayIcon({
  name, size = 56, className = '', title, variant = 'tile', bare,
}: { name: ClayIconName; size?: number; className?: string; title?: string; variant?: ClayIconVariant; /** @deprecated use variant="bare" */ bare?: boolean; role?: ClayRole }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u: U = (k) => `ci${raw}${k}`;
  const v: ClayIconVariant = bare ? 'bare' : variant;
  const icon = ICONS[name];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      style={{
        overflow: 'visible',
        filter: v === 'tile' ? `drop-shadow(0 ${size * 0.06}px ${size * 0.08}px rgba(20,10,40,.28))` : v === 'bare' ? `drop-shadow(0 ${size * 0.07}px ${size * 0.08}px var(--clay-drop))` : undefined,
      }}
    >
      <defs>
        <filter id={u('blur1')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".9" /></filter>
        <filter id={u('blur2')} x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>
      {v === 'bare' ? (
        <BareGear u={u} />
      ) : (
        <>
          {v === 'tile' && <Tile u={u} c={icon.tile} />}
          {icon.draw(u)}
        </>
      )}
    </svg>
  );
}

export const clayIconNames = Object.keys(ICONS) as ClayIconName[];
