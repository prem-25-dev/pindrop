'use client';
import { motion, useReducedMotion } from 'motion/react';

/** Genie-style page entrance: pages rise and unfold from the dock. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 60, scaleX: 0.86, scaleY: 0.78, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
      style={{ transformOrigin: '50% 100%' }}
    >
      {children}
    </motion.div>
  );
}
