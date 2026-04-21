'use client';

import * as React from 'react';
import { ActivitySquare, ArrowDownRight, ArrowUpRight, Minus, Trophy } from 'lucide-react';

import { BarMetricChart, LineMetricChart } from '@/components/ui/metric-chart';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetPerformanceLeaderboard } from '../hooks/use-get-performance-leaderboard';
import { useGetPerformanceMetrics } from '../hooks/use-get-performance-metrics';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getPreviousMonth(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }

  return { month: month - 1, year };
}

function calculatePersistency(rows: Array<{ lapsationRate: number }>) {
  if (!rows.length) {
    return 0;
  }

  const averageLapsationRate =
    rows.reduce((total, row) => total + row.lapsationRate, 0) / rows.length;

  return Math.max(0, (1 - averageLapsationRate) * 100);
}

function KpiMetricCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string;
  delta: number;
}) {
  const TrendIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const trendClass =
    delta > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : delta < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
        <CardDescription>{title}</CardDescription>
        <CardTitle>{value}</CardTitle>
        <div className={`inline-flex items-center gap-1 text-sm font-medium ${trendClass}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{delta === 0 ? 'Flat vs previous period' : `${delta > 0 ? '+' : ''}${title === 'Persistency' ? formatPercent(Math.abs(delta)) : formatCurrency(Math.abs(delta))} vs previous period`}</span>
        </div>
      </CardHeader>
    </Card>
  );
}

function MetricsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton rows={4} columns={3} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3">
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <LoadingSkeleton rows={4} columns={2} />
        <LoadingSkeleton rows={4} columns={2} />
      </div>
      <LoadingSkeleton rows={5} columns={4} />
    </div>
  );
}

export function MetricsPageClient() {
  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const previousPeriod = React.useMemo(() => getPreviousMonth(month, year), [month, year]);

  const metricsQuery = useGetPerformanceMetrics(month, year);
  const leaderboardQuery = useGetPerformanceLeaderboard(month, year);
  const previousLeaderboardQuery = useGetPerformanceLeaderboard(previousPeriod.month, previousPeriod.year);

  if (
    metricsQuery.isPending ||
    leaderboardQuery.isPending ||
    previousLeaderboardQuery.isPending
  ) {
    return <MetricsDashboardSkeleton />;
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

  if (!leaderboardQuery.data || leaderboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={Trophy}
        title="Leaderboard unavailable"
        description={leaderboardQuery.errorMessage ?? 'Leaderboard data is not available yet.'}
      />
    );
  }

  const metrics = metricsQuery.data;
  const points = metrics.points.slice(-6);
  const latestPoint = points.at(-1);
  const previousPoint = points.at(-2);
  const apeCurrent = latestPoint?.api ?? 0;
  const apePrevious = previousPoint?.api ?? 0;
  const persistencyCurrent = calculatePersistency(leaderboardQuery.data.rows);
  const persistencyPrevious = calculatePersistency(previousLeaderboardQuery.data?.rows ?? []);
  const hasNoMetrics =
    metrics.points.length === 0 &&
    leaderboardQuery.data.rows.length === 0 &&
    metrics.summary.totalApi === 0;

  if (hasNoMetrics) {
    return (
      <EmptyState
        icon={ActivitySquare}
        title="No recorded metrics for this period"
        description="Performance charts will appear once imported production records are available."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Performance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Metrics dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Compare APE growth, commission flow, and branch rankings through responsive charts
              built on the live metrics and leaderboard queries.
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
        <KpiMetricCard title="APE" value={formatCurrency(apeCurrent)} delta={apeCurrent - apePrevious} />
        <KpiMetricCard
          title="Persistency"
          value={formatPercent(persistencyCurrent)}
          delta={persistencyCurrent - persistencyPrevious}
        />
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total commission</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalCommission)}</CardTitle>
            <p className="text-sm text-muted-foreground">Selected period commission payout.</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total premium</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalModalPremium)}</CardTitle>
            <p className="text-sm text-muted-foreground">Imported modal premium for the period.</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">APE trend line</CardTitle>
            <CardDescription>Responsive six-month line chart for APE growth.</CardDescription>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <EmptyState
                icon={ActivitySquare}
                title="No APE history available"
                description="This period does not have historical APE points to chart yet."
              />
            ) : (
              <LineMetricChart
                data={points.map((point) => ({ label: point.label, value: point.api }))}
                formatValue={formatCurrency}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Commission trend</CardTitle>
            <CardDescription>Monthly commission movement for the same 6-month window.</CardDescription>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <EmptyState
                icon={ActivitySquare}
                title="No commission data available"
                description="Import performance records to render the commission chart."
              />
            ) : (
              <BarMetricChart
                data={points.map((point) => ({
                  label: point.label,
                  value: point.commissionAmount,
                }))}
                formatValue={formatCurrency}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Branch ranking table</CardTitle>
          <CardDescription>
            Simplified leaderboard view fed by the `useGetPerformanceLeaderboard` hook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardQuery.data.rows.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No leaderboard entries yet"
              description="Once agents have metrics for the selected month, rankings will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-white/40 bg-background/70 dark:border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>APE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardQuery.data.rows.map((row, index) => (
                    <TableRow key={row.agentId}>
                      <TableCell className="font-semibold text-brand">#{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{row.agentName}</p>
                          <p className="text-xs text-muted-foreground">
                            Persistency {formatPercent(Math.max(0, (1 - row.lapsationRate) * 100))}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(row.score)}</TableCell>
                      <TableCell>{formatCurrency(row.api)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
