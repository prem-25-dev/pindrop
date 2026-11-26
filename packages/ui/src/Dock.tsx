'use client';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useRef, useState, type ComponentType, type ReactNode } from 'react';

export interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  /** Visual divider before this item (macOS style) */
  dividerBefore?: boolean;
}

type LinkLike = ComponentType<{ href: string; className?: string; children: ReactNode; 'aria-label'?: string; 'aria-current'?: 'page' | undefined }>;

const BASE = 52;
const MAX = 84;
const RANGE = 150;

function DockIcon({
  item, pointer, axis, active, Link,
}: { item: DockItem; pointer: MotionValue<number>; axis: 'x' | 'y'; active: boolean; Link: LinkLike }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const distance = useTransform(pointer, (v) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !Number.isFinite(v)) return RANGE;
    return v - (axis === 'x' ? r.x + r.width / 2 : r.y + r.height / 2);
  });
  const sizeRaw = useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE]);
  const size = useSpring(sizeRaw, { mass: 0.12, stiffness: 180, damping: 13 });

  return (
    <>
      {item.dividerBefore && (
        <div aria-hidden className={axis === 'x' ? 'mx-1 h-10 w-px self-center bg-[var(--line)]' : 'my-1 h-px w-10 self-center bg-[var(--line)]'} style={{ boxShadow: '1px 1px 0 var(--clay-hi)' }} />
      )}
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        className="relative shrink-0"
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
      >
        <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} className="clay-focus absolute inset-0 rounded-[28%]">
          <motion.div whileTap={{ scale: 0.86, y: 3 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }} className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full">
            {item.icon}
          </motion.div>
        </Link>
        {/* tooltip */}
        <motion.span
          initial={false}
          animate={{ opacity: hover ? 1 : 0, scale: hover ? 1 : 0.9 }}
          className={`clay pointer-events-none absolute whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-[var(--ink)] ${
            axis === 'x' ? '-top-11 left-1/2 -translate-x-1/2' : 'left-[calc(100%+14px)] top-1/2 -translate-y-1/2'
          }`}
          data-elev="1"
          role="tooltip"
        >
          {item.label}
        </motion.span>
        {/* running-app dot */}
        {active && (
          <span
            aria-hidden
            className={`absolute h-1.5 w-1.5 rounded-full bg-[var(--ink-2)] ${axis === 'x' ? '-bottom-2.5 left-1/2 -translate-x-1/2' : '-left-2.5 top-1/2 -translate-y-1/2'}`}
          />
        )}
      </motion.div>
    </>
  );
}

/** macOS-style magnifying dock, made of clay. */
export function Dock({
  items, activeId, position = 'bottom', Link,
}: { items: DockItem[]; activeId?: string; position?: 'bottom' | 'left'; Link: LinkLike }) {
  const axis = position === 'bottom' ? 'x' : 'y';
  const pointer = useMotionValue(Infinity);
  return (
    <nav
      aria-label="Main"
      className={`fixed z-40 hidden md:block ${
        position === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2' : 'left-4 top-1/2 -translate-y-1/2'
      }`}
    >
      <motion.div
        onPointerMove={(e) => pointer.set(axis === 'x' ? e.clientX : e.clientY)}
        onPointerLeave={() => pointer.set(Infinity)}
        className={`clay flex items-end gap-3 p-3 ${position === 'bottom' ? 'h-[78px] flex-row' : 'w-[78px] flex-col items-start'}`}
        data-elev="3"
        style={{ borderRadius: 30 }}
      >
        {items.map((it) => (
          <DockIcon key={it.id} item={it} pointer={pointer} axis={axis} active={it.id === activeId} Link={Link} />
        ))}
      </motion.div>
    </nav>
  );
}
