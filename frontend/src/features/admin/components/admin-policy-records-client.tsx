'use client';

import * as React from 'react';
import { FilePlus2, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PolicyMode, PolicyStatus } from '@a1prime/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { usePlanCodes } from '@/features/admin/hooks/use-plan-codes';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import api from '@/services/api-client';

const POLICY_STATUSES: PolicyStatus[] = [
  'Active',
  'At Risk',
  'Lapsed',
  'Reinstated',
  'Cancelled',
  'Matured',
  'Pending',
];
const POLICY_MODES: PolicyMode[] = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single', 'Other'];

interface PolicyListItem {
  id: string;
  clientProfileId: string | null;
  assignedAgentId: string | null;
  agentCode: string | null;
  agentName: string | null;
  branchCode: string;
  policyNumber: string;
  policyOwnerName: string | null;
  lifeInsuredName: string | null;
  planCode: string | null;
  planName: string | null;
  currency: string;
  firstIssueDate: string | null;
  mode: string | null;
  modalPremium: string;
  sumAssured: string;
  api: string;
  policyStatus: string;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  validationIssues: string[];
}

interface PolicyListResponse {
  data: PolicyListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface PolicyDetailResponse extends PolicyListItem {
  timeline: {
    statusHistory: Array<{
      id: string;
      previousStatus: string | null;
      nextStatus: string;
      effectiveAtUtc: string;
      reason: string | null;
      notes: string | null;
      changedByName: string | null;
    }>;
    auditEvents: Array<{
      id: string;
      action: string;
      timestampUtc: string;
      actorName: string | null;
    }>;
  };
}

interface PolicyFormValues {
  assignedAgentId: string;
  policyNumber: string;
  policyOwnerName: string;
  lifeInsuredName: string;
  branchCode: string;
  planCode: string;
  planName: string;
  currency: string;
  firstIssueDate: string;
  mode: PolicyMode;
  modalPremium: string;
  sumAssured: string;
  api: string;
  policyStatus: PolicyStatus;
  notes: string;
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString();
}

function policyStatusClasses(status: string) {
  if (status === 'Active' || status === 'Reinstated') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (status === 'Pending' || status === 'At Risk') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
}

function toFormValues(policy?: PolicyListItem): PolicyFormValues {
  return {
    assignedAgentId: policy?.assignedAgentId ?? '',
    policyNumber: policy?.policyNumber ?? '',
    policyOwnerName: policy?.policyOwnerName ?? '',
    lifeInsuredName: policy?.lifeInsuredName ?? '',
    branchCode: policy?.branchCode ?? '',
    planCode: policy?.planCode ?? '',
    planName: policy?.planName ?? '',
    currency: policy?.currency ?? 'PHP',
    firstIssueDate: policy?.firstIssueDate ?? '',
    mode: (policy?.mode as PolicyMode | null) ?? 'Monthly',
    modalPremium: policy?.modalPremium ?? '0',
    sumAssured: policy?.sumAssured ?? '0',
    api: policy?.api ?? '0',
    policyStatus: (policy?.policyStatus as PolicyStatus | null) ?? 'Active',
    notes: policy?.notes ?? '',
  };
}

function PolicyFormDialog({
  open,
  onOpenChange,
  initialPolicy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPolicy?: PolicyListItem | null;
}) {
  const queryClient = useQueryClient();
  const agentsQuery = useGetAgents('', open);
  const planCodesQuery = usePlanCodes({ search: '', classification: '', includeInactive: false });
  const [form, setForm] = React.useState<PolicyFormValues>(() => toFormValues(initialPolicy ?? undefined));
  const [validationIssues, setValidationIssues] = React.useState<string[]>([]);

  React.useEffect(() => {
    setForm(toFormValues(initialPolicy ?? undefined));
    setValidationIssues([]);
  }, [initialPolicy, open]);

  const planCodes = planCodesQuery.data ?? [];
  const agents = agentsQuery.data?.data ?? [];

  React.useEffect(() => {
    if (!form.planCode) {
      return;
    }

    const plan = planCodes.find((item) => item.planCode === form.planCode);
    if (plan) {
      setForm((current) => ({ ...current, planName: plan.planName }));
    }
  }, [form.planCode, planCodes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        assignedAgentId: form.assignedAgentId || undefined,
        policyNumber: form.policyNumber,
        policyOwnerName: form.policyOwnerName || undefined,
        lifeInsuredName: form.lifeInsuredName || undefined,
        branchCode: form.branchCode,
        planCode: form.planCode || undefined,
        planName: form.planName || undefined,
        currency: form.currency,
        firstIssueDate: form.firstIssueDate || undefined,
        mode: form.mode,
        modalPremium: Number(form.modalPremium),
        sumAssured: Number(form.sumAssured),
        api: Number(form.api),
        policyStatus: form.policyStatus,
        notes: form.notes || null,
      };

      if (initialPolicy) {
        const { data } = await api.patch<PolicyDetailResponse>(`/admin/policies/${initialPolicy.id}`, payload);
        return data;
      }

      const { data } = await api.post<PolicyDetailResponse>('/admin/policies', payload);
      return data;
    },
    onSuccess: () => {
      toast.success(initialPolicy ? 'Policy updated.' : 'Policy created.');
      void queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const nextIssues =
        (error as { response?: { data?: { details?: string[] } } })?.response?.data?.details ?? [];
      setValidationIssues(nextIssues);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialPolicy ? 'Edit policy' : 'Add issued policy'}</DialogTitle>
          <DialogDescription>
            Admin manually enters issued business data. Plan and agent selections are validated before save.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Assigned agent</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.assignedAgentId}
              onChange={(event) => setForm((current) => ({ ...current, assignedAgentId: event.target.value }))}
            >
              <option value="">Select agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} ({agent.agentCode})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Policy number</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.policyNumber}
              onChange={(event) => setForm((current) => ({ ...current, policyNumber: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Policy owner / client name</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.policyOwnerName}
              onChange={(event) => setForm((current) => ({ ...current, policyOwnerName: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Life insured</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.lifeInsuredName}
              onChange={(event) => setForm((current) => ({ ...current, lifeInsuredName: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Branch code</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.branchCode}
              onChange={(event) => setForm((current) => ({ ...current, branchCode: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Plan code</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.planCode}
              onChange={(event) => setForm((current) => ({ ...current, planCode: event.target.value }))}
            >
              <option value="">Select plan code</option>
              {planCodes.map((plan) => (
                <option key={plan.id} value={plan.planCode}>
                  {plan.planCode} - {plan.planName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Plan name</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-muted px-3"
              value={form.planName}
              onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Currency</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.currency}
              onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">First issue date</span>
            <input
              type="date"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.firstIssueDate}
              onChange={(event) => setForm((current) => ({ ...current, firstIssueDate: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Mode</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.mode}
              onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as PolicyMode }))}
            >
              {POLICY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Modal premium</span>
            <input
              type="number"
              min="0"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.modalPremium}
              onChange={(event) => setForm((current) => ({ ...current, modalPremium: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Sum assured</span>
            <input
              type="number"
              min="0"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.sumAssured}
              onChange={(event) => setForm((current) => ({ ...current, sumAssured: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">API</span>
            <input
              type="number"
              min="0"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.api}
              onChange={(event) => setForm((current) => ({ ...current, api: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Policy status</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.policyStatus}
              onChange={(event) =>
                setForm((current) => ({ ...current, policyStatus: event.target.value as PolicyStatus }))
              }
            >
              {POLICY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>

        {validationIssues.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {validationIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : initialPolicy ? 'Save changes' : 'Create policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyDetailDialog({
  policyId,
  open,
  onOpenChange,
}: {
  policyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ['admin-policy-detail', policyId],
    enabled: open && Boolean(policyId),
    queryFn: async () => {
      const { data } = await api.get<PolicyDetailResponse>(`/admin/policies/${policyId}`);
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Policy detail</DialogTitle>
          <DialogDescription>Status history and audit trail for this issued policy.</DialogDescription>
        </DialogHeader>

        {detailQuery.isPending ? (
          <LoadingSkeleton rows={4} columns={2} />
        ) : detailQuery.data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Policy number', detailQuery.data.policyNumber],
                ['Policy owner', detailQuery.data.policyOwnerName ?? '-'],
                ['Life insured', detailQuery.data.lifeInsuredName ?? '-'],
                ['Assigned agent', detailQuery.data.agentName ?? '-'],
                ['Branch', detailQuery.data.branchCode],
                ['Plan', detailQuery.data.planCode ? `${detailQuery.data.planCode} - ${detailQuery.data.planName ?? ''}` : '-'],
                ['Issue date', formatDate(detailQuery.data.firstIssueDate)],
                ['Mode', detailQuery.data.mode ?? '-'],
                ['Status', detailQuery.data.policyStatus],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Modal Premium</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatMoney(detailQuery.data.modalPremium, detailQuery.data.currency)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Sum Assured</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatMoney(detailQuery.data.sumAssured, detailQuery.data.currency)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">API</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatMoney(detailQuery.data.api, detailQuery.data.currency)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Status history</h3>
                {detailQuery.data.timeline.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
                ) : (
                  detailQuery.data.timeline.statusHistory.map((item) => (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <p className="font-medium text-foreground">
                        {item.previousStatus ? `${item.previousStatus} -> ${item.nextStatus}` : item.nextStatus}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.effectiveAtUtc).toLocaleString()}
                        {item.changedByName ? ` by ${item.changedByName}` : ''}
                      </p>
                      {item.reason ? <p className="mt-2 text-sm">{item.reason}</p> : null}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Audit timeline</h3>
                {detailQuery.data.timeline.auditEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
                ) : (
                  detailQuery.data.timeline.auditEvents.map((item) => (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <p className="font-medium text-foreground">{item.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.timestampUtc).toLocaleString()}
                        {item.actorName ? ` by ${item.actorName}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FilePlus2}
            title="Unable to load policy detail"
            description="Try reopening the policy record."
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminPolicyRecordsClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [agentId, setAgentId] = React.useState('');
  const [branchCode, setBranchCode] = React.useState('');
  const [planCode, setPlanCode] = React.useState('');
  const [policyStatus, setPolicyStatus] = React.useState('');
  const [issuedFrom, setIssuedFrom] = React.useState('');
  const [editingPolicy, setEditingPolicy] = React.useState<PolicyListItem | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [detailPolicyId, setDetailPolicyId] = React.useState<string | null>(null);

  const agentsQuery = useGetAgents('', true);
  const planCodesQuery = usePlanCodes({ search: '', classification: '', includeInactive: false });

  const policiesQuery = useQuery({
    queryKey: ['admin-policies', page, search, agentId, branchCode, planCode, policyStatus, issuedFrom],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });

      if (search.trim()) params.set('search', search.trim());
      if (agentId) params.set('agentId', agentId);
      if (branchCode.trim()) params.set('branchCode', branchCode.trim());
      if (planCode) params.set('planCode', planCode);
      if (policyStatus) params.set('policyStatus', policyStatus);
      if (issuedFrom) params.set('issuedFrom', issuedFrom);

      const { data } = await api.get<PolicyListResponse>(`/admin/policies?${params.toString()}`);
      return data;
    },
  });

  React.useEffect(() => {
    setPage(1);
  }, [search, agentId, branchCode, planCode, policyStatus, issuedFrom]);

  const records = policiesQuery.data?.data ?? [];
  const meta = policiesQuery.data?.meta;
  const agents = agentsQuery.data?.data ?? [];
  const plans = planCodesQuery.data ?? [];

  React.useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Manual Policy / Issued Business
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Manage manually entered issued policies, validate plan and agent assignments, and review status/audit timelines.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Search and filters</CardTitle>
          <CardDescription>Filter by policy number, client, agent, branch, plan code, status, and issue date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm"
              placeholder="Search policy number, client, life insured, or agent"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">All agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.displayName} ({agent.agentCode})
              </option>
            ))}
          </select>

          <input
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Branch code"
            value={branchCode}
            onChange={(event) => setBranchCode(event.target.value)}
          />

          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={planCode} onChange={(event) => setPlanCode(event.target.value)}>
            <option value="">All plan codes</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.planCode}>
                {plan.planCode}
              </option>
            ))}
          </select>

          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={policyStatus} onChange={(event) => setPolicyStatus(event.target.value)}>
            <option value="">All statuses</option>
            {POLICY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={issuedFrom}
            onChange={(event) => setIssuedFrom(event.target.value)}
          />

          <Button type="button" className="h-11 gap-2 rounded-full" onClick={() => { setEditingPolicy(null); setShowForm(true); }}>
            <FilePlus2 className="h-4 w-4" />
            Add policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Issued policy records</CardTitle>
          <CardDescription>
            {meta ? `Showing ${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}` : 'Loading records'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policiesQuery.isPending ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : records.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No policies found"
              description="Try another filter combination or add a manual issued policy."
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>
                      {['Policy', 'Client', 'Agent', 'Plan', 'Premiums', 'Status', 'Validation', 'Actions'].map((header) => (
                        <th key={header} className="px-3 py-2 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((policy) => (
                      <tr key={policy.id} className="border-t border-border align-top">
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.policyNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(policy.firstIssueDate)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.policyOwnerName ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">Life insured: {policy.lifeInsuredName ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.agentName ?? 'Unassigned'}</p>
                          <p className="text-xs text-muted-foreground">{policy.agentCode ?? policy.branchCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.planCode ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{policy.planName ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p>{formatMoney(policy.modalPremium, policy.currency)}</p>
                          <p className="text-xs text-muted-foreground">API {formatMoney(policy.api, policy.currency)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${policyStatusClasses(policy.policyStatus)}`}>
                            {policy.policyStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {policy.validationIssues.length === 0 ? (
                            <span className="text-xs text-emerald-700 dark:text-emerald-300">No issues</span>
                          ) : (
                            policy.validationIssues.map((issue) => (
                              <p key={issue} className="text-xs text-amber-700 dark:text-amber-300">{issue}</p>
                            ))
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setDetailPolicyId(policy.id)}>
                              Detail
                            </Button>
                            <Button type="button" size="sm" onClick={() => { setEditingPolicy(policy); setShowForm(true); }}>
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <Button type="button" variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((current) => current - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <Button type="button" variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((current) => current + 1)}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <PolicyFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initialPolicy={editingPolicy}
      />
      <PolicyDetailDialog
        policyId={detailPolicyId}
        open={Boolean(detailPolicyId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPolicyId(null);
          }
        }}
      />
    </div>
  );
}
