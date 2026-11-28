import { PartyRoom } from '@/components/party/PartyRoom';

export const metadata = { title: 'Party room' };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PartyRoom code={code.toUpperCase()} />;
}
