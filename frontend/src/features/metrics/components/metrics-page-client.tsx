'use client';

import * as React from 'react';
import { ActivitySquare } from 'lucide-react';

import { BarMetricChart, LineMetricChart } from '@/components/ui/metric-chart';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetPerformanceMetrics } from '../hooks/use-get-performance-metrics';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function MetricsPageClient() {
  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());

  const metricsQuery = useGetPerformanceMetrics(month, year);

  if (metricsQuery.isPending) {
    return <LoadingSkeleton rows={6} columns={3} />;
  }

  if (!metricsQuery.data || metricsQuery.errorMessage) {
    return (
      <EmptyState
        icon={ActivitySquare}
        title="Performance dashboard unavailable"
        description={metricsQuery.errorMessage ?? 'Metrics data is not available yet.'}
      />
    );
  }

  const metrics = metricsQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-background/95 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
              Performance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Metrics dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Compare production momentum, premium flow, and commission trends for the selected
              reporting period.
            </p>
          </div>
          <MonthYearPicker
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Active agents</CardDescription>
            <CardTitle>{metrics.summary.activeAgents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total API</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalApi)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total premium</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalModalPremium)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total commission</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalCommission)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">API trend</CardTitle>
            <CardDescription>Monthly API movement across the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineMetricChart
              data={metrics.points.map((point) => ({ label: point.label, value: point.api }))}
              formatValue={formatCurrency}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Commission by period</CardTitle>
            <CardDescription>Commission totals by reporting label.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarMetricChart
              data={metrics.points.map((point) => ({
                label: point.label,
                value: point.commissionAmount,
              }))}
              formatValue={formatCurrency}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
