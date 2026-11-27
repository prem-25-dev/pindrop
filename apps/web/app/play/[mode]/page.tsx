import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/ComingSoon';
import { GameScreen } from '@/components/game/GameScreen';
import { isGameId } from '@/lib/games';
import { MODES } from '@/lib/modes';

export function generateStaticParams() {
  return MODES.filter((m) => m.href.startsWith('/play/')).map((m) => ({ mode: m.href.split('/').pop()! }));
}

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  return { title: MODES.find((m) => m.href === `/play/${mode}`)?.title ?? 'Game' };
}

export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const m = MODES.find((x) => x.href === `/play/${mode}`);
  if (!m) notFound();
  if (isGameId(mode)) return <GameScreen gameId={mode} icon={m.icon} />;
  return <ComingSoon icon={m.icon} milestone={m.milestone} title={m.title} body={m.blurb} />;
}
