'use client';

import * as React from 'react';
import { Activity, ChartColumnBig, Sparkles, Trophy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { useGetPerformanceMetrics } from '@/features/metrics/hooks/use-get-performance-metrics';
import { useGetPerformanceLeaderboard } from '@/features/metrics/hooks/use-get-performance-leaderboard';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PerformancePageClient() {
  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const metricsQuery = useGetPerformanceMetrics(month, year);
  const leaderboardQuery = useGetPerformanceLeaderboard(month, year);

  if (metricsQuery.isPending) {
    return <LoadingSkeleton rows={5} columns={3} />;
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

  const metrics = metricsQuery.data;
  const leaderboardRows = leaderboardQuery.data?.rows.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Performance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Live branch performance
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Real API, premium, and commission totals for the selected reporting window, plus
              strongest months based on actual imported metrics.
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
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Active agents</CardDescription>
            <CardTitle>{metrics.summary.activeAgents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total API</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalApi)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total premium</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalModalPremium)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total commission</CardDescription>
            <CardTitle>{formatCurrency(metrics.summary.totalCommission)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2">
                <Trophy className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Agent leaderboard rollup</CardTitle>
                <CardDescription>Live score built from API, premium, commission, recruitment, and lapsation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaderboardRows.map((row, index) => (
              <div
                key={row.agentId}
                className="flex items-center justify-between rounded-[24px] border border-white/40 bg-background/70 p-4 dark:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient-soft font-semibold text-brand">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{row.agentName}</p>
                    <p className="text-sm text-muted-foreground">
                      Recruitment {row.recruitmentCount} | Lapsation {row.lapsationCount}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(row.score)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2">
                <Sparkles className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Selected period pulse</CardTitle>
                <CardDescription>Quick readout for the filtered reporting horizon.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.points.slice(-3).reverse().map((point) => (
              <div
                key={point.month}
                className="rounded-[24px] border border-white/40 bg-background/70 p-4 dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{point.label}</p>
                  <Activity className="h-4 w-4 text-brand" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  API {formatCurrency(point.api)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Premium {formatCurrency(point.modalPremium)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sum assured {formatCurrency(point.sumAssured)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
