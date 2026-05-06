'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, History, Search, ShieldAlert } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import api from '@/services/api-client';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import { useGetLapsationDashboard } from '../hooks/use-get-lapsation-dashboard';
import { useReinstateLapsationRecord } from '../hooks/use-reinstate-lapsation-record';
import type { LapsationRecordSummary } from '../types/lapsation.types';
import { LapsationResolutionDialog } from './lapsation-resolution-dialog';
import { NapApeManualEntry } from './nap-ape-manual-entry';
import { PolicyStatusActionDialog } from './policy-status-action-dialog';

function formatCurrency(value: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function statusTone(status: string) {
  if (status === 'Reinstated' || status === 'Active') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'At Risk') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
}

const FOLLOW_UP_STATUSES = ['Open', 'In Progress', 'Resolved', 'Dismissed'] as const;

export function LapsationPageClient() {
  const { user, isHydrated } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [branchCode, setBranchCode] = React.useState('');
  const [agentId, setAgentId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [followUpStatus, setFollowUpStatus] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState<LapsationRecordSummary | null>(null);
  const [statusRecord, setStatusRecord] = React.useState<LapsationRecordSummary | null>(null);
  const canManage = isHydrated && (user?.role === 'Admin' || user?.role === 'BranchManager');
  const agentsQuery = useGetAgents('', true);

  const dashboardQuery = useGetLapsationDashboard({
    search: search.trim() || undefined,
    branchCode: branchCode.trim() || undefined,
    agentId: agentId || undefined,
    status: status || undefined,
    followUpStatus: followUpStatus || undefined,
  });

  const reinstateMutation = useReinstateLapsationRecord();
  const updateStatusMutation = useMutation({
    mutationFn: async (input: {
      policyId: string;
      status: string;
      reason: string;
      notes: string;
      followUpStatus: string;
    }) => {
      const { data } = await api.patch(`/lapsation/policies/${input.policyId}/status`, {
        status: input.status,
        reason: input.reason,
        notes: input.notes || null,
        followUpStatus: input.followUpStatus,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success('Policy status updated.');
      setStatusRecord(null);
      await queryClient.invalidateQueries({ queryKey: ['lapsation'] });
    },
  });

  const handleResolutionSubmit = React.useCallback(
    async (policyId: string, values: { resolutionNote: string }) => {
      await reinstateMutation.mutateAsync({
        policyId,
        reason: 'Policy reinstated',
        notes: values.resolutionNote,
      });
      setSelectedRecord(null);
      toast.success('Policy reinstated and follow-up queue updated.');
      await queryClient.invalidateQueries({ queryKey: ['lapsation'] });
    },
    [queryClient, reinstateMutation],
  );

  if (dashboardQuery.isPending) {
    return <LoadingSkeleton rows={6} columns={5} />;
  }

  if (!dashboardQuery.data || dashboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Policy status dashboard unavailable"
        description={dashboardQuery.errorMessage ?? 'Policy status data is not available yet.'}
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const queueLabel =
    user?.role === 'Agent'
      ? 'Your follow-up queue'
      : user?.role === 'BranchManager'
        ? 'Branch policy follow-up queue'
        : 'Global policy follow-up queue';

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Policy Lifecycle</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Status and lapsation automation
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Track at-risk, lapsed, reinstated, and cancelled policies with scoped follow-up ownership, audit-backed status history, and reinstatement actions.
        </p>
      </section>

      {canManage ? <NapApeManualEntry /> : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="rounded-[28px] bg-brand-gradient-soft"><CardDescription>Total tracked</CardDescription><CardTitle>{dashboard.summary.totalTracked}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="rounded-[28px] bg-brand-gradient-soft"><CardDescription>At risk</CardDescription><CardTitle>{dashboard.summary.atRiskCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="rounded-[28px] bg-brand-gradient-soft"><CardDescription>Lapsed</CardDescription><CardTitle>{dashboard.summary.lapsedCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="rounded-[28px] bg-brand-gradient-soft"><CardDescription>Reinstated YTD</CardDescription><CardTitle>{dashboard.summary.reinstatedYtd}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>Filter by policy, branch, agent, lifecycle status, and follow-up state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm"
              placeholder="Search policy, client, or agent"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {user?.role === 'Admin' ? (
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Branch code"
              value={branchCode}
              onChange={(event) => setBranchCode(event.target.value)}
            />
          ) : null}
          {user?.role !== 'Agent' ? (
            <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              <option value="">All agents</option>
              {(agentsQuery.data?.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} ({agent.agentCode})
                </option>
              ))}
            </select>
          ) : null}
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['At Risk', 'Lapsed', 'Reinstated', 'Cancelled', 'Active'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={followUpStatus} onChange={(event) => setFollowUpStatus(event.target.value)}>
            <option value="">All follow-up states</option>
            {FOLLOW_UP_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {dashboard.records.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No policy lifecycle alerts found"
          description="No policies match the current filters in your allowed scope."
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2">
                <ShieldAlert className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">{queueLabel}</CardTitle>
                <CardDescription>
                  Role-scoped lifecycle alerts with follow-up state, lapse dates, and reinstatement actions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 text-sm text-muted-foreground dark:border-white/10">
                    <th className="pb-3 pr-4">Policy</th>
                    <th className="pb-3 pr-4">Agent</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Follow-up</th>
                    <th className="pb-3 pr-4">Changed</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20 dark:divide-white/10">
                  {dashboard.records.map((record) => (
                    <tr key={record.id}>
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-foreground">{record.policyNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.clientName} | {formatCurrency(record.modalPremium)}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <p>{record.assignedAgentName}</p>
                        <p className="text-xs text-muted-foreground">{record.branchCode}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4">{record.followUpStatus}</td>
                      <td className="py-4 pr-4 text-xs text-muted-foreground">
                        {new Date(record.statusChangedAtUtc).toLocaleString()}
                        {record.daysSinceLapse !== null ? ` | ${record.daysSinceLapse} days since lapse` : ''}
                      </td>
                      <td className="py-4 pr-4">{record.reason ?? '-'}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canManage ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => setStatusRecord(record)}>
                              Update status
                            </Button>
                          ) : null}
                          {canManage && record.status !== 'Reinstated' ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={reinstateMutation.isPending}
                              onClick={() => setSelectedRecord(record)}
                            >
                              Reinstate
                            </Button>
                          ) : null}
                        </div>
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
        recordId={selectedRecord?.policyId ?? null}
        policyNumber={selectedRecord?.policyNumber ?? null}
        clientName={selectedRecord?.clientName ?? null}
        isPending={reinstateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null);
          }
        }}
        onSubmit={(policyId, values) => handleResolutionSubmit(policyId, values)}
      />

      <PolicyStatusActionDialog
        open={Boolean(statusRecord)}
        policyNumber={statusRecord?.policyNumber ?? null}
        initialStatus={statusRecord?.status ?? 'At Risk'}
        isPending={updateStatusMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setStatusRecord(null);
          }
        }}
        onSubmit={async (values) => {
          if (!statusRecord) return;
          await updateStatusMutation.mutateAsync({
            policyId: statusRecord.policyId,
            ...values,
          });
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-gradient-soft p-2">
              <History className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-xl">Status timeline</CardTitle>
              <CardDescription>
                Recent At Risk, Lapsed, Reinstated, and Cancelled events in your allowed scope.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.timeline.length === 0 ? (
            <EmptyState
              icon={History}
              title="No lifecycle history yet"
              description="Status changes will appear here once policies move through the follow-up workflow."
            />
          ) : (
            <div className="space-y-3">
              {dashboard.timeline.slice(0, 12).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-[24px] border border-white/30 bg-background/70 px-4 py-3 dark:border-white/10"
                >
                  <div>
                    <p className="font-semibold text-foreground">{event.policyNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.eventType}
                      {event.reason ? ` | ${event.reason}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.effectiveAtUtc).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
