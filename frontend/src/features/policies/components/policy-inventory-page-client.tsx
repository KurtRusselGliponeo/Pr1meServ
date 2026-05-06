'use client';

import * as React from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
import { useAuth } from '@/features/identity/context/auth-context';
import api from '@/services/api-client';

interface PolicyListItem {
  id: string;
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
  };
}

function formatCurrency(value: string, currency: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusClassName(status: string) {
  if (status === 'Active' || status === 'Reinstated') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'Pending' || status === 'At Risk') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
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
    queryKey: ['policy-detail', policyId],
    enabled: open && Boolean(policyId),
    queryFn: async () => {
      const { data } = await api.get<PolicyDetailResponse>(`/policies/${policyId}`);
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Policy detail</DialogTitle>
          <DialogDescription>Review issued business details and policy status history.</DialogDescription>
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
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Modal Premium</p><p className="mt-2 text-xl font-semibold">{formatCurrency(detailQuery.data.modalPremium, detailQuery.data.currency)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Sum Assured</p><p className="mt-2 text-xl font-semibold">{formatCurrency(detailQuery.data.sumAssured, detailQuery.data.currency)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">API</p><p className="mt-2 text-xl font-semibold">{formatCurrency(detailQuery.data.api, detailQuery.data.currency)}</p></CardContent></Card>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Status history</h3>
              <div className="mt-3 space-y-3">
                {detailQuery.data.timeline.statusHistory.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3">
                    <p className="font-medium">{item.previousStatus ? `${item.previousStatus} -> ${item.nextStatus}` : item.nextStatus}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.effectiveAtUtc).toLocaleString()}
                      {item.changedByName ? ` by ${item.changedByName}` : ''}
                    </p>
                    {item.reason ? <p className="mt-2 text-sm">{item.reason}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={FileSpreadsheet} title="Unable to load policy detail" description="Try again from the inventory list." />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PolicyInventoryPageClient() {
  const { user } = useAuth();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [detailPolicyId, setDetailPolicyId] = React.useState<string | null>(null);
  const deferredSearch = React.useDeferredValue(search.trim());

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const policiesQuery = useQuery({
    queryKey: ['policy-inventory', page, deferredSearch],
    queryFn: async () => {
      const { data } = await api.get<PolicyListResponse>('/policies', {
        params: {
          page,
          pageSize: 15,
          search: deferredSearch || undefined,
        },
      });

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const records = policiesQuery.data?.data ?? [];
  const meta = policiesQuery.data?.meta;
  const scopeLabel =
    user?.role === 'Agent'
      ? 'Your assigned policies'
      : user?.role === 'BranchManager'
        ? 'Branch policies'
        : 'All issued policies';

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Policy Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{scopeLabel}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Search and review issued business records in your allowed scope, including policy status and core financial values.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Policies</CardTitle>
          <CardDescription>Search by policy number, client name, life insured, or assigned agent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm"
              placeholder="Search policies"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {policiesQuery.isPending ? (
            <LoadingSkeleton rows={8} columns={6} />
          ) : records.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No policies found"
              description="No policy records match the current search in your allowed scope."
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="min-w-[1020px] w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>
                      {['Policy', 'Client', 'Agent', 'Plan', 'API', 'Status', 'Updated', 'Actions'].map((header) => (
                        <th key={header} className="px-3 py-2 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((policy) => (
                      <tr key={policy.id} className="border-t border-border">
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.policyNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(policy.modalPremium, policy.currency)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.policyOwnerName ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{policy.lifeInsuredName ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.agentName ?? 'Unassigned'}</p>
                          <p className="text-xs text-muted-foreground">{policy.agentCode ?? policy.branchCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{policy.planCode ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{policy.planName ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">{formatCurrency(policy.api, policy.currency)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(policy.policyStatus)}`}>
                            {policy.policyStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(policy.updatedAtUtc).toLocaleDateString()}</td>
                        <td className="px-3 py-3">
                          <Button type="button" variant="outline" size="sm" onClick={() => setDetailPolicyId(policy.id)}>
                            Detail
                          </Button>
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
                  <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((current) => current + 1)}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
