'use client';
import { useEffect, useMemo, useState } from 'react';
import { useCountries, type CountryIndexItem } from '@/lib/countries';
import { loadWorldShapes, type WorldShapes } from '@/lib/geo';
import { AVATAR_COLORS, TIERS, triedToday, usePassport, type Stamp, type StampTier } from '@/lib/passport';
import { Avatar } from '../game/Avatar';
import { Book, ClayRelief, COVER, PAD, Paper, viewOf } from './Book';
import { StampQuiz } from './StampQuiz';
import { StampArt } from './Stamps';

const PER_PAGE = 6;

/** book size from the window: a spread on wide screens, one page on phones */
function useBookSize() {
  const [size, setSize] = useState({ pw: 340, ph: 480, spread: false });
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spread = vw >= 900;
      const byH = (vh - 340 - PAD * 2) / 1.42;
      const pw = Math.round(Math.max(260, spread ? Math.min(400, (vw - 200) / 2, byH) : Math.min(380, vw - 76, Math.max(byH, 300))));
      setSize({ pw, ph: Math.round(pw * 1.42), spread });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return size;
}

/* ---------------- pages ---------------- */

function Cover({ name, stamps, byCode, world, pw }: { name: string; stamps: Stamp[]; byCode: Map<string, CountryIndexItem>; world: WorldShapes | null; pw: number }) {
  const cream = COVER.ink;
  // the two newest keepsakes are slapped on the cover like stickers
  const stickers = stamps.slice(-2).reverse();
  // laurel leaves along an arc around the globe
  const leaves = (side: 1 | -1) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 180) * (side === -1 ? 112 + i * 16 : 68 - i * 16);
      const x = 100 + 80 * Math.cos(a);
      const y = 102 + 80 * Math.sin(a);
      const rot = (a * 180) / Math.PI + (side === -1 ? 120 : 60);
      return <path key={`${side}${i}`} d="M0 0 C 7 -12, 24 -12, 32 0 C 24 12, 7 12, 0 0 Z" fill={i % 2 ? '#6fcf9b' : '#8fe0b2'} transform={`translate(${x} ${y}) rotate(${rot})`} />;
    });
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden py-[9%] text-center"
      style={{
        background: `radial-gradient(120% 80% at 22% 6%, ${COVER.light} 0%, ${COVER.base} 48%, ${COVER.dark} 100%)`,
        boxShadow: 'inset 10px 10px 18px rgba(255,255,255,.32), inset -14px -16px 26px rgba(15,35,80,.45)',
      }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <ClayRelief id="cv-soft" soft={1.8} depth={4} />
          <ClayRelief id="cv-text" soft={1.3} depth={3} />
          <radialGradient id="cv-ocean" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#c9efff" />
            <stop offset=".45" stopColor="#6ec1ff" />
            <stop offset="1" stopColor="#3a86d4" />
          </radialGradient>
        </defs>
      </svg>
      {/* clay grain and a stitched edge */}
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-soft-light" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.6) 0.7px, transparent 0.9px), radial-gradient(rgba(0,0,0,.3) 0.7px, transparent 0.9px)', backgroundSize: '5px 5px, 7px 7px', backgroundPosition: '0 0, 2px 3px' }} aria-hidden />
      <div className="pointer-events-none absolute inset-[11px] rounded-[20px] border-2 border-dashed" style={{ borderColor: 'rgba(251,243,223,.45)', filter: 'drop-shadow(1px 1.5px 0 rgba(15,35,80,.35))' }} aria-hidden />

      <div className="relative w-[84%]">
        <svg viewBox="0 0 300 64" className="w-full overflow-visible" role="img" aria-label="Passport">
          <text x="150" y="50" fontSize="52" fontWeight="900" letterSpacing="3" textAnchor="middle" fill={cream} filter="url(#cv-text)">
            PASSPORT
          </text>
        </svg>
        <p className="mt-1 text-[9px] font-extrabold tracking-[.34em]" style={{ color: 'rgba(251,243,223,.82)' }}>
          PINPOINT · CURIOUS TRAVELLERS
        </p>
      </div>

      {/* emblem: a clay globe with a pin stuck in it, a laurel, an orbiting plane and a ribbon */}
      <svg viewBox="-12 -12 224 224" className="relative w-[72%] overflow-visible" aria-hidden>
        <g filter="url(#cv-soft)">
          <ellipse cx="100" cy="100" rx="98" ry="34" fill="none" stroke={cream} strokeOpacity=".8" strokeWidth="3" strokeDasharray="8 8" transform="rotate(-18 100 100)" />
          {leaves(-1)}
          {leaves(1)}
          <circle cx="100" cy="100" r="58" fill="url(#cv-ocean)" />
          <path d="M66 74c9-10 24-8 28 2s-5 13-2 21-11 13-19 6-13-19-7-29Z M112 112c9-5 22 0 23 9s-8 15-17 12-12-16-6-21Z M114 66c7-4 16-1 17 6s-8 8-12 6-8-9-5-12Z M78 128c4-3 10-1 10 3s-6 6-9 4-3-5-1-7Z" fill="#7fd6a6" />
          {/* plane on the orbit */}
          <g transform="translate(176 66) rotate(-30)">
            <path d="M-12 0 L10 -2 C14 -2 14 2 10 2 Z M-2 -1 L-8 -11 L-3 -11 L5 -1 Z M-2 1 L-8 11 L-3 11 L5 1 Z M-11 0 L-15 -5 L-12 -5 L-8 0 Z" fill={cream} />
          </g>
          {/* ribbon */}
          <path d="M28 160 L10 166 L18 178 L10 190 L40 186 Z M172 160 L190 166 L182 178 L190 190 L160 186 Z" fill="#d9663c" />
          <path d="M30 156 Q100 176 170 156 L170 184 Q100 204 30 184 Z" fill="#ff8a5b" />
          <text x="100" y="186" fontSize="17" fontWeight="900" letterSpacing="4" textAnchor="middle" fill={cream}>
            PINPOINT
          </text>
          {/* the pin, pushed into the globe */}
          <ellipse cx="126" cy="70" rx="9" ry="4" fill="#1f4f8f" opacity=".35" />
          <g transform="rotate(18 126 66)">
            <path d="M126 66 L126 50" stroke="#c9b48c" strokeWidth="3" strokeLinecap="round" />
            <path d="M126 4c-11 0-20 9-20 20 0 14 20 30 20 30s20-16 20-30c0-11-9-20-20-20Z" fill="#ff7a4d" />
            <circle cx="126" cy="24" r="7" fill={cream} />
          </g>
        </g>
        {/* gloss on the globe */}
        <ellipse cx="80" cy="74" rx="20" ry="11" fill="#fff" opacity=".45" transform="rotate(-30 80 74)" />
      </svg>

      {stickers.map((s, i) => {
        const c = byCode.get(s.code);
        if (!c) return null;
        return (
          <div
            key={s.code}
            className="pointer-events-none absolute grid place-items-center rounded-[28%] p-1.5"
            style={{ [i ? 'left' : 'right']: i ? '8%' : '5%', bottom: i ? '17%' : '5%', rotate: `${i ? -12 : 10}deg`, background: 'linear-gradient(160deg, #fffaf0, #efe2c4)', boxShadow: 'inset 2px 2px 3px rgba(255,255,255,.9), inset -2px -3px 5px rgba(150,115,60,.25), 4px 8px 14px -4px rgba(15,35,80,.55)' }}
            aria-hidden
          >
            <StampArt c={c} stamp={s} world={world} size={pw * 0.22} />
          </div>
        );
      })}

      <div
        className="relative flex max-w-[78%] items-center gap-2.5 rounded-2xl py-2 pl-2.5 pr-4"
        style={{ background: 'linear-gradient(180deg, #fffaf0, #eadcbc)', boxShadow: 'inset 3px 3px 4px rgba(255,255,255,.9), inset -3px -4px 6px rgba(140,110,60,.3), 0 6px 0 #c9b48c, 0 12px 18px -4px rgba(15,35,80,.5)' }}
      >
        {/* e-passport chip */}
        <svg viewBox="0 0 30 22" className="w-7 shrink-0" aria-hidden>
          <rect x="1" y="1" width="28" height="20" rx="5" fill="#f2c14e" />
          <path d="M1 8h9v6H1 M29 8h-9v6h9 M10 1v20 M20 1v20" fill="none" stroke="#b88a24" strokeWidth="1.4" />
        </svg>
        <div className="min-w-0 text-left">
          <p className="truncate text-[13px] font-black leading-tight" style={{ color: COVER.dark }}>
            {name || 'Traveller'}
          </p>
          <p className="text-[9px] font-extrabold tracking-[.16em] text-[#8a7350]">
            {stamps.length} {stamps.length === 1 ? 'STAMP' : 'STAMPS'}
          </p>
        </div>
      </div>
    </div>
  );
}

function InsideCover() {
  return (
    <Paper tone="#efe4cd">
      <div className="flex h-full flex-col items-center justify-center gap-3 px-[12%] text-center">
        <svg viewBox="0 0 60 60" className="w-14 opacity-60" aria-hidden>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
          <path d="M30 10c-5 0-9 4-9 9 0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9Z" fill="#8a6a3a" />
        </svg>
        <p className="text-[11px] font-bold italic leading-relaxed text-[#6b5434]">
          The bearer of this passport is permitted to wander every map, ask every question and collect a stamp from every country they truly know.
        </p>
        <p className="text-[9px] font-extrabold tracking-[.3em] text-[#8a7350]">PINPOINT · ISSUED ON THIS DEVICE</p>
      </div>
    </Paper>
  );
}

/** ICAO 9303 check digit (weights 7-3-1), for a convincing machine-readable zone */
function check(s: string) {
  const v = (ch: string) => (ch === '<' ? 0 : /\d/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 55);
  return String([...s].reduce((sum, ch, i) => sum + v(ch) * [7, 3, 1][i % 3], 0) % 10);
}
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);

function DataPage({ byCode, list, stampCount, pw }: { byCode: Map<string, CountryIndexItem>; list: CountryIndexItem[]; stampCount: number; pw: number }) {
  const { name, home, color, issued, number, setProfile } = usePassport();
  const [edit, setEdit] = useState(false);
  const homeC = home ? byCode.get(home) : undefined;
  const nat = homeC?.iso3 ?? 'XXX';
  const ymd = issued.slice(2).replace(/-/g, '');
  const exp = `${Number(issued.slice(2, 4)) + 10}`.padStart(2, '0') + issued.slice(5, 7) + issued.slice(8, 10);
  const clean = name.toUpperCase().normalize('NFKD').replace(/[^A-Z ]/g, '').trim().replace(/\s+/g, '<');
  const l1 = pad(`P<PPT${clean}<<`, 44);
  const l2a = `${number}${check(number)}${nat}${ymd}${check(ymd)}X${exp}${check(exp)}`;
  const l2 = pad(l2a, 43) + check(l2a);
  const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const field = (label: string, value: React.ReactNode) => (
    <div className="min-w-0">
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#8a7350]">{label}</p>
      <p className="truncate text-[12px] font-black">{value}</p>
    </div>
  );
  return (
    <Paper n={1}>
      <div className="flex h-full flex-col pb-8 pl-[12%] pr-[7%] pt-[7%]">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-black tracking-[.3em] text-[#6a1b29]">PASSPORT</p>
          <button onClick={() => setEdit((e) => !e)} className="clay-focus rounded-full px-2.5 py-1 text-[11px] font-black text-[#6a1b29] hover:bg-black/5" aria-expanded={edit}>
            {edit ? 'Done' : 'Edit'}
          </button>
        </div>
        {edit ? (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8a7350]">Name</span>
              <input value={name} maxLength={24} onChange={(e) => setProfile({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-[#c9b58f] bg-white/60 px-3 py-2 text-sm font-bold outline-none focus:border-[#6a1b29]" />
            </label>
            <label className="block">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8a7350]">Home country</span>
              <select value={home ?? ''} onChange={(e) => setProfile({ home: e.target.value || null })} className="mt-1 w-full rounded-lg border border-[#c9b58f] bg-white/60 px-3 py-2 text-sm font-bold outline-none focus:border-[#6a1b29]">
                <option value="">Not set</option>
                {list.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8a7350]">Photo</span>
              <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar colour">
                {AVATAR_COLORS.map((col) => (
                  <button key={col} role="radio" aria-checked={color === col} aria-label={`Colour ${col}`} onClick={() => setProfile({ color: col })} className="clay-focus rounded-full p-0.5" style={{ boxShadow: color === col ? '0 0 0 2px #6a1b29' : undefined }}>
                    <Avatar color={col} size={34} mood={color === col ? 'happy' : 'idle'} />
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-bold text-[#8a7350]">Saved on this device. It moves to your account when sign-in arrives.</p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-3">
              {/* photo with a hologram sheen */}
              <div
                className="relative flex aspect-[3/4] w-[34%] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[5px] border-[#fffaf0]"
                style={{ background: `radial-gradient(circle at 35% 25%, ${COVER.light}, ${COVER.base})`, boxShadow: '0 0 0 1px rgba(160,130,80,.25), 4px 6px 10px -2px rgba(90,65,30,.35), -2px -2px 4px rgba(255,255,255,.7)' }}
              >
                <Avatar color={color} size={78} label="Passport photo" />
                <span className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: 'linear-gradient(115deg, transparent 20%, #8ef 35%, #f9c 50%, #ff9 62%, transparent 75%)' }} aria-hidden />
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-2">
                {field('Type', 'P')}
                {field('Code', 'PPT')}
                <div className="col-span-2">{field('Passport no.', <span className="font-mono">{number}</span>)}</div>
                <div className="col-span-2">{field('Name', name || 'Traveller')}</div>
                <div className="col-span-2">
                  {field(
                    'Home country',
                    homeC ? (
                      <span className="inline-flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={homeC.flagSquare} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                        {homeC.name}
                      </span>
                    ) : (
                      'Not set yet'
                    ),
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {field('Issued', fmt(issued))}
              {field('Authority', 'PINPOINT')}
              {field('Stamps', String(stampCount))}
            </div>
            <div className="mt-3">
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#8a7350]">Signature</p>
              <p className="truncate text-[22px] leading-none text-[#26314f]" style={{ fontFamily: '"Segoe Script","Brush Script MT","Snell Roundhand",cursive', rotate: '-3deg' }}>
                {name || 'Traveller'}
              </p>
            </div>
          </>
        )}
        {/* machine readable zone */}
        <div className="mt-auto rounded-sm bg-white/45 px-1.5 py-1.5" aria-label="Machine readable zone">
          {[l1, l2].map((l, i) => (
            <p key={i} className="overflow-hidden whitespace-nowrap font-mono font-bold leading-snug text-[#2a2418]" style={{ fontFamily: '"OCR-B","OCR B Std",ui-monospace,Consolas,monospace', fontSize: Math.min(11, (pw * 0.8) / 44 / 0.6) }}>
              {l}
            </p>
          ))}
        </div>
      </div>
    </Paper>
  );
}

/** stamp positions on a page: two columns, three rows, nudged so it looks hand-stamped */
const SLOTS: [number, number][] = [
  [27, 19], [72, 23], [29, 50], [71, 53], [28, 81], [72, 82],
];

function StampPage({ stamps, n, byCode, world, pw, first }: { stamps: Stamp[]; n: number; byCode: Map<string, CountryIndexItem>; world: WorldShapes | null; pw: number; first: boolean }) {
  const size = pw * 0.42;
  return (
    <Paper n={n}>
      <p className="absolute left-0 right-0 top-[3.5%] text-center text-[9px] font-extrabold tracking-[.4em] text-[#a8936b]">VISAS · STAMPS</p>
      {stamps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-[14%] text-center">
          <div className="rounded-2xl border-2 border-dashed border-[#cdb98f] px-4 py-6">
            <p className="text-sm font-black text-[#8a7350]">{first ? 'Your first stamp lands here' : 'Room for more stamps'}</p>
            <p className="mt-1 text-[11px] font-bold text-[#a8936b]">Pass a country entry exam on the last page.</p>
          </div>
        </div>
      )}
      {stamps.map((s, i) => {
        const c = byCode.get(s.code);
        if (!c) return null;
        const [x, y] = SLOTS[i];
        return (
          <div key={s.code} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }} title={`${c.name}: ${TIERS[s.tier].label}, ${s.score}/10`}>
            <StampArt c={c} stamp={s} world={world} size={size} />
          </div>
        );
      })}
    </Paper>
  );
}

const tierChip: Record<StampTier, { label: string; color: string }> = {
  entry: { label: 'Entry', color: '#2b4c9b' },
  postage: { label: 'Postage', color: '#2e7d4f' },
  tag: { label: 'Tag', color: '#a2522a' },
};

function EarnPage({ list, n, onPick }: { list: CountryIndexItem[]; n: number; onPick: (c: CountryIndexItem) => void }) {
  const { stamps, tries } = usePassport();
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((c) => !t || c.name.toLowerCase().includes(t) || c.aliases.some((a) => a.toLowerCase().includes(t)));
  }, [list, q]);
  const open = list.filter((c) => !triedToday(tries, c.code) && stamps[c.code]?.tier !== 'entry');
  return (
    <Paper n={n}>
      <div className="flex h-full flex-col pb-8 pl-[12%] pr-[6%] pt-[6%]">
        <p className="text-[10px] font-black tracking-[.3em] text-[#6a1b29]">EARN A STAMP</p>
        <p className="mt-1 text-[11px] font-bold leading-snug text-[#6b5434]">Ten questions about one country. 10/10 inks an entry stamp, 8–9 a postage stamp, 6–7 a luggage tag. One try per country a day.</p>
        <div className="mt-2.5 flex gap-2">
          <label className="flex flex-1 items-center rounded-full border border-[#c9b58f] bg-white/60 px-3">
            <span className="sr-only">Find a country</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a country…" className="h-9 w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#a8936b]" />
          </label>
          <button
            onClick={() => open.length && onPick(open[Math.floor(Math.random() * open.length)])}
            className="clay-focus shrink-0 rounded-full bg-[#6a1b29] px-3 text-xs font-black text-[#f3dfae] hover:bg-[#7d2233]"
          >
            Surprise me
          </button>
        </div>
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1" aria-label="Countries">
          {shown.map((c) => {
            const s = stamps[c.code];
            const locked = triedToday(tries, c.code);
            return (
              <li key={c.code}>
                <button
                  onClick={() => onPick(c)}
                  disabled={locked}
                  className="clay-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-bold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.flagSquare} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {s && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: tierChip[s.tier].color }}>
                      {tierChip[s.tier].label}
                    </span>
                  )}
                  {locked && <span className="text-[10px] font-extrabold text-[#8a7350]">back tomorrow</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Paper>
  );
}

/* ---------------- screen ---------------- */

export function PassportScreen() {
  const all = useCountries();
  const [world, setWorld] = useState<WorldShapes | null>(null);
  const { pw, ph, spread } = useBookSize();
  const { stamps, name } = usePassport();
  const [at, setAt] = useState(0);
  const [exam, setExam] = useState<CountryIndexItem | null>(null);

  useEffect(() => {
    loadWorldShapes().then(setWorld).catch(() => {});
  }, []);

  const list = useMemo(() => (all ?? []).filter((c) => c.un195).sort((a, b) => a.name.localeCompare(b.name)), [all]);
  const byCode = useMemo(() => new Map((all ?? []).map((c) => [c.code, c])), [all]);
  const ordered = useMemo(() => Object.values(stamps).sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code)), [stamps]);

  // an odd number of stamp pages keeps the last page on the right of a spread
  let stampPages = Math.max(3, Math.ceil(ordered.length / PER_PAGE));
  if (stampPages % 2 === 0) stampPages++;
  const counts = { entry: 0, postage: 0, tag: 0 } as Record<StampTier, number>;
  ordered.forEach((s) => counts[s.tier]++);

  const pages = [
    <Cover key="cover" name={name} stamps={ordered} byCode={byCode} world={world} pw={pw} />,
    <DataPage key="data" byCode={byCode} list={list} stampCount={ordered.length} pw={pw} />,
    ...Array.from({ length: stampPages }, (_, i) => (
      <StampPage key={`s${i}`} stamps={ordered.slice(i * PER_PAGE, (i + 1) * PER_PAGE)} n={i + 2} byCode={byCode} world={world} pw={pw} first={i === 0} />
    )),
    <EarnPage key="earn" list={list} n={stampPages + 2} onPick={setExam} />,
  ];
  const last = pages.length - 1;
  const go = (p: number) => setAt(viewOf(Math.max(0, Math.min(last, p)), spread));

  // arrow keys turn pages (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (exam || (e.target as HTMLElement)?.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') setAt((a) => viewOf(Math.min(last, a + (spread && a > 0 ? 2 : 1)), spread));
      if (e.key === 'ArrowLeft') setAt((a) => (a <= 1 ? 0 : viewOf(a - (spread ? 2 : 1), spread)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exam, last, spread]);
  // keep the view valid when switching between spread and single pages
  useEffect(() => setAt((a) => viewOf(Math.min(a, last), spread)), [spread, last]);

  if (!all) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          Opening your passport…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Passport</h1>
          <p className="mt-1 text-sm font-bold text-[var(--ink-2)]">
            {ordered.length ? `${ordered.length} ${ordered.length === 1 ? 'country' : 'countries'}: ${counts.entry} entry, ${counts.postage} postage, ${counts.tag} tag` : 'Your profile and your stamps, in one booklet.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => go(1)} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
            Data page
          </button>
          <button onClick={() => go(2)} className="clay clay-interactive clay-focus rounded-full px-4 py-2 text-sm font-extrabold text-[var(--ink-2)]" data-elev="1">
            Stamps
          </button>
          <button onClick={() => go(last)} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2 text-sm font-black">
            Earn a stamp
          </button>
        </div>
      </div>

      <div className="flex justify-center px-6 pb-10 pt-6">
        <Book pages={pages} insideCover={<InsideCover />} at={at} onTurn={go} pw={pw} ph={ph} spread={spread} />
      </div>
      <p className="mt-5 text-center text-xs font-bold text-[var(--ink-3)]">Use the arrows or ← → keys to turn pages.</p>

      {exam && (
        <StampQuiz
          key={exam.code}
          c={exam}
          all={all}
          world={world}
          onClose={() => setExam(null)}
          onSee={() => {
            const idx = Object.values(usePassport.getState().stamps)
              .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code))
              .findIndex((s) => s.code === exam.code);
            setExam(null);
            go(2 + Math.floor(Math.max(0, idx) / PER_PAGE));
          }}
        />
      )}
    </div>
  );
}
