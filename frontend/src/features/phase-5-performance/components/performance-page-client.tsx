'use client';

import * as React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartColumnBig,
  Minus,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LineMetricChart } from '@/components/ui/metric-chart';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { ChartCardSkeleton } from '@/components/ui/panel-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetPerformanceMetrics } from '@/features/phase-5-performance/hooks/use-get-performance-metrics';
import { useGetPerformanceLeaderboard } from '@/features/phase-5-performance/hooks/use-get-performance-leaderboard';

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

function getTrend(current: number, previous: number) {
  const delta = current - previous;

  if (Math.abs(delta) < 0.001) {
    return {
      icon: Minus,
      className: 'text-muted-foreground',
      label: 'Flat vs previous period',
      delta: 0,
    };
  }

  return delta > 0
    ? {
        icon: ArrowUpRight,
        className: 'text-emerald-600 dark:text-emerald-400',
        label: 'Up vs previous period',
        delta,
      }
    : {
        icon: ArrowDownRight,
        className: 'text-rose-600 dark:text-rose-400',
        label: 'Down vs previous period',
        delta,
      };
}

function PerformanceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="h-3 w-32 animate-pulse rounded-full bg-muted/70" />
            <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-muted/70" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/70" />
          </div>
          <div className="h-11 w-52 animate-pulse rounded-full bg-muted/70" />
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3 rounded-[28px] bg-brand-gradient-soft">
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted/70" />
              <div className="h-8 w-32 animate-pulse rounded-full bg-muted/70" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-muted/70" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <ChartCardSkeleton titleWidth="w-72" descriptionWidth="w-96" heightClassName="h-72" />
        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded-full bg-muted/70" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-muted/70" />
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[28px] border border-white/40 bg-background/70 p-4 dark:border-white/10">
              <div className="grid grid-cols-4 gap-4 border-b border-white/20 pb-4 dark:border-white/10">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`performance-header-${index}`} className="h-4 animate-pulse rounded-full bg-muted/70" />
                ))}
              </div>
              <div className="space-y-4 py-4">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div key={`performance-row-${rowIndex}`} className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((__, columnIndex) => (
                      <div key={`performance-cell-${rowIndex}-${columnIndex}`} className="h-5 animate-pulse rounded-full bg-muted/70" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  trend,
}: {
  label: string;
  value: string;
  helper: string;
  trend: ReturnType<typeof getTrend>;
}) {
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
        <div className={`inline-flex items-center gap-1 text-sm font-medium ${trend.className}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{helper}</span>
        </div>
      </CardHeader>
    </Card>
  );
}

export function PerformancePageClient() {
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
    return <PerformanceDashboardSkeleton />;
  }

  if (!metricsQuery.data || metricsQuery.errorMessage) {
    return (
      <EmptyState
        icon={ChartColumnBig}
        title="Performance view unavailable"
        description={metricsQuery.errorMessage ?? 'Performance data is not available yet.'}
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
  const leaderboardRows = leaderboardQuery.data.rows.slice(0, 5);
  const points = metrics.points.slice(-6);
  const latestPoint = points.at(-1);
  const previousPoint = points.at(-2);
  const apeCurrent = latestPoint?.api ?? 0;
  const apePrevious = previousPoint?.api ?? 0;
  const apeTrend = getTrend(apeCurrent, apePrevious);
  const persistencyCurrent = calculatePersistency(leaderboardQuery.data.rows);
  const persistencyPrevious = calculatePersistency(previousLeaderboardQuery.data?.rows ?? []);
  const persistencyTrend = getTrend(persistencyCurrent, persistencyPrevious);
  const hasNoMetrics =
    metrics.points.length === 0 &&
    metrics.summary.totalApi === 0 &&
    metrics.summary.totalModalPremium === 0 &&
    metrics.summary.totalCommission === 0;

  if (hasNoMetrics) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No performance metrics recorded yet"
        description="This agent or branch does not have imported production metrics for the selected period."
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
              Unified agent performance dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Track APE momentum, branch persistency, and the current leaderboard with responsive
              visuals backed by live metrics queries.
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
        <KpiCard
          label="APE"
          value={formatCurrency(apeCurrent)}
          helper={`${apeTrend.delta >= 0 ? '+' : ''}${formatCurrency(Math.abs(apeTrend.delta))} vs previous period`}
          trend={apeTrend}
        />
        <KpiCard
          label="Persistency"
          value={formatPercent(persistencyCurrent)}
          helper={`${persistencyTrend.delta >= 0 ? '+' : ''}${formatPercent(Math.abs(persistencyTrend.delta))} vs previous month`}
          trend={persistencyTrend}
        />
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total premium</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalModalPremium)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selected period premium flow across imported records.
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Active agents</CardDescription>
            <CardTitle>{metrics.summary.activeAgents}</CardTitle>
            <p className="text-sm text-muted-foreground">Agents contributing metrics this year.</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">APE trend over the last 6 months</CardTitle>
            <CardDescription>
              Responsive line visualization of monthly APE movement for the current reporting
              horizon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <EmptyState
                icon={ChartColumnBig}
                title="No APE history yet"
                description="Import performance metrics to render the six-month APE trend."
              />
            ) : (
              <LineMetricChart
                data={points.map((point: (typeof points)[number]) => ({
                  label: point.label,
                  value: point.api,
                }))}
                formatValue={formatCurrency}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2">
                <Trophy className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Branch leaderboard</CardTitle>
                <CardDescription>
                  Simplified ranking table populated from the performance leaderboard query.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboardRows.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No rankings available"
                description="There are no leaderboard rows for the selected month yet."
              />
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-white/40 bg-background/70 dark:border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>APE</TableHead>
                      <TableHead>Persistency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboardRows.map(
                      (row: (typeof leaderboardRows)[number], index: number) => (
                      <TableRow key={row.agentId}>
                        <TableCell className="font-semibold text-brand">#{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{row.agentName}</p>
                            <p className="text-xs text-muted-foreground">
                              Recruits {row.recruitmentCount} | Lapsation {row.lapsationCount}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(row.api)}</TableCell>
                        <TableCell>{formatPercent(Math.max(0, (1 - row.lapsationRate) * 100))}</TableCell>
                      </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
