'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import { useGetLapsationDashboard } from '../hooks/use-get-lapsation-dashboard';
import { useReinstateLapsationRecord } from '../hooks/use-reinstate-lapsation-record';
import type { LapsationRecordSummary } from '../types/lapsation.types';
import { LapsationResolutionDialog } from './lapsation-resolution-dialog';
import { NapUploadPortal } from './nap-upload-portal';

function formatCurrency(value: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function LapsationPageClient() {
  const { user, isHydrated } = useAuth();
  const searchParams = useSearchParams();
  const dashboardQuery = useGetLapsationDashboard();
  const reinstateMutation = useReinstateLapsationRecord();
  const [selectedRecord, setSelectedRecord] = React.useState<LapsationRecordSummary | null>(null);

  if (dashboardQuery.isPending) {
    return <LoadingSkeleton rows={6} columns={5} />;
  }

  if (!dashboardQuery.data || dashboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Lapsation dashboard unavailable"
        description={dashboardQuery.errorMessage ?? 'Lapsation data is not available yet.'}
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const isAdmin = isHydrated && user?.role === 'Admin';
  const activeFilter = searchParams.get('filter');
  const visibleRecords = dashboard.records.filter((record: (typeof dashboard.records)[number]) => {
    if (record.reinstatedAtUtc) {
      return false;
    }

    if (activeFilter === 'urgent') {
      return record.riskLevel === 'Urgent' || record.riskLevel === 'Lapsed';
    }

    return true;
  });

  const handleResolutionSubmit = React.useCallback(
    async (recordId: string) => {
      await reinstateMutation.mutateAsync(recordId);
      setSelectedRecord(null);
      toast.success('Lapsation resolved and removed from your active queue.');
      await dashboardQuery.refetch();
    },
    [dashboardQuery, reinstateMutation],
  );

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Lapsation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          At-risk and reinstatement tracker
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Monitor policies nearing lapse, review assigned ownership, and mark successful
          reinstatements from a live branch dashboard.
        </p>
      </section>

      {isAdmin ? <NapUploadPortal /> : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Total tracked</CardDescription>
            <CardTitle>{dashboard.summary.totalTracked}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>At risk</CardDescription>
            <CardTitle>{dashboard.summary.atRiskCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Live at risk</CardDescription>
            <CardTitle>{dashboard.summary.criticalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
            <CardDescription>Reinstated YTD</CardDescription>
            <CardTitle>{dashboard.summary.reinstatedYtd}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {visibleRecords.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No lapsation records found"
          description={
            activeFilter === 'urgent'
              ? 'Your urgent lapsation queue is clear right now.'
              : 'Import or create lapsation records to start tracking branch risk.'
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2">
                <ShieldAlert className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Pending lapsation action</CardTitle>
                <CardDescription>
                  Live records ordered by newest lapse date and ready for follow-up or
                  reinstatement.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20 text-sm text-muted-foreground dark:border-white/10">
                    <th className="pb-3 pr-4">Policy</th>
                    <th className="pb-3 pr-4">Agent</th>
                    <th className="pb-3 pr-4">Premium</th>
                    <th className="pb-3 pr-4">Days since lapse</th>
                    <th className="pb-3 pr-4">Risk</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20 dark:divide-white/10">
                  {visibleRecords.map((record: (typeof visibleRecords)[number]) => (
                    <tr key={record.id}>
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-foreground">{record.policyNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.clientName} | Open
                        </p>
                      </td>
                      <td className="py-4 pr-4">{record.assignedAgentName}</td>
                      <td className="py-4 pr-4">{formatCurrency(record.modalPremium)}</td>
                      <td className="py-4 pr-4">{record.daysSinceLapse} days</td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-brand">
                          {record.riskLevel}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          disabled={reinstateMutation.isPending}
                          onClick={() => setSelectedRecord(record)}
                        >
                          Resolve lapsation
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <LapsationResolutionDialog
        open={Boolean(selectedRecord)}
        recordId={selectedRecord?.id ?? null}
        policyNumber={selectedRecord?.policyNumber ?? null}
        clientName={selectedRecord?.clientName ?? null}
        isPending={reinstateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null);
          }
        }}
        onSubmit={(recordId) => handleResolutionSubmit(recordId)}
      />
    </div>
  );
}
