import { ModeCard } from '@/components/ModeCard';
import { MODES } from '@/lib/modes';

export default function Home() {
  const [explore, party, ...rest] = MODES;
  const ready = rest.filter((m) => m.milestone !== 'v2');
  const later = rest.filter((m) => m.milestone === 'v2');

  return (
    <div className="space-y-10">
      <section className="pt-4">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--peach-deep)]">Where in the world?</p>
        <h1 className="mt-2 max-w-2xl text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          The whole world, one flag at a time.
        </h1>
        <p className="mt-4 max-w-xl text-balance text-lg font-semibold text-[var(--ink-2)]">
          Explore every country with sourced facts, then put your geography to the test, alone or with a room full of friends.
        </p>
      </section>

      <section aria-labelledby="start" className="space-y-4">
        <h2 id="start" className="sr-only">Start here</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <ModeCard mode={explore} featured index={0} />
          <ModeCard mode={party} featured index={1} />
        </div>
      </section>

      <section aria-labelledby="games" className="space-y-4">
        <h2 id="games" className="text-2xl font-black tracking-tight">Games</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((m, i) => (
            <ModeCard key={m.id} mode={m} index={i + 2} />
          ))}
        </div>
      </section>

      <section aria-labelledby="later" className="space-y-4">
        <h2 id="later" className="text-2xl font-black tracking-tight">Coming later</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {later.map((m, i) => (
            <ModeCard key={m.id} mode={m} index={i + 5} />
          ))}
        </div>
      </section>
    </div>
  );
}
