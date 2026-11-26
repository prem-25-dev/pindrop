'use client';
import { useMemo } from 'react';
import { useCountries } from '@/lib/countries';

/** Two rows of real flags in clay frames, drifting in opposite directions. Decorative. */
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
    <div aria-hidden className="relative left-1/2 w-screen -translate-x-1/2 space-y-3 overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {(rows ?? [[], []]).map((row, r) => (
        <div key={r} className={`flex w-max gap-3 ${r ? 'ribbon-right' : 'ribbon-left'}`}>
          {(row.length ? [...row, ...row] : Array.from({ length: 24 }, () => null)).map((c, i) => (
            <div key={i} className="clay shrink-0 rounded-2xl p-1.5" data-elev="1">
              {c ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.flag} alt="" width={84} height={63} loading="lazy" className="h-[54px] w-[72px] rounded-[10px] object-cover sm:h-[63px] sm:w-[84px]" />
              ) : (
                <div className="clay-well h-[54px] w-[72px] rounded-[10px] sm:h-[63px] sm:w-[84px]" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
