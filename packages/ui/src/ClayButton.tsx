'use client';
import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'info' | 'success' | 'soft' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ClayButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const tint: Record<Variant, string> = {
  primary: 'clay-tint tint-accent',
  secondary: 'clay-tint tint-c2',
  info: 'clay-tint tint-c3',
  success: 'clay-tint tint-c4',
  soft: 'clay',
  ghost: '',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
};

/** A puffy clay button that squishes when pressed. */
export const ClayButton = forwardRef<HTMLButtonElement, ClayButtonProps>(function ClayButton(
  { variant = 'primary', size = 'md', icon, children, className = '', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94, y: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      data-elev="1"
      className={`clay-focus inline-flex select-none items-center justify-center rounded-full font-bold tracking-tight ${
        variant === 'soft' ? 'text-[var(--ink)]' : ''
      } ${variant === 'ghost' ? 'text-[var(--ink-2)] hover:text-[var(--ink)]' : ''} ${tint[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  );
});
