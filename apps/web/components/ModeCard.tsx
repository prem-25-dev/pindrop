'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ClayIcon, trackLight } from '@pinpoint/ui';
import type { Mode } from '@/lib/modes';

const KIND_LABEL = { explore: 'Explore', solo: 'Solo', party: 'Multiplayer' } as const;

export function ModeCard({ mode, featured = false, index = 0 }: { mode: Mode; featured?: boolean; index?: number }) {
  const soon = mode.status === 'soon';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.05 + index * 0.04 }}
      className={featured ? 'sm:col-span-2' : ''}
    >
      <Link
        href={mode.href}
        onPointerMove={trackLight}
        data-light=""
        data-elev="2"
        className={`clay clay-interactive clay-focus group flex h-full overflow-hidden p-5 sm:p-6 ${featured ? 'min-h-[220px] flex-col justify-between sm:flex-row sm:items-center' : 'min-h-[200px] flex-col'}`}
        style={{ borderRadius: 'var(--radius-lg)' }}
        aria-label={`${mode.title}${soon ? ` (coming in ${mode.milestone})` : ''}`}
      >
        <div className={`flex items-start justify-between gap-3 ${featured ? 'sm:order-2 sm:flex-col sm:items-end' : ''}`}>
          <motion.div
            className="origin-bottom-left"
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            style={{ rotate: -4 }}
          >
            <div className={`[&>svg]:h-full [&>svg]:w-full ${featured ? 'h-[84px] w-[84px] sm:h-[120px] sm:w-[120px]' : 'h-[76px] w-[76px]'}`}>
              <ClayIcon name={mode.icon} size={featured ? 120 : 76} />
            </div>
          </motion.div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="clay-well rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">
              {KIND_LABEL[mode.kind]}
            </span>
            {soon && (
              <span className="pill-accent rounded-full px-2.5 py-1 text-[11px] font-extrabold ">
                {mode.milestone}
              </span>
            )}
          </div>
        </div>
        <div className={`mt-5 ${featured ? 'sm:mt-0 sm:max-w-md' : ''}`}>
          <h3 className={`font-black tracking-tight ${featured ? 'text-3xl' : 'text-xl'}`}>{mode.title}</h3>
          <p className={`mt-1.5 font-semibold leading-snug text-[var(--ink-2)] ${featured ? 'text-base' : 'text-sm'}`}>{mode.blurb}</p>
        </div>
      </Link>
    </motion.div>
  );
}
