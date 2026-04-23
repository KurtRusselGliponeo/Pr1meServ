'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function DashboardPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        id="dashboard-content"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(10px)' }}
        animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, filter: 'blur(6px)' }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }
        }
      >
        <div className="pb-8">{children}</div>
      </motion.main>
    </AnimatePresence>
  );
}
