/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';

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
 */
export function ClayFlag({
  src, alt = '', width, depth, className = '', loading, style,
}: {
  src: string;
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
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width,
        aspectRatio: '4 / 3',
        borderRadius: radius,
        boxShadow: `0 ${Math.max(1, d * 0.6)}px 0 rgba(0,0,0,.16), 0 ${d * 1.6}px ${d * 3}px -${d}px rgba(10,15,30,.45)`,
        ...style,
      }}
    >
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
    </div>
  );
}
