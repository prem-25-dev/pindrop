'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/*
 * A chunky clay booklet. Leaves turn in 3D around a ringed spine, sitting on a thick clay board,
 * with a visible block of page edges on each side that grows and shrinks as you read.
 * Wide screens show a spread (left page = back of the last turned leaf); phones show one page at a time.
 */

export const COVER = { base: '#4f7fd1', light: '#86b0f0', dark: '#2f5398', ink: '#fbf3df' };
export const BOARD = { base: '#3d66b3', light: '#5f8ad6', dark: '#244681' };
/** how far the boards reach past the pages */
export const PAD = 14;
/** board thickness, for the edge you see while the cover swings */
const T = 9;
const PAPER_EDGE = ['#f1e6cd', '#ddcdaa', '#ebdfc3', '#d3c19b'];
const EASE = [0.66, 0, 0.22, 1] as const;
const COVER_S = 1.25;
const PAGE_S = 0.9;

const boardFill = `radial-gradient(130% 90% at 25% 10%, ${BOARD.light} 0%, ${BOARD.base} 45%, ${BOARD.dark} 100%)`;
const boardShade = 'inset 6px 6px 12px rgba(255,255,255,.25), inset -8px -10px 18px rgba(10,25,60,.35)';
/** layers of paper and board under the top board: the thickness of the book */
const strata = `0 3px 0 #f4ead3, 0 5px 0 #ddcca8, 0 7px 0 #efe3c6, 0 9px 0 #d6c39c, 0 13px 0 ${BOARD.dark}, 0 34px 44px -14px rgba(15,30,65,.6)`;
const curlL = 'linear-gradient(90deg, rgba(90,65,30,.22), rgba(90,65,30,.06) 45%, transparent)';
const curlR = 'linear-gradient(270deg, rgba(90,65,30,.22), rgba(90,65,30,.06) 45%, transparent)';

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
  const leaves: { front: ReactNode; back: ReactNode | null }[] = [];
  if (spread) {
    const seq = [pages[0], insideCover, ...pages.slice(1)];
    for (let i = 0; i < seq.length; i += 2) leaves.push({ front: seq[i], back: seq[i + 1] ?? <Paper /> });
  } else {
    pages.forEach((p) => leaves.push({ front: p, back: null }));
  }
  const leafOf = (page: number) => (spread ? (page === 0 ? 0 : (viewOf(page, true) + 1) / 2) : page);
  const turned = leafOf(at);

  // the leaf in motion goes on top until it lands, with a shadow sweeping the pages under it
  const [moving, setMoving] = useState<{ leaf: number; id: number } | null>(null);
  const prev = useRef(turned);
  useEffect(() => {
    if (prev.current === turned) return;
    const leaf = turned > prev.current ? prev.current : turned;
    prev.current = turned;
    setMoving({ leaf, id: Date.now() });
    const t = setTimeout(() => setMoving(null), (leaf === 0 ? COVER_S : PAGE_S) * 1000 + 80);
    return () => clearTimeout(t);
  }, [turned]);

  const [hover, setHover] = useState(false);
  const closed = turned === 0;
  const n = leaves.length;
  // page-edge layers under each side, in proportion to how many leaves lie there
  const layers = (count: number) => (count <= 0 ? 0 : Math.max(1, Math.min(4, Math.round((count / n) * 5))));
  const leftLayers = spread ? layers(turned - 1) : 0;
  const rightLayers = closed ? 0 : layers(n - turned - 1);
  const left0 = spread ? pw : 0; // x of the spine
  const dur = (s: number) => (reduce ? { duration: 0 } : { duration: s, ease: EASE });
  // a turn starts on the render where `turned` changes, before the effect above records it
  const movingLeaf = prev.current !== turned ? Math.min(prev.current, turned) : (moving?.leaf ?? null);
  const zOf = (k: number) => (movingLeaf === k ? 200 : k < turned ? 20 + k * 2 : 20 + (n - k) * 2);
  const peek = closed && hover && !reduce && movingLeaf === null;

  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: spread ? pw * 2 : pw, height: ph, perspective: 2600 }}
      initial={false}
      animate={{ x: spread && closed ? -(pw + PAD) / 2 : 0 }}
      transition={dur(COVER_S)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* back board: the pages are bound onto it */}
      <div
        className="absolute"
        aria-hidden
        style={{
          left: spread ? pw : -PAD,
          top: -PAD,
          width: spread ? pw + PAD : pw + PAD * 2,
          height: ph + PAD * 2,
          zIndex: 1,
          borderRadius: spread ? '8px 28px 28px 8px' : 28,
          background: boardFill,
          boxShadow: `${boardShade}, ${strata}`,
        }}
      />

      {/* page edges: paper peeking out on the outer side of each page */}
      {Array.from({ length: leftLayers }, (_, i) => (
        <PaperEdge key={`l${i}`} x={-(i + 1) * 3.2} y={(i + 1) * 2.2} w={pw} h={ph} i={i} side="left" z={21} />
      ))}
      {Array.from({ length: rightLayers }, (_, i) => (
        <PaperEdge key={`r${i}`} x={left0 + (i + 1) * 3.2} y={(i + 1) * 2.2} w={pw} h={ph} i={i} side="right" z={5 - i} />
      ))}

      {leaves.map((leaf, k) => {
        const flipped = k < turned;
        if (k === 0) {
          // the front cover: a thick board that swings open on the spine
          const W = pw + PAD;
          const H = ph + PAD * 2;
          return (
            <motion.div
              key={k}
              className="absolute"
              style={{ left: left0, top: -PAD, width: W, height: H, transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: zOf(0), cursor: closed ? 'pointer' : undefined, pointerEvents: !spread && flipped ? 'none' : undefined }}
              initial={false}
              animate={{ rotateY: flipped ? -180 : peek ? -16 : 0 }}
              transition={movingLeaf === 0 ? dur(COVER_S) : { type: 'spring', stiffness: 170, damping: 18 }}
              onClick={closed ? () => onTurn(1) : undefined}
            >
              <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ transform: `translateZ(${T / 2}px)`, borderRadius: '8px 28px 28px 8px' }}>
                {leaf.front}
              </div>
              {/* the board's outer edge, seen while it swings */}
              <div
                className="absolute"
                style={{ left: W - 1, top: 12, bottom: 12, width: T, transformOrigin: 'left center', transform: `translateZ(${T / 2}px) rotateY(90deg)`, background: `linear-gradient(90deg, ${BOARD.base}, ${BOARD.dark})`, borderRadius: 3, opacity: !spread && flipped ? 0 : 1 }}
                aria-hidden
              />
              {leaf.back && (
                <div
                  className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                  style={{ transform: `translateZ(${-T / 2}px) rotateY(180deg)`, borderRadius: '28px 8px 8px 28px', background: boardFill, boxShadow: boardShade, padding: `${PAD}px 0 ${PAD}px ${PAD}px` }}
                >
                  <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: '18px 4px 4px 18px' }}>
                    {leaf.back}
                    <span className="pointer-events-none absolute inset-y-0 right-0 w-[14%]" style={{ background: curlR }} aria-hidden />
                  </div>
                </div>
              )}
            </motion.div>
          );
        }
        return (
          <motion.div
            key={k}
            className="absolute top-0"
            style={{ left: left0, width: pw, height: ph, transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: zOf(k), pointerEvents: !spread && flipped ? 'none' : undefined }}
            initial={false}
            animate={{ rotateY: flipped ? -180 : 0 }}
            transition={dur(PAGE_S)}
            aria-hidden={!spread ? k !== turned : k !== turned && k !== turned - 1}
          >
            <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ borderRadius: '4px 18px 18px 4px' }}>
              {leaf.front}
              {/* the page curls into the spine */}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[14%]" style={{ background: curlL }} aria-hidden />
            </div>
            {leaf.back && (
              <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)', borderRadius: '18px 4px 4px 18px' }}>
                {leaf.back}
                <span className="pointer-events-none absolute inset-y-0 right-0 w-[14%]" style={{ background: curlR }} aria-hidden />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* a shadow sweeps over the pages while a leaf is in the air */}
      {moving && !reduce && (
        <motion.div
          key={moving.id}
          className="pointer-events-none absolute top-0"
          style={{
            left: 0,
            width: spread ? pw * 2 : pw,
            height: ph,
            zIndex: 199,
            background: spread ? 'linear-gradient(90deg, transparent 8%, rgba(30,20,5,.3) 50%, transparent 92%)' : 'linear-gradient(90deg, rgba(30,20,5,.3), transparent 85%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: moving.leaf === 0 ? COVER_S : PAGE_S, ease: 'easeInOut' }}
          aria-hidden
        />
      )}

      {/* the ringed spine, over the pages */}
      <Rings x={left0} ph={ph} />

      <TurnButtons at={at} count={pages.length} spread={spread} onTurn={onTurn} pw={pw} closed={spread && closed} />
    </motion.div>
  );
}

function PaperEdge({ x, y, w, h, i, side, z }: { x: number; y: number; w: number; h: number; i: number; side: 'left' | 'right'; z: number }) {
  return (
    <div
      className="absolute top-0"
      aria-hidden
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: z,
        background: PAPER_EDGE[i] ?? PAPER_EDGE[3],
        borderRadius: side === 'left' ? '18px 4px 4px 18px' : '4px 18px 18px 4px',
        boxShadow: 'inset 2px 2px 3px rgba(255,255,255,.55), inset -2px -2px 4px rgba(110,80,40,.18), 0 2px 3px rgba(40,30,15,.18)',
      }}
    />
  );
}

/** clay binder rings across the spine */
function Rings({ x, ph }: { x: number; ph: number }) {
  const count = ph > 520 ? 6 : 5;
  const gap = ph / (count + 1);
  return (
    <div className="pointer-events-none absolute top-0 z-[155]" style={{ left: x, height: ph }} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const y = gap * (i + 1);
        return (
          <div key={i} className="absolute" style={{ top: y - 9, left: -24 }}>
            {/* punch holes on each side */}
            <span className="absolute rounded-full" style={{ left: 2, top: 3, width: 11, height: 11, background: 'radial-gradient(circle at 60% 60%, #5d4a2c, #2b2112)', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.5)' }} />
            <span className="absolute rounded-full" style={{ left: 35, top: 3, width: 11, height: 11, background: 'radial-gradient(circle at 40% 60%, #5d4a2c, #2b2112)', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.5)' }} />
            {/* the ring itself: a puffy clay loop */}
            <span
              className="absolute rounded-full"
              style={{
                left: 4,
                top: 0,
                width: 40,
                height: 17,
                background: 'linear-gradient(180deg, #f3dfbf 0%, #ddbf92 55%, #c29f6d 100%)',
                boxShadow: 'inset 3px 3px 4px rgba(255,255,255,.7), inset -3px -4px 5px rgba(120,80,30,.4), 0 4px 6px -1px rgba(40,25,5,.45)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** the page shown on the right for any page (spreads open on odd pages; the cover alone is 0) */
export const viewOf = (page: number, spread: boolean) => (!spread || page === 0 ? page : page % 2 === 1 ? page : page + 1);
const viewsFor = (count: number, spread: boolean) => (spread ? [0, ...Array.from({ length: Math.floor(count / 2) }, (_, i) => i * 2 + 1)] : Array.from({ length: count }, (_, i) => i));

function TurnButtons({ at, count, spread, onTurn, pw, closed }: { at: number; count: number; spread: boolean; onTurn: (p: number) => void; pw: number; closed: boolean }) {
  const views = viewsFor(count, spread);
  const i = views.indexOf(viewOf(at, spread));
  const btn = 'clay clay-interactive clay-focus absolute top-1/2 z-[160] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl text-2xl font-black text-[var(--ink-2)]';
  const right = closed ? pw * 2 + PAD + 40 : (spread ? pw * 2 : pw) + PAD;
  return (
    <>
      {i > 0 && (
        <button type="button" onClick={() => onTurn(views[i - 1])} className={btn} style={{ left: -PAD - 24 }} data-elev="2" aria-label={i === 1 && spread ? 'Close passport' : 'Previous page'}>
          ‹
        </button>
      )}
      {i < views.length - 1 && (
        <button type="button" onClick={() => onTurn(views[i + 1])} className={btn} style={{ left: right - 24 }} data-elev="2" aria-label={i === 0 ? 'Open passport' : 'Next page'}>
          ›
        </button>
      )}
    </>
  );
}

/** fine clay grain, tiled over the paper */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42  0 0 0 0 .32  0 0 0 0 .18  0 0 0 .11 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/** passport paper, rolled from soft clay: puffy edges, grain and a faint security pattern */
export function Paper({ children, n, tone = '#f6eedd' }: { children?: ReactNode; n?: number; tone?: string }) {
  return (
    <div
      className="relative h-full w-full text-[#2a2418]"
      style={{
        background: `${GRAIN}, radial-gradient(circle at 28% 18%, rgba(255,255,255,.7), transparent 55%), repeating-radial-gradient(circle at 50% 120%, rgba(120,95,60,.06) 0 1px, transparent 1px 8px), ${tone}`,
        boxShadow: 'inset 5px 5px 10px rgba(255,255,255,.75), inset -6px -7px 14px rgba(140,105,55,.22)',
      }}
    >
      {children}
      {n != null && (
        <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-[#8a7a5c]" style={{ background: 'rgba(255,255,255,.55)', boxShadow: '0 1px 2px rgba(110,80,40,.2)' }}>
          {n}
        </span>
      )}
    </div>
  );
}

/** an SVG filter that makes flat shapes read as raised clay: lit from the top left, shadow to the bottom right */
export function ClayRelief({ id, soft = 1.4, depth = 3 }: { id: string; soft?: number; depth?: number }) {
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={soft} result="b" />
      <feDiffuseLighting in="b" surfaceScale={depth} diffuseConstant="1" lightingColor="#fff" result="d">
        <feDistantLight azimuth="225" elevation="52" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="0.95" k2="0.24" k3="0" k4="0" result="shaded" />
      <feSpecularLighting in="b" surfaceScale={depth} specularConstant=".7" specularExponent="22" lightingColor="#fff" result="s">
        <feDistantLight azimuth="225" elevation="48" />
      </feSpecularLighting>
      <feComposite in="s" in2="SourceAlpha" operator="in" result="sIn" />
      <feComposite in="shaded" in2="sIn" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0" result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" result="body" />
      <feOffset in="SourceAlpha" dx="1.6" dy="2.6" result="o" />
      <feGaussianBlur in="o" stdDeviation="1.8" result="ob" />
      <feFlood floodColor="#3a2812" floodOpacity=".38" />
      <feComposite in2="ob" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="body" />
      </feMerge>
    </filter>
  );
}
