import { ModeCard } from '@/components/ModeCard';
import { MODES } from '@/lib/modes';

export const metadata = { title: 'Games' };

export default function Page() {
  const games = MODES.filter((m) => m.kind !== 'explore');
  return (
    <div className="space-y-6">
      <h1 className="pt-4 text-4xl font-black tracking-tight">Games</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((m, i) => (
          <ModeCard key={m.id} mode={m} index={i} />
        ))}
      </div>
    </div>
  );
}
