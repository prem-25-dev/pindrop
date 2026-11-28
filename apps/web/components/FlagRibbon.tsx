'use client';
import { useMemo } from 'react';
import { useCountries } from '@/lib/countries';
import { ClayFlag } from './ClayFlag';

// every flag in the same 4:3 box (the 4:3 set is redrawn to fit, never squashed or chopped)
const W = 76;
const H = 57;

/** Two rows of clay flags, drifting in opposite directions. Decorative. */
export function FlagRibbon() {
  const list = useCountries();
  const rows = useMemo(() => {
    if (!list?.length) return null;
    const un = list.filter((c) => c.un195);
    // stable spread so neighbours in the ribbon are not alphabetical
    const spread = un.map((c, i) => ({ c, k: (i * 7919) % un.length })).sort((a, b) => a.k - b.k).map((x) => x.c);
    return [spread.slice(0, 32), spread.slice(32, 64)];
  }, [list]);

  return (
    <div aria-hidden className="relative left-1/2 w-screen -translate-x-1/2 space-y-4 overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {(rows ?? [[], []]).map((row, r) => (
        <div key={r} className={`flex w-max items-center gap-3 ${r ? 'ribbon-right' : 'ribbon-left'}`}>
          {(row.length ? [...row, ...row] : Array.from({ length: 24 }, () => null)).map((c, i) =>
            c ? (
              <ClayFlag key={i} src={c.flag} width={W} loading="lazy" />
            ) : (
              <div key={i} className="clay shrink-0 rounded-[11px]" data-elev="1" style={{ width: W, height: H }} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
