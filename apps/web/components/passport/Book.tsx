'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A booklet whose leaves turn in 3D around the spine.
 * Wide screens show a spread (left page = back of the last turned leaf); phones show one page at a time.
 */
export function Book({
  pages, insideCover, at, onTurn, pw, ph, spread,
}: {
  /** pages[0] is the cover */
  pages: ReactNode[];
  /** shown on the back of the cover in spread mode */
  insideCover: ReactNode;
  /** index into `pages` of the page on the right (or the only page on phones) */
  at: number;
  onTurn: (page: number) => void;
  pw: number;
  ph: number;
  spread: boolean;
}) {
  const reduce = useReducedMotion();
  // spread: leaf 0 = cover / inside cover, then pairs of pages; single: one page per leaf
  const leaves: { front: ReactNode; back: ReactNode | null; first: number }[] = [];
  if (spread) {
    const seq = [pages[0], insideCover, ...pages.slice(1)];
    for (let i = 0; i < seq.length; i += 2) leaves.push({ front: seq[i], back: seq[i + 1] ?? <Blank />, first: i === 0 ? 0 : i - 1 });
  } else {
    pages.forEach((p, i) => leaves.push({ front: p, back: null, first: i }));
  }
  // which leaf is open at this view (spread views put odd pages on the right)
  const leafOf = (page: number) => (spread ? (page === 0 ? 0 : (viewOf(page, true) + 1) / 2) : page);
  const turned = leafOf(at);

  // the leaf in motion goes on top until it lands
  const [moving, setMoving] = useState<number | null>(null);
  const prev = useRef(turned);
  useEffect(() => {
    if (prev.current === turned) return;
    const m = turned > prev.current ? prev.current : turned;
    prev.current = turned;
    setMoving(m);
    const t = setTimeout(() => setMoving(null), 900);
    return () => clearTimeout(t);
  }, [turned]);

  const closed = spread && turned === 0;
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: spread ? pw * 2 : pw, height: ph, perspective: 2200 }}
      animate={{ x: closed ? -pw / 2 : 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
    >
      {leaves.map((leaf, k) => {
        const flipped = k < turned;
        const z = moving === k ? 100 : flipped ? k + 1 : leaves.length - k + 1;
        return (
          <motion.div
            key={k}
            className="absolute top-0"
            style={{ left: spread ? pw : 0, width: pw, height: ph, transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: z, pointerEvents: !spread && flipped ? 'none' : undefined }}
            initial={false}
            animate={{ rotateY: flipped ? -180 : 0 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 15 }}
            aria-hidden={!spread ? k !== turned : k !== turned && k !== turned - 1}
          >
            <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ borderRadius: k === 0 ? '6px 18px 18px 6px' : '2px 10px 10px 2px' }}>
              {leaf.front}
            </div>
            {leaf.back && (
              <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)', borderRadius: '10px 2px 2px 10px' }}>
                {leaf.back}
              </div>
            )}
          </motion.div>
        );
      })}
      {/* spine shadow when open */}
      {spread && !closed && <div className="pointer-events-none absolute inset-y-0 z-[150] w-10 -translate-x-1/2" style={{ left: pw, background: 'linear-gradient(90deg, transparent, rgba(0,0,0,.18) 45%, rgba(0,0,0,.24) 50%, rgba(0,0,0,.18) 55%, transparent)' }} aria-hidden />}
      {/* page edges */}
      <TurnButtons at={at} count={pages.length} spread={spread} onTurn={onTurn} pw={pw} closed={closed} />
    </motion.div>
  );
}

/** the page shown on the right for any page (spreads open on odd pages; the cover alone is 0) */
export const viewOf = (page: number, spread: boolean) => (!spread || page === 0 ? page : page % 2 === 1 ? page : page + 1);
const viewsFor = (count: number, spread: boolean) => (spread ? [0, ...Array.from({ length: Math.floor(count / 2) }, (_, i) => i * 2 + 1)] : Array.from({ length: count }, (_, i) => i));

function TurnButtons({ at, count, spread, onTurn, pw, closed }: { at: number; count: number; spread: boolean; onTurn: (p: number) => void; pw: number; closed: boolean }) {
  const views = viewsFor(count, spread);
  const i = views.indexOf(viewOf(at, spread));
  const btn = 'clay clay-interactive clay-focus absolute top-1/2 z-[160] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg font-black text-[var(--ink-2)]';
  return (
    <>
      {i > 0 && (
        <button type="button" onClick={() => onTurn(views[i - 1])} className={btn} style={{ left: closed ? pw - 22 : -22 }} data-elev="2" aria-label={i === 1 ? 'Close passport' : 'Previous page'}>
          ‹
        </button>
      )}
      {i < views.length - 1 && (
        <button type="button" onClick={() => onTurn(views[i + 1])} className={btn} style={{ left: (spread && !closed ? pw * 2 : spread ? pw * 2 : pw) - 22 }} data-elev="2" aria-label={i === 0 ? 'Open passport' : 'Next page'}>
          ›
        </button>
      )}
    </>
  );
}

/** passport paper: warm, with a fine security pattern */
export function Paper({ children, n, tone = '#f4ecdc' }: { children?: ReactNode; n?: number; tone?: string }) {
  return (
    <div
      className="relative h-full w-full text-[#2a2418]"
      style={{
        background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,.55), transparent 55%), repeating-radial-gradient(circle at 50% 120%, rgba(120,95,60,.07) 0 1px, transparent 1px 7px), repeating-linear-gradient(115deg, rgba(90,120,140,.05) 0 1px, transparent 1px 9px), ${tone}`,
        boxShadow: 'inset 0 0 40px rgba(120,90,50,.18)',
      }}
    >
      {children}
      {n != null && <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-[#8a7a5c]">{n}</span>}
    </div>
  );
}

const Blank = () => <Paper />;
