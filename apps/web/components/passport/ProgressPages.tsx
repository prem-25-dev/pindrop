'use client';
import type { ReactNode } from 'react';
import { GAMES } from '@/lib/games';
import type { GameRecord } from '@/lib/history';
import { DIFFICULTIES } from '@/lib/modes';
import { isWin, placeIn, PLACEMENT_GAMES, TIERS_RANKED, type Badge, type BadgeIcon, type Rating, type Standing } from '@/lib/progress';
import { ClayRelief, Paper } from './Book';

/* Two passport pages: earned badges (with empty spaces waiting for the rest), and rank + ranked tier. */

const INK = '#6a1b29';
const LABEL = '#8a7350';
const lump = {
  background: 'linear-gradient(160deg, #fffdf7, #efe3c8)',
  boxShadow: 'inset 2px 2px 4px rgba(255,255,255,.9), inset -3px -3px 6px rgba(150,115,60,.22), 2px 4px 8px -3px rgba(110,80,35,.35)',
};

const ICONS: Record<BadgeIcon, ReactNode> = {
  flag: <path d="M7 21V4 M7 5h10l-2.5 3.5L17 12H7" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
      <path d="M8 6H5.5a3 3 0 0 0 3 4 M16 6h2.5a3 3 0 0 1-3 4 M12 13v4 M8.5 20h7" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.5" y="6" width="15" height="13.5" rx="2.5" />
      <path d="M4.5 10.5h15 M9 4v4 M15 4v4 M9 14.5h2 M13 14.5h2" />
    </>
  ),
  medal: (
    <>
      <path d="M8.5 3.5 12 9l3.5-5.5" />
      <circle cx="12" cy="14.5" r="5" />
      <path d="M12 12.5v4" />
    </>
  ),
  star: <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.5-5-2.6-5 2.6.9-5.5-4-4 5.6-.8Z" />,
  podium: <path d="M9 9h6v11H9Z M3.5 13H9v7H3.5Z M15 15.5h5.5V20H15Z M12 4.5v2" />,
  fire: <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-2.5 6.5C10 10.5 9 9 9 7.5 7 9.5 6 12 6 15a6 6 0 0 0 6 6Z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m15 9-2 4.5L9 15l2-4.5Z" />
    </>
  ),
  skull: (
    <>
      <path d="M6 11a6 6 0 0 1 12 0v3l-2 1v3h-8v-3l-2-1Z" />
      <path d="M9.5 12h.01 M14.5 12h.01 M11 18v-2 M13 18v-2" />
    </>
  ),
  stamp: (
    <>
      <path d="M9.5 4h5v4.5l2 3H7.5l2-3Z" />
      <path d="M5 12.5h14v3.5H5Z M7 19.5h10" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16 M12 4c2.5 2.5 2.5 13.5 0 16 M12 4c-2.5 2.5-2.5 13.5 0 16" />
    </>
  ),
  crown: <path d="M4.5 17.5 3.5 8l5 4L12 5.5 15.5 12l5-4-1 9.5Z M5 20.5h14" />,
};

function Coin({ b, size }: { b: Badge; size: number }) {
  const id = `badge-${b.id}`;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden className="overflow-visible">
      <defs>
        <ClayRelief id={`${id}-r`} soft={1.6} depth={3.5} />
        <radialGradient id={`${id}-g`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter={`url(#${id}-r)`}>
        <circle cx="30" cy="30" r="27" fill={b.color} />
        <circle cx="30" cy="30" r="27" fill={`url(#${id}-g)`} />
        <circle cx="30" cy="30" r="20.5" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeDasharray="2 3" />
      </g>
      <g transform="translate(16 16) scale(1.17)" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1.2px 0 rgba(0,0,0,.25))' }}>
        {ICONS[b.icon]}
      </g>
    </svg>
  );
}

/** an empty space in the album, waiting for its badge */
function Slot({ b, size }: { b: Badge; size: number }) {
  return (
    <div className="relative grid place-items-center rounded-full border-2 border-dashed border-[#cdb98f]" style={{ width: size, height: size, background: 'rgba(255,255,255,.35)' }}>
      <svg viewBox="0 0 24 24" width={size * 0.36} height={size * 0.36} fill="none" stroke="#b8a37a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {ICONS[b.icon]}
      </svg>
      {b.progress > 0 && b.count && (
        <span className="absolute -bottom-1.5 rounded-full px-1.5 text-[8px] font-black text-[#6b5434]" style={lump}>
          {b.count}
        </span>
      )}
    </div>
  );
}

export function BadgesPage({ badges, n, pw }: { badges: Badge[]; n: number; pw: number }) {
  const earned = badges.filter((b) => b.progress >= 1).length;
  const size = Math.round(Math.max(40, pw * 0.16));
  return (
    <Paper n={n}>
      <div className="flex h-full flex-col pb-9 pl-[9%] pr-[9%] pt-[7%]">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-black tracking-[.3em]" style={{ color: INK }}>
            BADGES
          </p>
          <p className="text-[10px] font-extrabold" style={{ color: LABEL }}>
            {earned} of {badges.length} earned
          </p>
        </div>
        <ul className="mt-3 grid flex-1 grid-cols-3 content-evenly gap-x-2 gap-y-1" aria-label="Badges">
          {badges.map((b) => {
            const got = b.progress >= 1;
            return (
              <li key={b.id} className="flex flex-col items-center text-center" title={`${b.name}: ${b.how}`} aria-label={`${b.name}, ${got ? 'earned' : `locked, ${b.how}${b.count ? `, ${b.count}` : ''}`}`}>
                {got ? <Coin b={b} size={size} /> : <Slot b={b} size={size} />}
                <p className={`mt-1.5 w-full truncate text-[10px] font-black leading-tight ${got ? 'text-[#2a2418]' : 'text-[#a8936b]'}`}>{b.name}</p>
                <p className="line-clamp-2 w-full text-[8px] font-bold leading-tight text-[#a8936b]">{b.how}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Paper>
  );
}

/** the ranked tier emblem: a clay shield, with one more chevron for each tier up */
function TierShield({ rating, size }: { rating: Rating; size: number }) {
  const t = rating.placed ? rating.tier : { color: '#a99a7c', light: '#e9e0cc' };
  const level = rating.placed ? TIERS_RANKED.indexOf(rating.tier) : -1;
  return (
    <svg viewBox="0 0 80 92" width={size} height={size * 1.15} aria-hidden className="overflow-visible">
      <defs>
        <ClayRelief id="tier-r" soft={2} depth={4} />
        <linearGradient id="tier-g" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={t.light} />
          <stop offset="1" stopColor={t.color} />
        </linearGradient>
      </defs>
      <g filter="url(#tier-r)">
        <path d="M40 4 72 15v26c0 22-14 37-32 47C22 78 8 63 8 41V15Z" fill="url(#tier-g)" />
        <path d="M40 13 63 21v20c0 16-10 28-23 36-13-8-23-20-23-36V21Z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.4" />
        {Array.from({ length: Math.max(0, level + 1) }, (_, i) => (
          <path key={i} d={`M27 ${58 - i * 7} 40 ${51 - i * 7} 53 ${58 - i * 7}`} fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {!rating.placed && (
          <text x="40" y="52" fontSize="22" fontWeight="900" fill="#fff" textAnchor="middle">
            ?
          </text>
        )}
      </g>
    </svg>
  );
}

const lengthLabel = (l: Standing['length']) => (l === 'all' ? 'every country' : l === 'endless' ? 'endless' : `${l} rounds`);
const levelLabel = (d: Standing['difficulty']) => DIFFICULTIES.find((x) => x.id === d)?.label ?? d;

export function RankPage({ rating, standings, games, n, pw }: { rating: Rating; standings: Standing[]; games: GameRecord[]; n: number; pw: number }) {
  const withBots = games.filter((g) => g.players.length > 1);
  const wins = withBots.filter(isWin).length;
  const podiums = withBots.filter((g) => (placeIn(g) ?? 9) <= 3 && g.players.length > 3).length;
  const top = standings.slice(0, 3);
  return (
    <Paper n={n}>
      <div className="flex h-full flex-col pb-9 pl-[12%] pr-[7%] pt-[7%]">
        <p className="text-[10px] font-black tracking-[.3em]" style={{ color: INK }}>
          RANKED
        </p>

        <div className="mt-2 flex items-center gap-3">
          <TierShield rating={rating} size={Math.round(pw * 0.22)} />
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-black leading-none tracking-tight" style={{ color: rating.placed ? rating.tier.color : '#8a7350' }}>
              {rating.placed ? rating.tier.label : 'Unranked'}
            </p>
            {rating.placed ? (
              <>
                <p className="mt-1 text-[11px] font-black text-[#2a2418]">
                  {rating.rating} rating
                  {rating.last != null && (
                    <span className="ml-1.5" style={{ color: rating.last >= 0 ? '#2f8f62' : '#c2412f' }}>
                      {rating.last >= 0 ? '+' : ''}
                      {rating.last}
                    </span>
                  )}
                </p>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: 'rgba(120,95,60,.15)' }} role="progressbar" aria-valuenow={Math.round(rating.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next tier">
                  <div className="h-full rounded-full" style={{ width: `${rating.progress * 100}%`, background: `linear-gradient(90deg, ${rating.tier.light}, ${rating.tier.color})` }} />
                </div>
                <p className="mt-1 text-[9px] font-extrabold" style={{ color: LABEL }}>
                  {rating.next ? `${rating.next.min - rating.rating} to ${rating.next.label}` : 'Top tier'}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[11px] font-bold leading-snug text-[#6b5434]">Play {PLACEMENT_GAMES} games with bots to get placed.</p>
                <div className="mt-1.5 flex gap-1">
                  {Array.from({ length: PLACEMENT_GAMES }, (_, i) => (
                    <span key={i} className="h-2.5 flex-1 rounded-full" style={{ background: i < rating.matches ? '#c9962a' : 'rgba(120,95,60,.15)' }} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            { v: rating.placed ? rating.peak : '–', l: 'Peak' },
            { v: wins, l: 'Wins' },
            { v: podiums, l: 'Podiums' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl px-1 py-1.5 text-center" style={lump}>
              <p className="text-[15px] font-black leading-none text-[#2a2418]">{s.v}</p>
              <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wider" style={{ color: LABEL }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] font-black tracking-[.3em]" style={{ color: INK }}>
          LEADERBOARD
        </p>
        {top.length ? (
          <ul className="mt-1.5 space-y-1.5" aria-label="Your best leaderboard positions">
            {top.map((s) => (
              <li key={`${s.game}${s.difficulty}${s.length}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={lump}>
                <span className="grid h-7 min-w-7 place-items-center rounded-full px-1 text-[11px] font-black text-white" style={{ background: s.rank === 1 ? '#d9a53a' : s.rank === 2 ? '#98a4b3' : s.rank === 3 ? '#c07f52' : '#8a7350', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,.5), 0 2px 3px rgba(0,0,0,.2)' }}>
                  #{s.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-black text-[#2a2418]">{GAMES[s.game].title}</span>
                  <span className="block truncate text-[9px] font-bold" style={{ color: LABEL }}>
                    {levelLabel(s.difficulty)} · {lengthLabel(s.length)} · of {s.of}
                  </span>
                </span>
                <span className="text-[11px] font-black text-[#2a2418]">{s.best.toLocaleString('en')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-[#6b5434]" style={lump}>
            Finish a game to get on the board.
          </p>
        )}
        <p className="mt-auto pt-2 text-[9px] font-bold leading-snug" style={{ color: LABEL }}>
          Ranked uses your games against bots for now. Global, country and friends ranks arrive with accounts.
        </p>
      </div>
    </Paper>
  );
}
