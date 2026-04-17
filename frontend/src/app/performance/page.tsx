import * as React from 'react';
import { BarChart3 } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

export default function PerformancePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="floating-card mb-6 bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">PERFORMANCE</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Live Metrics & Dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review real-time performance indicators and monthly comparisons synced directly from the core API.
            </p>
          </div>
        </div>
      </section>
      
      <EmptyState
        icon={BarChart3}
        title="Performance Dashboard Initialization"
        description="Data aggregates are currently synchronizing. Full visual widgets and datagrids will populate here soon."
      />
    </div>
  );
}
