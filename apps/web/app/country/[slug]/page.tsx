import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClayFlag } from '@/components/ClayFlag';
import { SITE_URL, serverCountries } from '@/lib/serverData';

/*
 * One page per country, built ahead of time: the facts people search for, with sources,
 * and a way into the map and the games. Same data as the Explore panel.
 */

export function generateStaticParams() {
  return serverCountries().map((c) => ({ slug: c.slug }));
}

const find = (slug: string) => serverCountries().find((c) => c.slug === slug);
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const full = new Intl.NumberFormat('en');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = find((await params).slug);
  if (!c) return {};
  const bits = [c.capital?.name && `capital ${c.capital.name}`, c.population && `population ${compact.format(c.population.v)}`, c.subregion || c.region].filter(Boolean).join(', ');
  return {
    title: `${c.name}: flag, capital and facts`,
    description: `The flag of ${c.name} and its key facts: ${bits}. Explore it on the map and test yourself with flag games.`,
    alternates: { canonical: `${SITE_URL}/country/${c.slug}` },
    openGraph: { title: `${c.name} · Pinpoint`, images: [{ url: `${SITE_URL}${c.flagTrue}` }] },
  };
}

function Fact({ label, children, source }: { label: string; children: React.ReactNode; source?: string | null }) {
  return (
    <div className="clay p-4" data-elev="1" style={{ borderRadius: 'var(--radius)' }}>
      <dt className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</dt>
      <dd className="mt-1 text-lg font-black leading-snug">{children}</dd>
      {source && (
        <a href={source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] font-bold text-[var(--ink-3)] underline-offset-2 hover:underline">
          Source ↗
        </a>
      )}
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug);
  if (!c) notFound();
  const all = serverCountries();
  const neighbours = c.borders.map((b) => all.find((x) => x.code === b)).filter((x): x is NonNullable<typeof x> => !!x);
  const sameRegion = all.filter((x) => x.un195 && x.subregion === c.subregion && x.code !== c.code).slice(0, 8);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Country',
    name: c.name,
    alternateName: c.official,
    url: `${SITE_URL}/country/${c.slug}`,
    image: `${SITE_URL}${c.flagTrue}`,
    sameAs: [c.links.wikipedia, c.links.wikidata].filter(Boolean),
  };

  return (
    <article className="mx-auto max-w-4xl pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-4 px-1 text-sm font-bold text-[var(--ink-3)]" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-[var(--ink)]">
          Explore
        </Link>{' '}
        / {c.subregion || c.region} / <span className="text-[var(--ink-2)]">{c.name}</span>
      </nav>

      <header className="clay flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <ClayFlag src={c.flag} alt={`Flag of ${c.name}`} width={220} depth={9} />
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{c.name}</h1>
          {c.official !== c.name && <p className="mt-1 font-bold text-[var(--ink-2)]">{c.official}</p>}
          <p className="mt-2 text-sm font-bold text-[var(--ink-3)]">
            {c.subregion || c.region}
            {!c.un195 && ' · territory'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link href={`/explore?c=${c.code}`} className="clay-tint tint-accent clay-focus inline-flex h-11 items-center rounded-full px-5 font-black">
              Open on the map
            </Link>
            <Link href="/play/guess-flag" className="clay clay-interactive clay-focus inline-flex h-11 items-center rounded-full px-5 font-black" data-elev="1">
              Play Guess the Flag
            </Link>
          </div>
        </div>
      </header>

      <h2 className="mb-3 mt-8 px-1 text-xl font-black">Key facts</h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label="Capital">{c.capital?.name ?? '—'}</Fact>
        <Fact label="Population" source={c.population?.url}>
          {c.population ? `${compact.format(c.population.v)} (${c.population.year})` : 'No data'}
        </Fact>
        <Fact label="Area">{c.area ? `${full.format(c.area.v)} km²` : 'No data'}</Fact>
        <Fact label="Languages">{c.languages.length ? c.languages.join(', ') : '—'}</Fact>
        <Fact label="Currency">{c.currency ? `${c.currency.name}${c.currency.symbol ? ` (${c.currency.symbol})` : ''}` : '—'}</Fact>
        <Fact label="Drives on the">{c.drivingSide ? c.drivingSide : '—'}</Fact>
        <Fact label="Coast">{c.landlocked ? 'Landlocked' : c.coastline?.km ? `${full.format(c.coastline.km)} km of coastline` : 'Has a coastline'}</Fact>
        <Fact label="Neighbours">{neighbours.length ? neighbours.length : 'None by land'}</Fact>
        {c.income && <Fact label="Income group">{c.income.replace('-', ' ')}</Fact>}
      </dl>

      {neighbours.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 px-1 text-xl font-black">Borders</h2>
          <ul className="flex flex-wrap gap-2">
            {neighbours.map((n) => (
              <li key={n.code}>
                <Link href={`/country/${n.slug}`} className="clay clay-interactive clay-focus flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 font-black" data-elev="1">
                  <ClayFlag src={n.flag} width={32} depth={2} />
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {sameRegion.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 px-1 text-xl font-black">More in {c.subregion || c.region}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sameRegion.map((n) => (
              <li key={n.code}>
                <Link href={`/country/${n.slug}`} className="clay clay-interactive clay-focus flex flex-col items-center gap-2 p-3 text-center font-black" data-elev="1" style={{ borderRadius: 'var(--radius)' }}>
                  <ClayFlag src={n.flag} width={72} depth={3} />
                  <span className="text-sm leading-tight">{n.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 px-1 text-xs font-bold text-[var(--ink-3)]">
        Sources:{' '}
        <a href={c.links.wikipedia} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Wikipedia
        </a>
        {c.links.worldbank && (
          <>
            {' · '}
            <a href={c.links.worldbank} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              World Bank
            </a>
          </>
        )}
        {' · '}flags from flag-icons (MIT) · shapes from Natural Earth.
      </p>
    </article>
  );
}
