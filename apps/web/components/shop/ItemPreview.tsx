'use client';
import type { CSSProperties } from 'react';
import { COVERS, type ShopItem } from '@/lib/shop';
import { Avatar } from '../game/Avatar';

/** a few colours from each theme, to show it without switching the whole app */
export const THEME_SWATCH: Record<string, string[]> = {
  atlas: ['#ece7df', '#f6f2ec', '#e0473f', '#187a8a', '#3c6ad3'],
  mono: ['#e9ecf0', '#f5f7fa', '#3b6fe0', '#5b6474', '#2f9a62'],
  terra: ['#ece2d4', '#f6efe5', '#c4683d', '#7d9a6b', '#d9a23b'],
  ocean: ['#e2edf0', '#eff6f8', '#ff6f59', '#1f8fa3', '#3d72d6'],
  sakura: ['#f6e9ee', '#fcf4f7', '#d9467e', '#8a4fbf', '#4f7fd1'],
  forest: ['#e7ebdf', '#f3f6ee', '#d98a1e', '#3f8a5a', '#4a76b8'],
  candy: ['#efe8f7', '#f8f3fc', '#f0569b', '#2bb3a3', '#7a5be0'],
};

/** a little passport in that cover */
export function MiniCover({ cover, size = 64 }: { cover: string; size?: number }) {
  const c = COVERS[cover] ?? COVERS.classic;
  const style: CSSProperties = {
    width: size,
    height: size * 1.36,
    background: `radial-gradient(120% 80% at 22% 6%, ${c.light} 0%, ${c.base} 48%, ${c.dark} 100%)`,
    boxShadow: `inset 3px 3px 6px rgba(255,255,255,.35), inset -4px -5px 8px rgba(0,0,0,.25), 0 4px 0 ${c.board.dark}, 0 10px 16px -6px rgba(0,0,0,.35)`,
    borderRadius: `${size * 0.08}px ${size * 0.2}px ${size * 0.2}px ${size * 0.08}px`,
  };
  return (
    <div className="relative flex flex-col items-center justify-between py-[14%]" style={style} aria-hidden>
      <span className="font-black tracking-[.08em]" style={{ color: c.ink, fontSize: size * 0.13, textShadow: `0 ${size * 0.015}px 0 rgba(0,0,0,.25)` }}>
        PASSPORT
      </span>
      <span className="rounded-full" style={{ width: size * 0.36, height: size * 0.36, background: `radial-gradient(circle at 35% 30%, #c9efff, #6ec1ff 50%, #3a86d4)`, boxShadow: '0 2px 3px rgba(0,0,0,.25)' }} />
      <span className="rounded-full" style={{ width: size * 0.46, height: size * 0.1, background: c.ink, opacity: 0.85 }} />
    </div>
  );
}

export function ItemPreview({ item, color, size = 64 }: { item: ShopItem; color: string; size?: number }) {
  switch (item.category) {
    case 'cover':
      return <MiniCover cover={item.value} size={size * 0.75} />;
    case 'theme':
      return (
        <div className="grid grid-cols-5 overflow-hidden rounded-2xl" style={{ width: size * 1.3, height: size * 0.8, boxShadow: '0 6px 12px -6px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.06)' }} aria-hidden>
          {(THEME_SWATCH[item.value] ?? []).map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
      );
    case 'hat':
      return <Avatar color={color} size={size} mood="happy" hat={item.value} />;
    case 'glasses':
      return <Avatar color={color} size={size} mood="idle" glasses={item.value} />;
    case 'color':
      return <Avatar color={item.value} size={size} mood="happy" />;
    case 'title':
      return (
        <span className="rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider" style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
          {item.value}
        </span>
      );
  }
}
