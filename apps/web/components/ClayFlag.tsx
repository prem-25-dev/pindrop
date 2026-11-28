/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Flags whose own artwork has a border around an inner panel (inset as % of width / height).
 * The panel's square corners get rounded to follow the clay corners.
 */
const BORDERED: Record<string, { x: number; y: number; color: string }> = {
  me: { x: 3.75, y: 5, color: '#d3ae3b' },
  lk: { x: 4.17, y: 5.56, color: '#ffb700' },
  mv: { x: 18.75, y: 25, color: '#d21034' },
};
const codeOf = (src: string) => src.match(/\/([a-z-]+)\.svg/)?.[1] ?? '';

/**
 * A flag pressed out of clay: rounded corners, a soft gloss from the top left,
 * puffy rims and a little slab of thickness underneath. Always 4:3.
 *
 * Pass `width` for a fixed size, or `className` (with a width) for a fluid one.
 * `depth` sets how puffy it is (px); it defaults from the width.
 * `label` shows the country's name in a clay tag on hover; `href` makes the flag a link.
 * Leave `label` off wherever the name is the answer to a question.
 */
export function ClayFlag({
  src, alt = '', width, depth, className = '', loading, style, label, href, tabIndex,
}: {
  src: string;
  label?: string;
  href?: string;
  tabIndex?: number;
  alt?: string;
  width?: number;
  depth?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: CSSProperties;
}) {
  const d = depth ?? Math.max(2, Math.round((width ?? 200) / 22));
  // equal corners on a 4:3 box: 12% of the width is 16% of the height
  const corner = width ? 0.14 : 0.12; // outer corner radius, as a share of the width
  const radius = width ? Math.round(width * corner) : '12% / 16%';
  const border = BORDERED[codeOf(src)];
  // inner corner: what is left of the outer one inside the border, but never too tight
  const inner = border ? Math.max(corner - border.x / 100, corner * 0.45) : 0;
  const rootClass = `relative shrink-0 ${label || href ? 'group transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.06] focus-visible:-translate-y-1' : ''} ${href ? 'clay-focus block' : ''} ${className}`;
  const rootStyle: CSSProperties = {
        width,
        aspectRatio: '4 / 3',
        borderRadius: radius,
        boxShadow: `0 ${Math.max(1, d * 0.6)}px 0 rgba(0,0,0,.16), 0 ${d * 1.6}px ${d * 3}px -${d}px rgba(10,15,30,.45)`,
        ...style,
  };
  const body: ReactNode = (
    <>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
        <img src={src} alt={alt} loading={loading} className="block h-full w-full object-cover" draggable={false} />
        {border && (
          // a rounded window over the inner panel; its shadow repaints the border colour around it
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${border.x}%`,
              right: `${border.x}%`,
              top: `${border.y}%`,
              bottom: `${border.y}%`,
              borderRadius: `${((inner / (1 - (2 * border.x) / 100)) * 100).toFixed(2)}% / ${(((inner * 4) / 3 / (1 - (2 * border.y) / 100)) * 100).toFixed(2)}%`,
              boxShadow: `0 0 0 999px ${border.color}`,
            }}
          />
        )}
        {/* gloss and shade, then the puffy rim */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 'inherit',
            background: 'radial-gradient(120% 90% at 22% 10%, rgba(255,255,255,.55), rgba(255,255,255,.14) 32%, transparent 55%), linear-gradient(160deg, transparent 55%, rgba(0,0,0,.18))',
            boxShadow: `inset ${d}px ${d}px ${d * 1.6}px rgba(255,255,255,.55), inset -${d}px -${d * 1.3}px ${d * 2}px rgba(0,0,0,.3)`,
          }}
        />
      </div>
      {label && (
        <span
          aria-hidden={!!href}
          className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-[60%] scale-90 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black text-[var(--ink)] opacity-0 transition duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
          style={{ background: 'var(--surface, #fff)', boxShadow: 'inset 2px 2px 3px rgba(255,255,255,.35), inset -2px -3px 4px rgba(0,0,0,.14), 0 6px 12px -4px rgba(10,15,30,.4)' }}
        >
          {label}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={rootClass} style={rootStyle} aria-label={label ?? alt} tabIndex={tabIndex}>
      {body}
    </Link>
  ) : (
    <div className={rootClass} style={rootStyle}>
      {body}
    </div>
  );
}
