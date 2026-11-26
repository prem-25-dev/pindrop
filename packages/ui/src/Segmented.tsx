'use client';
import { motion } from 'motion/react';
import { useId } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Clay segmented control: a sunken track with a puffy sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  const h = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';
  return (
    <div role="radiogroup" aria-label={label} className="clay-well inline-flex gap-1 rounded-full p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`clay-focus relative rounded-full px-4 font-bold transition-colors ${h} ${
              active ? 'text-[var(--ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-2)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="clay absolute inset-0 rounded-full"
                data-elev="1"
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
