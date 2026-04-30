'use client';

import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import { DashboardHeader } from '@/components/layouts/dashboard-header';
import { DashboardNavigationProvider, useDashboardNavigation } from '@/components/layouts/dashboard-navigation-context';
import { DashboardMobileNav } from '@/components/layouts/dashboard-mobile-nav';
import { DashboardSidebar } from '@/components/layouts/dashboard-sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
}

function DashboardNavigationFeedback() {
  const shouldReduceMotion = useReducedMotion();
  const { isNavigating } = useDashboardNavigation();

  return (
    <AnimatePresence>
      {isNavigating ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-40 h-1 overflow-hidden rounded-full bg-primary/10"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-primary shadow-[0_0_24px_rgba(37,99,235,0.55)]"
            initial={shouldReduceMotion ? false : { x: '-20%' }}
            animate={shouldReduceMotion ? { x: 0 } : { x: ['-20%', '220%'] }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.95, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <DashboardNavigationProvider>
      <div className="min-h-screen bg-background bg-pastel-mesh">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-hero-orb-1/20 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-hero-orb-2/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-hero-orb-3/20 blur-3xl" />
        </div>
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
          <DashboardSidebar
            collapsed={isCollapsed}
            onToggleCollapsed={() => setIsCollapsed((currentValue) => !currentValue)}
          />
          <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
            <DashboardNavigationFeedback />
            <DashboardHeader navigationTrigger={<DashboardMobileNav />} />
            {children}
          </div>
        </div>
      </div>
    </DashboardNavigationProvider>
  );
}

