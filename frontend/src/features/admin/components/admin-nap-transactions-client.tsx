'use client';

import * as React from 'react';
import { FilePlus2, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NapTransactionType } from '@a1prime/schemas';

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
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import api from '@/services/api-client';

const TRANSACTION_TYPES: NapTransactionType[] = [
  'Issued',
  'Lapsed',
  'Reinstated',
  'Cooling Off',
  'Increase/Decrease',
  'Cancelled',
  'Other',
];

interface NapTransactionRecord {
  id: string;
  policyId: string | null;
  policyNumber: string;
  accountType: string | null;
  contractTypeCode: string | null;
  typeDesc: string | null;
  transactionDate: string;
  tempReceiptDate: string | null;
  agentId: string;
  agentCode: string | null;
  agentName: string | null;
  branchCode: string | null;
  api: string;
  ccCredit: number | null;
  transactionType: string;
  creditStatus: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface NapTransactionListResponse {
  data: NapTransactionRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface NapTransactionDetail extends NapTransactionRecord {
  history: {
    auditEvents: Array<{
      id: string;
      action: string;
      timestampUtc: string;
      actorName: string | null;
    }>;
    policyEffects: Array<{
      id: string;
      effectType: string;
      effectiveAtUtc: string | null;
      status: string | null;
    }>;
  };
}

interface PolicyLookupResult {
  data: Array<{
    id: string;
    policyNumber: string;
    policyOwnerName: string | null;
    planCode: string | null;
    agentName: string | null;
    assignedAgentId: string | null;
    branchCode: string;
  }>;
}

interface FormValues {
  policyNumber: string;
  policyId: string;
  accountType: string;
  contractTypeCode: string;
  typeDesc: string;
  transactionDate: string;
  tempReceiptDate: string;
  agentId: string;
  branchCode: string;
  api: string;
  ccCredit: string;
  transactionType: NapTransactionType;
  creditStatus: string;
  notes: string;
}

function toFormValues(record?: NapTransactionRecord | null): FormValues {
  return {
    policyNumber: record?.policyNumber ?? '',
    policyId: record?.policyId ?? '',
    accountType: record?.accountType ?? '',
    contractTypeCode: record?.contractTypeCode ?? '',
    typeDesc: record?.typeDesc ?? '',
    transactionDate: record?.transactionDate ? record.transactionDate.slice(0, 16) : '',
    tempReceiptDate: record?.tempReceiptDate ? record.tempReceiptDate.slice(0, 16) : '',
    agentId: record?.agentId ?? '',
    branchCode: record?.branchCode ?? '',
    api: record?.api ?? '0',
    ccCredit: record?.ccCredit ? String(record.ccCredit) : '',
    transactionType: (record?.transactionType as NapTransactionType | null) ?? 'Issued',
    creditStatus: record?.creditStatus ?? '',
    notes: record?.notes ?? '',
  };
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function PolicyLookupHint({
  policyNumber,
  onSelect,
}: {
  policyNumber: string;
  onSelect: (record: PolicyLookupResult['data'][number]) => void;
}) {
  const lookupQuery = useQuery({
    queryKey: ['nap-policy-lookup', policyNumber],
    enabled: policyNumber.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get<PolicyLookupResult>(
        `/admin/policies?search=${encodeURIComponent(policyNumber.trim())}&page=1&pageSize=5`,
      );
      return data.data;
    },
  });

  if (!policyNumber.trim()) {
    return null;
  }

  if (lookupQuery.isPending) {
    return <p className="text-xs text-muted-foreground">Looking up policy...</p>;
  }

  if (!lookupQuery.data || lookupQuery.data.length === 0) {
    return <p className="text-xs text-amber-700 dark:text-amber-300">No matching policy found yet.</p>;
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Policy lookup</p>
      {lookupQuery.data.map((item) => (
        <button
          key={item.id}
          type="button"
          className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
          onClick={() => onSelect(item)}
        >
          <p className="font-medium">{item.policyNumber}</p>
          <p className="text-xs text-muted-foreground">
            {item.policyOwnerName ?? 'Unknown owner'} | {item.agentName ?? 'Unassigned'} | {item.branchCode}
          </p>
        </button>
      ))}
    </div>
  );
}

function NapTransactionFormDialog({
  open,
  onOpenChange,
  initialRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecord?: NapTransactionRecord | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<FormValues>(() => toFormValues(initialRecord));
  const [details, setDetails] = React.useState<string[]>([]);
  const agentsQuery = useGetAgents('', open);

  React.useEffect(() => {
    setForm(toFormValues(initialRecord));
    setDetails([]);
  }, [initialRecord, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        policyId: form.policyId || undefined,
        policyNumber: form.policyNumber,
        accountType: form.accountType || undefined,
        contractTypeCode: form.contractTypeCode || undefined,
        typeDesc: form.typeDesc || undefined,
        transactionDate: new Date(form.transactionDate).toISOString(),
        tempReceiptDate: form.tempReceiptDate ? new Date(form.tempReceiptDate).toISOString() : undefined,
        agentId: form.agentId || undefined,
        branchCode: form.branchCode || undefined,
        api: Number(form.api),
        ccCredit: form.ccCredit ? Number(form.ccCredit) : undefined,
        transactionType: form.transactionType,
        creditStatus: form.creditStatus || undefined,
        notes: form.notes || null,
      };

      if (initialRecord) {
        const { data } = await api.patch<NapTransactionDetail>(
          `/admin/nap-transactions/${initialRecord.id}`,
          payload,
        );
        return data;
      }

      const { data } = await api.post<NapTransactionDetail>('/admin/nap-transactions', payload);
      return data;
    },
    onSuccess: () => {
      toast.success(initialRecord ? 'NAP transaction updated.' : 'NAP transaction created.');
      void queryClient.invalidateQueries({ queryKey: ['admin-nap-transactions'] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setDetails(
        (error as { response?: { data?: { details?: string[] } } })?.response?.data?.details ?? [],
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialRecord ? 'Edit NAP transaction' : 'Add NAP transaction'}</DialogTitle>
          <DialogDescription>
            Manual NAP entries link to a policy, apply policy effects, and update monthly metrics.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Policy number</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.policyNumber}
              onChange={(event) => setForm((current) => ({ ...current, policyNumber: event.target.value }))}
            />
          </label>

          <div className="md:col-span-2">
            <PolicyLookupHint
              policyNumber={form.policyNumber}
              onSelect={(record) =>
                setForm((current) => ({
                  ...current,
                  policyId: record.id,
                  policyNumber: record.policyNumber,
                  agentId: current.agentId || record.assignedAgentId || '',
                  branchCode: current.branchCode || record.branchCode,
                }))
              }
            />
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Account type</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.accountType}
              onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Contract type code</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.contractTypeCode}
              onChange={(event) => setForm((current) => ({ ...current, contractTypeCode: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Type description</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.typeDesc}
              onChange={(event) => setForm((current) => ({ ...current, typeDesc: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Transaction type</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.transactionType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  transactionType: event.target.value as NapTransactionType,
                }))
              }
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Transaction date</span>
            <input
              type="datetime-local"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.transactionDate}
              onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Temp receipt date</span>
            <input
              type="datetime-local"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.tempReceiptDate}
              onChange={(event) => setForm((current) => ({ ...current, tempReceiptDate: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Agent</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.agentId}
              onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}
            >
              <option value="">Resolve from policy</option>
              {(agentsQuery.data?.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} ({agent.agentCode})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Branch</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.branchCode}
              onChange={(event) => setForm((current) => ({ ...current, branchCode: event.target.value }))}
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
            <span className="font-medium">CC credit</span>
            <input
              type="number"
              min="0"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.ccCredit}
              onChange={(event) => setForm((current) => ({ ...current, ccCredit: event.target.value }))}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Credit status</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.creditStatus}
              onChange={(event) => setForm((current) => ({ ...current, creditStatus: event.target.value }))}
            />
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

        {details.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : initialRecord ? 'Save changes' : 'Create transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NapTransactionDetailDialog({
  transactionId,
  open,
  onOpenChange,
}: {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ['admin-nap-transaction-detail', transactionId],
    enabled: open && Boolean(transactionId),
    queryFn: async () => {
      const { data } = await api.get<NapTransactionDetail>(`/admin/nap-transactions/${transactionId}`);
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>NAP transaction detail</DialogTitle>
          <DialogDescription>Review transaction history, audit events, and related policy effects.</DialogDescription>
        </DialogHeader>

        {detailQuery.isPending ? (
          <LoadingSkeleton rows={4} columns={2} />
        ) : detailQuery.data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Policy', detailQuery.data.policyNumber],
                ['Transaction type', detailQuery.data.transactionType],
                ['Agent', detailQuery.data.agentName ?? '-'],
                ['Branch', detailQuery.data.branchCode ?? '-'],
                ['API', formatCurrency(detailQuery.data.api)],
                ['Credit status', detailQuery.data.creditStatus ?? '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Policy effects</h3>
                {detailQuery.data.history.policyEffects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No policy effects recorded.</p>
                ) : (
                  detailQuery.data.history.policyEffects.map((effect) => (
                    <div key={effect.id} className="rounded-md border border-border p-3">
                      <p className="font-medium">{effect.effectType}</p>
                      <p className="text-sm text-muted-foreground">
                        {effect.effectiveAtUtc ? new Date(effect.effectiveAtUtc).toLocaleString() : 'No effective date'}
                      </p>
                      <p className="mt-1 text-sm">Status: {effect.status ?? 'N/A'}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Audit events</h3>
                {detailQuery.data.history.auditEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit events recorded.</p>
                ) : (
                  detailQuery.data.history.auditEvents.map((event) => (
                    <div key={event.id} className="rounded-md border border-border p-3">
                      <p className="font-medium">{event.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestampUtc).toLocaleString()}
                        {event.actorName ? ` by ${event.actorName}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={FilePlus2} title="Unable to load transaction detail" description="Try reopening this record." />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminNapTransactionsClient() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [agentId, setAgentId] = React.useState('');
  const [branchCode, setBranchCode] = React.useState('');
  const [transactionType, setTransactionType] = React.useState('');
  const [creditStatus, setCreditStatus] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [editingRecord, setEditingRecord] = React.useState<NapTransactionRecord | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const agentsQuery = useGetAgents('', true);

  React.useEffect(() => {
    setPage(1);
  }, [search, agentId, branchCode, transactionType, creditStatus, dateFrom]);

  const transactionsQuery = useQuery({
    queryKey: ['admin-nap-transactions', page, search, agentId, branchCode, transactionType, creditStatus, dateFrom],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });
      if (search.trim()) params.set('search', search.trim());
      if (agentId) params.set('agentId', agentId);
      if (branchCode.trim()) params.set('branchCode', branchCode.trim());
      if (transactionType) params.set('transactionType', transactionType);
      if (creditStatus.trim()) params.set('creditStatus', creditStatus.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);

      const { data } = await api.get<NapTransactionListResponse>(`/admin/nap-transactions?${params.toString()}`);
      return data;
    },
  });

  const records = transactionsQuery.data?.data ?? [];
  const meta = transactionsQuery.data?.meta;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Manual NAP Transactions
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Enter app-native NAP transactions, apply policy effects, and keep monthly production metrics in sync.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Search and filters</CardTitle>
          <CardDescription>Filter by policy, agent, branch, transaction type, date, and credit status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm"
              placeholder="Search policy, account type, description, or agent"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">All agents</option>
            {(agentsQuery.data?.data ?? []).map((agent) => (
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

          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>
            <option value="">All transaction types</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Credit status"
            value={creditStatus}
            onChange={(event) => setCreditStatus(event.target.value)}
          />

          <input
            type="date"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />

          <Button type="button" className="h-11 gap-2 rounded-full" onClick={() => { setEditingRecord(null); setShowForm(true); }}>
            <FilePlus2 className="h-4 w-4" />
            Add transaction
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">NAP transaction records</CardTitle>
          <CardDescription>
            {meta ? `Showing ${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}` : 'Loading records'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsQuery.isPending ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : records.length === 0 ? (
            <EmptyState icon={FilePlus2} title="No NAP transactions found" description="Try another filter combination or add a manual NAP transaction." />
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>
                      {['Policy', 'Agent', 'Type', 'Transaction Date', 'API', 'Credit', 'Branch', 'Actions'].map((header) => (
                        <th key={header} className="px-3 py-2 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-t border-border">
                        <td className="px-3 py-3">
                          <p className="font-medium">{record.policyNumber}</p>
                          <p className="text-xs text-muted-foreground">{record.typeDesc ?? record.accountType ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{record.agentName ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{record.agentCode ?? '-'}</p>
                        </td>
                        <td className="px-3 py-3">{record.transactionType}</td>
                        <td className="px-3 py-3">{new Date(record.transactionDate).toLocaleString()}</td>
                        <td className="px-3 py-3">{formatCurrency(record.api)}</td>
                        <td className="px-3 py-3">{record.creditStatus ?? '-'}</td>
                        <td className="px-3 py-3">{record.branchCode ?? '-'}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(record.id)}>
                              Detail
                            </Button>
                            <Button type="button" size="sm" onClick={() => { setEditingRecord(record); setShowForm(true); }}>
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

      <NapTransactionFormDialog open={showForm} onOpenChange={setShowForm} initialRecord={editingRecord} />
      <NapTransactionDetailDialog
        transactionId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
          }
        }}
      />
    </div>
  );
}
