import * as React from 'react';
import { AlertCircle } from 'lucide-react';

export default function LapsationPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="floating-card mb-6 bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Lapsation Tracker</h1>
        <p className="mt-3 text-sm text-muted-foreground">Monitor at-risk cases and pipeline reinstatements via NAP stream data.</p>
      </section>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="floating-card p-6 bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">At Risk Policies</p>
          <p className="mt-2 text-4xl font-bold">124</p>
        </div>
        <div className="floating-card p-6 bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">Reinstated YTD</p>
          <p className="mt-2 text-4xl font-bold">89</p>
        </div>
      </div>
    </div>
  );
}
