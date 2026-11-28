'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { join, useParty } from '@/lib/party';
import { usePassport } from '@/lib/passport';
import { Lobby } from './Lobby';
import { PartyPlay } from './PartyPlay';
import { PartyResults } from './PartyResults';

/** a party room: join it, then show the lobby, the live game or the results, whichever the server says */
export function PartyRoom({ code }: { code: string }) {
  const state = useParty((s) => s.state);
  const status = useParty((s) => s.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useParty.getState().state?.code === code) return;
    let gone = false;
    const { name, color } = usePassport.getState();
    void join(code, name, color).then((r) => {
      if (!gone && !r.ok) setError(r.error);
    });
    return () => {
      gone = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
        <div className="clay w-full p-6" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
          <p className="font-mono text-2xl font-black tracking-[.3em]">{code}</p>
          <p className="mt-3 font-black">{error}</p>
          <Link href="/party" className="clay-tint tint-accent clay-focus mt-5 inline-flex h-11 items-center rounded-full px-6 font-black">
            Back to Party
          </Link>
        </div>
      </div>
    );
  }

  if (!state || state.code !== code) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="clay rounded-full px-5 py-2.5 text-sm font-extrabold text-[var(--ink-2)]" data-elev="2" role="status">
          {status === 'offline' ? 'Cannot reach the party server…' : `Joining room ${code}…`}
        </p>
      </div>
    );
  }

  return (
    <>
      {status === 'offline' && (
        <p className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-black text-white shadow-lg" style={{ background: 'var(--bad)' }} role="status">
          Connection lost. Reconnecting…
        </p>
      )}
      {state.phase === 'lobby' ? <Lobby state={state} /> : state.phase === 'results' ? <PartyResults state={state} /> : <PartyPlay state={state} />}
    </>
  );
}
