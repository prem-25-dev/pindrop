'use client';
import { motion } from 'motion/react';
import type { ComponentType, ReactNode } from 'react';
import type { DockItem } from './Dock';

type LinkLike = ComponentType<{ href: string; className?: string; children: ReactNode; 'aria-label'?: string; 'aria-current'?: 'page' | undefined }>;

/** Phone navigation: an iOS-style clay tab bar (replaces the dock below md). */
export function TabBar({ items, activeId, Link }: { items: DockItem[]; activeId?: string; Link: LinkLike }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="clay flex items-center justify-around px-2 py-2" data-elev="3" style={{ borderRadius: 28 }}>
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <Link key={it.id} href={it.href} aria-label={it.label} aria-current={active ? 'page' : undefined} className="clay-focus relative flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1">
              {active && (
                <motion.span layoutId="tab-active" className="clay-well absolute inset-0 rounded-2xl" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
              )}
              <motion.span whileTap={{ scale: 0.85 }} className="relative h-9 w-9 [&>svg]:h-full [&>svg]:w-full">
                {it.icon}
              </motion.span>
              <span className={`relative text-[10px] font-bold ${active ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
