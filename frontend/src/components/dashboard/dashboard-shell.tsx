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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(127,29,29,0.1),_transparent_30%),linear-gradient(180deg,_rgba(127,29,29,0.05)_0%,_transparent_18%),linear-gradient(135deg,_#fff8f8_0%,_#ffffff_48%,_#fff3eb_100%)]">
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
