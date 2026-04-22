'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function DashboardPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.main
      id="dashboard-content"
      className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <div className="pb-8">{children}</div>
    </motion.main>
  );
}
