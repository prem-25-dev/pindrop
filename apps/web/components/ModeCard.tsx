'use client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { ClayIcon } from '@pinpoint/ui';
import type { Mode } from '@/lib/modes';

const KIND_LABEL = { explore: 'Explore', game: 'Solo · Party', party: 'Multiplayer' } as const;

/**
 * A colourful clay game card: tinted clay slab, a big 3D illustration popping out of the
 * top-right corner, chips top-left, title and blurb at the bottom, round play button bottom-right.
 */
export function ModeCard({ mode, size = 'md', index = 0 }: { mode: Mode; size?: 'md' | 'lg'; index?: number }) {
  const reduce = useReducedMotion();
  const [light, base, deep] = mode.tone;
  const dark = mode.ink === 'dark';
  const ink = dark ? '#2B1D05' : '#FFFFFF';
  const big = size === 'lg';

  const style = {
    '--tint': base,
    '--tint-deep': deep,
    background: `linear-gradient(150deg, ${light} 0%, ${base} 52%, ${deep} 100%)`,
    color: ink,
    borderRadius: 'var(--radius-lg)',
  } as CSSProperties;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.04 + index * 0.05 }}
      className="h-full"
    >
      <Link
        href={mode.href}
        aria-label={`${mode.title}. ${mode.blurb}${mode.status === 'soon' ? ` Coming in ${mode.milestone}.` : ''}`}
        className={`clay-tint clay-focus group relative flex h-full flex-col justify-end overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1.5 sm:p-6 ${big ? 'min-h-[260px] sm:min-h-[300px]' : 'min-h-[230px]'}`}
        style={style}
      >
        {/* playful texture: dotted grid fading out, plus a soft light blob behind the art */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.28) 1.2px, transparent 1.4px)',
            backgroundSize: '16px 16px',
            maskImage: 'radial-gradient(120% 90% at 100% 0%, #000 0%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(120% 90% at 100% 0%, #000 0%, transparent 65%)',
          }}
        />
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-52 w-52 rounded-full bg-white/25 blur-2xl" />

        {/* chips */}
        <div className="absolute left-5 top-5 flex flex-wrap gap-1.5 sm:left-6 sm:top-6">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${dark ? 'bg-black/10' : 'bg-white/20'}`}>
            {KIND_LABEL[mode.kind]}
          </span>
          {mode.status === 'soon' && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${dark ? 'bg-black/15' : 'bg-black/20'}`}>{mode.milestone}</span>
          )}
        </div>

        {/* the illustration */}
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute ${big ? '-right-3 -top-5 h-[170px] w-[170px] sm:h-[230px] sm:w-[230px]' : '-right-3 -top-4 h-[148px] w-[148px]'} [&>svg]:h-full [&>svg]:w-full`}
          style={{ filter: `drop-shadow(0 18px 22px ${deep}aa)` }}
          initial={false}
          whileHover={reduce ? undefined : { rotate: -6, scale: 1.06 }}
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ y: { duration: 4 + (index % 3), repeat: Infinity, ease: 'easeInOut' }, default: { type: 'spring', stiffness: 260, damping: 14 } }}
        >
          <ClayIcon name={mode.icon} size={big ? 230 : 148} variant="object" />
        </motion.div>

        {/* text + play */}
        <div className="relative flex items-end justify-between gap-4 pt-24">
          <div className="max-w-[30ch]">
            <h3 className={`font-black leading-tight tracking-tight ${big ? 'text-3xl sm:text-4xl' : 'text-2xl'}`} style={{ textShadow: dark ? 'none' : `0 2px 10px ${deep}` }}>
              {mode.title}
            </h3>
            <p className={`mt-1.5 font-bold leading-snug ${big ? 'text-base' : 'text-sm'}`} style={{ opacity: dark ? 0.78 : 0.9 }}>
              {mode.blurb}
            </p>
          </div>
          <span
            aria-hidden
            className={`flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${big ? 'h-14 w-14' : 'h-12 w-12'}`}
            style={{
              background: 'linear-gradient(145deg, #ffffff, #f1ecf7)',
              boxShadow: `inset 3px 3px 6px #fff, inset -4px -4px 8px rgba(0,0,0,.12), 0 10px 18px -6px ${deep}`,
            }}
          >
            <svg width={big ? 22 : 18} height={big ? 22 : 18} viewBox="0 0 24 24" fill={deep}>
              <path d="M8 5.5c0-1.2 1.3-1.9 2.3-1.3l9.3 5.9c.9.6.9 2 0 2.6l-9.3 5.9c-1 .6-2.3-.1-2.3-1.3z" />
            </svg>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
