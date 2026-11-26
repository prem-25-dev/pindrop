'use client';
import { useMemo } from 'react';
import { useCountries } from '@/lib/countries';

const H = 58; // flag height in px; width follows each flag's real proportions

/** Two rows of real flags (true proportions) in clay frames, drifting in opposite directions. Decorative. */
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
        <div key={r} className={`flex w-max items-center gap-3 ${r ? 'ribbon-right' : 'ribbon-left'}`}>
          {(row.length ? [...row, ...row] : Array.from({ length: 24 }, () => null)).map((c, i) => (
            <div key={i} className="clay shrink-0 rounded-2xl p-1.5" data-elev="1">
              {c ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.flagTrue}
                  alt=""
                  loading="lazy"
                  height={H}
                  width={Math.round(H * Math.min(c.flagRatio, 2.6))}
                  className="block rounded-[10px] object-contain"
                  style={{ height: H, width: Math.round(H * Math.min(c.flagRatio, 2.6)) }}
                />
              ) : (
                <div className="clay-well rounded-[10px]" style={{ height: H, width: H * 1.5 }} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
