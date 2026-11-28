import Link from 'next/link';
import { ClayIcon } from '@pinpoint/ui';
import { FlagOfTheDay } from '@/components/FlagOfTheDay';
import { FlagRibbon } from '@/components/FlagRibbon';
import { ModeCard } from '@/components/ModeCard';
import { MODES } from '@/lib/modes';

const STATS = [
  ['195', 'countries'],
  ['249', 'flags'],
  ['3', 'difficulty levels'],
  ['50', 'players per room'],
] as const;

export default function Home() {
  const byId = Object.fromEntries(MODES.map((m) => [m.id, m]));
  const games = ['daily', 'guess-flag', 'pin-drop', 'find-region', 'silhouette', 'border-hop'].map((id) => byId[id]);
  const later = MODES.filter((m) => m.milestone === 'v2');

  return (
    <div className="space-y-14 sm:space-y-16">
      {/* ---------- hero ---------- */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pt-6">
        <div>
          <p className="pill-accent inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-extrabold uppercase tracking-wider">
            <span className="h-6 w-6 [&>svg]:h-full [&>svg]:w-full">
              <ClayIcon name="explore" size={24} />
            </span>
            195 countries, every flag, one map
          </p>
          <h1 className="mt-5 text-balance text-[2.6rem] font-black leading-[0.98] tracking-tight sm:text-7xl">
            The world map,
            <br />
            <span className="text-[var(--accent)]">made playable.</span>
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg font-semibold leading-relaxed text-[var(--ink-2)]">
            Explore every country with sourced facts, then put your geography to the test, alone or with a room full of friends.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/play"
              className="clay-tint tint-accent clay-focus group inline-flex h-14 items-center gap-3 rounded-full pl-2 pr-7 text-lg font-black transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 transition-transform group-hover:scale-110">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5.5c0-1.2 1.3-1.9 2.3-1.3l9.3 5.9c.9.6.9 2 0 2.6l-9.3 5.9c-1 .6-2.3-.1-2.3-1.3z" />
                </svg>
              </span>
              Play now
            </Link>
            <Link
              href="/party"
              className="clay clay-interactive clay-focus inline-flex h-14 items-center gap-2.5 rounded-full pl-2 pr-6 text-base font-extrabold"
              data-elev="1"
            >
              <span className="h-10 w-10 [&>svg]:h-full [&>svg]:w-full">
                <ClayIcon name="party" size={40} />
              </span>
              Start a party
            </Link>
            <Link href="/explore" className="clay-focus rounded-full px-3 py-2 text-base font-extrabold text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]">
              Explore the map →
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-2.5">
            {STATS.map(([n, label]) => (
              <div key={label} className="clay flex items-baseline gap-1.5 rounded-2xl px-4 py-2.5" data-elev="1">
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-black tabular-nums">{n}</dd>
                <span className="text-sm font-bold text-[var(--ink-3)]">{label}</span>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <FlagOfTheDay />
        </div>
      </section>

      {/* ---------- flags ---------- */}
      <FlagRibbon />

      {/* ---------- start here ---------- */}
      <section aria-labelledby="start" className="space-y-5">
        <SectionTitle id="start" title="Start here" sub="Wander the map, or bring your friends." />
        <div className="grid gap-5 md:grid-cols-2">
          <ModeCard mode={byId.explore} size="lg" index={0} />
          <ModeCard mode={byId.party} size="lg" index={1} />
        </div>
      </section>

      {/* ---------- games ---------- */}
      <section aria-labelledby="games" className="space-y-5">
        <SectionTitle id="games" title="Games" sub="Every game works solo or with friends, at Tourist, Navigator or Cartographer level." href="/play" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((m, i) => (
            <ModeCard key={m.id} mode={m} index={i + 2} />
          ))}
        </div>
      </section>

      {/* ---------- later ---------- */}
      <section aria-labelledby="later" className="space-y-5">
        <SectionTitle id="later" title="Coming later" sub="Already designed, landing after launch." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {later.map((m, i) => (
            <ModeCard key={m.id} mode={m} index={i + 5} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ id, title, sub, href }: { id: string; title: string; sub: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-3xl font-black tracking-tight">{title}</h2>
        <p className="mt-1 font-semibold text-[var(--ink-3)]">{sub}</p>
      </div>
      {href && (
        <Link href={href} className="clay clay-interactive clay-focus shrink-0 rounded-full px-4 py-2 text-sm font-extrabold" data-elev="1">
          See all
        </Link>
      )}
    </div>
  );
}
