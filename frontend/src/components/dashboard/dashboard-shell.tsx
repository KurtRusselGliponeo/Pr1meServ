'use client';

import * as React from 'react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardMobileNav } from '@/components/dashboard/dashboard-mobile-nav';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
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
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardHeader navigationTrigger={<DashboardMobileNav />} />
          {children}
        </div>
      </div>
    </div>
  );
}
