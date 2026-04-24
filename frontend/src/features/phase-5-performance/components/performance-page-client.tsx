'use client';

import * as React from 'react';
import { ActivitySquare, Download, LineChart, Trophy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LineMetricChart } from '@/components/ui/metric-chart';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { ChartCardSkeleton } from '@/components/ui/panel-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/identity/context/auth-context';
import { useDownloadPerformanceReport } from '../hooks/use-download-performance-report';
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

function PerformanceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <ChartCardSkeleton titleWidth="w-80" descriptionWidth="w-96" heightClassName="h-40" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted/70" />
              <div className="h-8 w-28 animate-pulse rounded-full bg-muted/70" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCardSkeleton titleWidth="w-56" descriptionWidth="w-72" heightClassName="h-72" />
        <ChartCardSkeleton titleWidth="w-56" descriptionWidth="w-72" heightClassName="h-72" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </CardHeader>
    </Card>
  );
}

export function PerformancePageClient() {
  const now = new Date();
  const { user } = useAuth();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const metricsQuery = useGetPerformanceMetrics(month, year);
  const leaderboardQuery = useGetPerformanceLeaderboard(month, year);
  const downloadReportMutation = useDownloadPerformanceReport();
  const canDownload = user?.role === 'Admin' || user?.role === 'BranchManager';

  if (metricsQuery.isPending || leaderboardQuery.isPending) {
    return <PerformanceDashboardSkeleton />;
  }

  if (!metricsQuery.data || metricsQuery.errorMessage) {
    return (
      <EmptyState
        icon={ActivitySquare}
        title="Performance dashboard unavailable"
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
  const leaderboard = leaderboardQuery.data;
  const points = metrics.points.slice(-6);
  const hasNoMetrics =
    metrics.summary.totalNap === 0 &&
    metrics.summary.totalApe === 0 &&
    metrics.summary.totalSales === 0 &&
    leaderboard.rows.length === 0;

  if (hasNoMetrics) {
    return (
      <EmptyState
        icon={LineChart}
        title="No performance metrics recorded yet"
        description="Import NAP, PER, APE, and REC data to populate the Phase 8 performance views."
      />
    );
  }

  const handleDownload = async () => {
    try {
      await downloadReportMutation.mutateAsync({ month, year });
      toast.success('Performance report download started.');
    } catch {
      toast.error(downloadReportMutation.errorMessage ?? 'Unable to download the report.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Performance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Lapsation, production, and report analytics
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review total sales, persistency, lapsation, reinstatement, recruitment, and monthly
              comparisons from the same scoped dataset used for branch and admin reporting.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MonthYearPicker
              month={month}
              year={year}
              onMonthChange={setMonth}
              onYearChange={setYear}
            />
            {canDownload ? (
              <Button type="button" onClick={handleDownload} disabled={downloadReportMutation.isPending}>
                <Download className="mr-2 h-4 w-4" />
                Download report
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Sales"
          value={formatCurrency(metrics.summary.totalSales)}
          helper="Commission-backed sales for the selected month."
        />
        <KpiCard
          label="NAP"
          value={formatCurrency(metrics.summary.totalNap)}
          helper="Imported NAP production for the selected month."
        />
        <KpiCard
          label="APE"
          value={formatCurrency(metrics.summary.totalApe)}
          helper="Imported APE production for the selected month."
        />
        <KpiCard
          label="Persistency"
          value={formatPercent(metrics.summary.persistencyRate)}
          helper="Average scoped persistency across visible agents."
        />
        <KpiCard
          label="Recruitment"
          value={String(metrics.summary.totalRecruitment)}
          helper="Recruitment count included in the same reporting scope."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Monthly trend comparison</CardTitle>
            <CardDescription>
              Six-month trend line for NAP production in the current role scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineMetricChart
              data={points.map((point) => ({ label: point.label, value: point.api }))}
              formatValue={formatCurrency}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Persistency comparison</CardTitle>
            <CardDescription>
              Monthly persistency trend to compare branch or agent consistency over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineMetricChart
              data={points.map((point) => ({
                label: point.label,
                value: point.persistencyRate,
              }))}
              formatValue={formatPercent}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Agent leaderboard and drill-down</CardTitle>
            <CardDescription>
              {user?.role === 'Admin'
                ? 'Cross-branch ranking across all visible agents.'
                : user?.role === 'BranchManager'
                  ? 'Branch-scoped ranking limited to your own branch.'
                  : 'Your own scoped production and lapsation performance.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[28px] border border-white/40 bg-background/70 dark:border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>NAP</TableHead>
                    <TableHead>APE</TableHead>
                    <TableHead>Persistency</TableHead>
                    <TableHead>Lapsation</TableHead>
                    <TableHead>Reinstated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.rows.map((row, index) => (
                    <TableRow key={row.agentId}>
                      <TableCell className="font-semibold text-brand">#{index + 1}</TableCell>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell>{row.branchCode}</TableCell>
                      <TableCell>{formatCurrency(row.api)}</TableCell>
                      <TableCell>{formatCurrency(row.modalPremium)}</TableCell>
                      <TableCell>{formatPercent(row.persistencyRate)}</TableCell>
                      <TableCell>{row.lapsationCount}</TableCell>
                      <TableCell>{row.reinstatementCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Scope summary</CardTitle>
            <CardDescription>
              Total at-risk, lapsed, reinstated, and recruited values for this reporting slice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">At risk</span>
              <span className="font-semibold">{metrics.summary.atRiskCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lapsed</span>
              <span className="font-semibold">{metrics.summary.lapsedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reinstated</span>
              <span className="font-semibold">{metrics.summary.reinstatementCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active agents</span>
              <span className="font-semibold">{metrics.summary.activeAgents}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {leaderboard.branches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Branch comparison</CardTitle>
            <CardDescription>
              BranchManager remains scoped to a single branch; Admin can compare branches side by side.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[28px] border border-white/40 bg-background/70 dark:border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Persistency</TableHead>
                    <TableHead>Lapsation</TableHead>
                    <TableHead>Reinstated</TableHead>
                    <TableHead>Recruitment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.branches.map((row) => (
                    <TableRow key={row.branchCode}>
                      <TableCell>{row.branchCode}</TableCell>
                      <TableCell>{formatCurrency(row.totalSales)}</TableCell>
                      <TableCell>{formatPercent(row.persistencyRate)}</TableCell>
                      <TableCell>{row.lapsationCount}</TableCell>
                      <TableCell>{row.reinstatementCount}</TableCell>
                      <TableCell>{row.totalRecruitment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
