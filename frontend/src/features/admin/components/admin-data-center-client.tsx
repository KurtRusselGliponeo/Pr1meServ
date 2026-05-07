'use client';

import * as React from 'react';
import {
  BarChart3,
  ClipboardList,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/services/api-client';
import { AdminPolicyRecordsClient } from '@/features/admin/components/admin-policy-records-client';
import { AdminNapTransactionsClient } from '@/features/admin/components/admin-nap-transactions-client';
import { AdminRecruitmentsClient } from '@/features/admin/components/admin-recruitments-client';
import { PersistencyPageClient } from '@/features/admin/components/persistency-page-client';
import { PlanCodesPageClient } from '@/features/admin/components/plan-codes-page-client';

type TabId =
  | 'overview'
  | 'policies'
  | 'nap-transactions'
  | 'recruitment'
  | 'persistency'
  | 'plan-codes'
  | 'policy-status'
  | 'validation-issues'
  | 'reports';

const DATA_CENTER_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'policies', label: 'Policies' },
  { id: 'nap-transactions', label: 'NAP Transactions' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'persistency', label: 'Persistency' },
  { id: 'plan-codes', label: 'Plan Codes' },
  { id: 'policy-status', label: 'Policy Status' },
  { id: 'validation-issues', label: 'Validation Issues' },
  { id: 'reports', label: 'Reports' },
];

type SummaryResponse = {
  generatedAtUtc: string;
  cards: {
    policiesIssued: number;
    totalNap: number;
    totalApeApi: number;
    activeValidationIssues: number;
    lapsedOrAtRiskPolicies: number;
    recruitmentCount: number;
  };
};

type ValidationIssue = {
  id: string;
  module: string;
  entityName: string | null;
  entityId: string | null;
  issueCode: string;
  severity: 'info' | 'warning' | 'error';
  status: 'Open' | 'Resolved' | 'Ignored';
  details: string;
  recommendedFix: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  resolvedAtUtc: string | null;
  createdByName: string | null;
};

type ValidationIssueListResponse = {
  data: ValidationIssue[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type AuditFeedItem = {
  id: string;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAtUtc: string;
  actorName: string | null;
};

type AuditFeedResponse = {
  data: AuditFeedItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type EntityAuditTimelineResponse = {
  data: AuditFeedItem[];
};

const REPORT_TYPES = [
  { id: 'policy-list', label: 'Policy list' },
  { id: 'nap-transactions', label: 'NAP transactions' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'persistency', label: 'Persistency' },
  { id: 'lapsed-at-risk-policies', label: 'Lapsed / at-risk policies' },
  { id: 'agent-leaderboard', label: 'Agent leaderboard' },
  { id: 'branch-summary', label: 'Branch summary' },
] as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function severityClassName(severity: ValidationIssue['severity']) {
  if (severity === 'error') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (severity === 'warning') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
}

function statusClassName(status: ValidationIssue['status']) {
  if (status === 'Resolved') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'Ignored') return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

function OverviewPanel({ summary }: { summary: SummaryResponse['cards'] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" />
            Operational snapshot
          </CardTitle>
          <CardDescription>Live summary across manual policy, NAP, recruitment, and data-quality workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            ['Policies issued', String(summary.policiesIssued)],
            ['Total NAP', formatMoney(summary.totalNap)],
            ['Total APE/API', formatMoney(summary.totalApeApi)],
            ['Active validation issues', String(summary.activeValidationIssues)],
            ['Lapsed/at-risk policies', String(summary.lapsedOrAtRiskPolicies)],
            ['Recruitment count', String(summary.recruitmentCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-5 w-5" />
            Workspace guidance
          </CardTitle>
          <CardDescription>Centralized validation, audit, and export workflows now sit alongside module maintenance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use `Validation Issues` to triage production-safety problems with severity, entity links, and recommended fixes.</p>
          <p>Use `Policy Status` to inspect the admin audit feed and drill into entity timelines without leaving the workspace.</p>
          <p>Use `Reports` for app-native CSV exports only. The PRISM workbook remains reference-only and is not imported here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function EntityTimelineDialog({
  entity,
  onOpenChange,
}: {
  entity: { entityName: string; entityId: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const timelineQuery = useQuery({
    queryKey: ['admin-data-center-entity-audit', entity?.entityName, entity?.entityId],
    enabled: Boolean(entity),
    queryFn: async () => {
      const { data } = await api.get<EntityAuditTimelineResponse>(
        `/admin/data-center/audit-feed/${entity?.entityName}/${entity?.entityId}`,
      );
      return data;
    },
  });

  return (
    <Dialog open={Boolean(entity)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Entity audit timeline</DialogTitle>
          <DialogDescription>
            {entity ? `${entity.entityName} ${entity.entityId}` : 'Audit timeline'}
          </DialogDescription>
        </DialogHeader>
        {timelineQuery.isPending ? (
          <LoadingSkeleton rows={4} columns={1} />
        ) : timelineQuery.data?.data.length ? (
          <div className="space-y-3">
            {timelineQuery.data.data.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-4">
                <p className="font-medium text-foreground">{item.action}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(item.createdAtUtc)}
                  {item.actorName ? ` by ${item.actorName}` : ''}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Previous: {item.oldValue ? JSON.stringify(item.oldValue) : 'None'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Current: {item.newValue ? JSON.stringify(item.newValue) : 'None'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No audit events found" description="This entity does not have recorded audit entries yet." />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ValidationIssuesPanel() {
  const queryClient = useQueryClient();
  const [module, setModule] = React.useState('');
  const [severity, setSeverity] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const issuesQuery = useQuery({
    queryKey: ['admin-data-center-validation-issues', module, severity, status, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (module) params.set('module', module);
      if (severity) params.set('severity', severity);
      if (status) params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const { data } = await api.get<ValidationIssueListResponse>(`/admin/data-center/validation-issues?${params.toString()}`);
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: ValidationIssue['status'] }) => {
      const { data } = await api.patch(`/admin/data-center/validation-issues/${id}`, {
        status: nextStatus,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Validation issue marked as ${variables.nextStatus.toLowerCase()}.`);
      void queryClient.invalidateQueries({ queryKey: ['admin-data-center-validation-issues'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-data-center-summary'] });
    },
  });

  const issues = issuesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Validation issue triage</CardTitle>
          <CardDescription>Filter centralized issues by module, severity, status, and date, then resolve or ignore them with full entity linkage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-5">
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={module} onChange={(event) => setModule(event.target.value)}>
            <option value="">All modules</option>
            {['Policy', 'PlanCode', 'NAP', 'Recruitment', 'Persistency', 'PolicyStatus'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">All severities</option>
            {['info', 'warning', 'error'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['Open', 'Resolved', 'Ignored'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input type="date" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input type="date" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Open data-quality work</CardTitle>
          <CardDescription>{issuesQuery.data ? `${issuesQuery.data.meta.total} issues matched the current filters.` : 'Loading issues'}</CardDescription>
        </CardHeader>
        <CardContent>
          {issuesQuery.isPending ? (
            <LoadingSkeleton rows={5} columns={1} />
          ) : issues.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No validation issues found" description="No issues match the current filters." />
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div key={issue.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityClassName(issue.severity)}`}>{issue.severity}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(issue.status)}`}>{issue.status}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{issue.module}</span>
                  </div>
                  <p className="mt-3 font-medium text-foreground">{issue.issueCode}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{issue.details}</p>
                  <p className="mt-2 text-sm text-foreground">Recommended fix: {issue.recommendedFix ?? 'Review the linked entity and resolve the underlying data mismatch.'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Entity: {issue.entityName ?? 'Unknown'} {issue.entityId ?? ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDate(issue.createdAtUtc)}{issue.createdByName ? ` by ${issue.createdByName}` : ''}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={statusMutation.isPending || issue.status === 'Resolved'}
                      onClick={() => statusMutation.mutate({ id: issue.id, nextStatus: 'Resolved' })}
                    >
                      Resolve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusMutation.isPending || issue.status === 'Ignored'}
                      onClick={() => statusMutation.mutate({ id: issue.id, nextStatus: 'Ignored' })}
                    >
                      Ignore
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={statusMutation.isPending || issue.status === 'Open'}
                      onClick={() => statusMutation.mutate({ id: issue.id, nextStatus: 'Open' })}
                    >
                      Reopen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPanel() {
  const [entityName, setEntityName] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [selectedEntity, setSelectedEntity] = React.useState<{ entityName: string; entityId: string } | null>(null);

  const auditFeedQuery = useQuery({
    queryKey: ['admin-data-center-audit-feed', entityName, dateFrom],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', pageSize: '30' });
      if (entityName) params.set('entityName', entityName);
      if (dateFrom) params.set('dateFrom', dateFrom);
      const { data } = await api.get<AuditFeedResponse>(`/admin/data-center/audit-feed?${params.toString()}`);
      return data;
    },
  });

  const items = auditFeedQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin audit feed</CardTitle>
          <CardDescription>Review manual changes across policies, NAP, recruitment, persistency, plan codes, and status changes from one operational feed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={entityName} onChange={(event) => setEntityName(event.target.value)}>
            <option value="">All entities</option>
            {['Policy', 'NapTransaction', 'Recruitment', 'Persistency', 'PlanCode', 'DataValidationIssue'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input type="date" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <div className="flex items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
            Entity timelines can be opened directly from rows with linked IDs.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Timeline feed</CardTitle>
          <CardDescription>{auditFeedQuery.data ? `${auditFeedQuery.data.meta.total} events matched the current filters.` : 'Loading feed'}</CardDescription>
        </CardHeader>
        <CardContent>
          {auditFeedQuery.isPending ? (
            <LoadingSkeleton rows={5} columns={1} />
          ) : items.length === 0 ? (
            <EmptyState icon={TimerReset} title="No audit events found" description="No audit entries match the current filters." />
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.action}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.entityName}
                        {item.actorName ? ` by ${item.actorName}` : ''}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{formatDate(item.createdAtUtc)}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Previous: {item.oldValue ? JSON.stringify(item.oldValue) : 'None'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Current: {item.newValue ? JSON.stringify(item.newValue) : 'None'}</p>
                  {item.entityId ? (
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setSelectedEntity({ entityName: item.entityName, entityId: item.entityId! })}>
                      Open entity timeline
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EntityTimelineDialog entity={selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)} />
    </div>
  );
}

function ReportsPanel() {
  const downloadMutation = useMutation({
    mutationFn: async (reportType: string) => {
      const { data } = await api.get<string>(`/admin/data-center/reports/export?reportType=${encodeURIComponent(reportType)}`, {
        responseType: 'text' as never,
      });
      return { reportType, csv: data };
    },
    onSuccess: ({ reportType, csv }) => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV export ready.');
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Operational CSV exports</CardTitle>
          <CardDescription>Download app-native reports for policies, transactions, recruitment, persistency, risk, leaderboard, and branch summary. PDF output is intentionally omitted here because the current stack does not support it cleanly yet.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_TYPES.map((report) => (
            <div key={report.id} className="rounded-md border border-border p-4">
              <p className="font-medium text-foreground">{report.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">Exports current app data with role-aware scoping and no workbook import dependency.</p>
              <Button type="button" className="mt-4 gap-2" onClick={() => downloadMutation.mutate(report.id)} disabled={downloadMutation.isPending}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDataCenterClient() {
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const summaryQuery = useQuery({
    queryKey: ['admin-data-center-summary'],
    queryFn: async () => {
      const { data } = await api.get<SummaryResponse>('/admin/data-center/summary');
      return data;
    },
  });

  const cards = summaryQuery.data?.cards;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin Data Center</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Unified operational workspace</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
          Centralize manual PRU operations modules in one dense admin workspace for issued policies, NAP activity, recruitment, persistency, reference maintenance, validation, audit review, and reporting exports.
        </p>
      </section>

      {summaryQuery.isPending ? (
        <LoadingSkeleton rows={2} columns={3} />
      ) : summaryQuery.isError || !cards ? (
        <EmptyState icon={FileSpreadsheet} title="Unable to load Data Center summary" description="Refresh the page or try again after checking the admin APIs." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ['Policies issued', String(cards.policiesIssued)],
            ['Total NAP', formatMoney(cards.totalNap)],
            ['Total APE/API', formatMoney(cards.totalApeApi)],
            ['Validation issues', String(cards.activeValidationIssues)],
            ['Lapsed / At Risk', String(cards.lapsedOrAtRiskPolicies)],
            ['Recruitment count', String(cards.recruitmentCount)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Modules</CardTitle>
          <CardDescription>Choose a tab to work inside the Admin Data Center. Search and filters remain inside each module.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DATA_CENTER_TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' ? <OverviewPanel summary={cards ?? {
        policiesIssued: 0,
        totalNap: 0,
        totalApeApi: 0,
        activeValidationIssues: 0,
        lapsedOrAtRiskPolicies: 0,
        recruitmentCount: 0,
      }} /> : null}
      {activeTab === 'policies' ? <AdminPolicyRecordsClient /> : null}
      {activeTab === 'nap-transactions' ? <AdminNapTransactionsClient /> : null}
      {activeTab === 'recruitment' ? <AdminRecruitmentsClient /> : null}
      {activeTab === 'persistency' ? <PersistencyPageClient /> : null}
      {activeTab === 'plan-codes' ? <PlanCodesPageClient /> : null}
      {activeTab === 'policy-status' ? <AuditPanel /> : null}
      {activeTab === 'validation-issues' ? <ValidationIssuesPanel /> : null}
      {activeTab === 'reports' ? <ReportsPanel /> : null}
    </div>
  );
}
