'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronUp,
  FilePlus2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/services/api-client';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PolicyRecord {
  id: string;
  agentId: string | null;
  agentName: string;
  agentCode: string;
  clientName: string;
  policyNumber: string;
  productType: string | null;
  planCode: string | null;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: string;
  policyStatus: string;
  dateIssued: string | null;
  dateClosed: string | null;
  notes: string | null;
  branchCode: string;
  createdAt: string;
  updatedAt: string;
}

const CASE_STATUSES = ['Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned', 'Orphan'];
const POLICY_STATUSES = ['Active', 'Lapsed', 'Cancelled', 'Matured'];

function formatCurrency(value: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

// ─── Inline Edit / Create Form ────────────────────────────────────────────────
interface PolicyFormProps {
  agents: Array<{ id: string; displayName: string; agentCode: string }>;
  initial?: PolicyRecord;
  onCancel: () => void;
  onSaved: () => void;
}

function PolicyForm({ agents, initial, onCancel, onSaved }: PolicyFormProps) {
  const isEdit = !!initial;
  const [form, setForm] = React.useState({
    agentId: initial?.agentId ?? agents[0]?.id ?? '',
    firstName: initial ? initial.clientName.split(' ')[0] : '',
    lastName: initial ? initial.clientName.split(' ').slice(1).join(' ') : '',
    policyNumber: initial?.policyNumber ?? '',
    productType: initial?.productType ?? '',
    planCode: initial?.planCode ?? '',
    modalPremium: initial?.modalPremium ?? '0',
    api: initial?.api ?? '0',
    sumAssured: initial?.sumAssured ?? '0',
    commissionAmount: initial?.commissionAmount ?? '0',
    caseStatus: initial?.caseStatus ?? 'Uncontacted',
    policyStatus: initial?.policyStatus ?? 'Active',
    dateIssued: initial?.dateIssued ?? '',
    dateClosed: initial?.dateClosed ?? '',
    notes: initial?.notes ?? '',
    branchCode: initial?.branchCode ?? 'A1PRIME',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        modalPremium: Number(form.modalPremium),
        api: Number(form.api),
        sumAssured: Number(form.sumAssured),
        commissionAmount: Number(form.commissionAmount),
        dateIssued: form.dateIssued || null,
        dateClosed: form.dateClosed || null,
        notes: form.notes || null,
        productType: form.productType || undefined,
        planCode: form.planCode || undefined,
      };
      if (isEdit) {
        await api.patch(`/admin/policies/${initial!.id}`, payload);
      } else {
        await api.post('/admin/policies', payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Policy record updated.' : 'Policy record created.');
      void queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      onSaved();
    },
  });

  const field = (
    label: string,
    key: keyof typeof form,
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' = 'text',
    options?: string[],
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {type === 'select' ? (
        <select
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={String(form[key])}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        >
          {options!.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="min-h-[72px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
          value={String(form[key])}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={label}
        />
      ) : (
        <input
          type={type}
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={String(form[key])}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="rounded-[28px] border border-brand/20 bg-brand-gradient-soft p-6 shadow-soft">
      <p className="mb-5 text-sm font-semibold text-brand">
        {isEdit ? `Editing: ${initial!.policyNumber}` : 'New Policy Record'}
      </p>

      {/* Agent */}
      <div className="mb-4 flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Assigned Agent
        </label>
        <select
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={form.agentId}
          onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
          disabled={isEdit}
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} ({a.agentCode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field('First Name', 'firstName')}
        {field('Last Name', 'lastName')}
        {field('Policy Number', 'policyNumber')}
        {field('Product Type', 'productType')}
        {field('Plan Code', 'planCode')}
        {field('Branch Code', 'branchCode')}
        {field('Modal Premium (₱)', 'modalPremium', 'number')}
        {field('API (₱)', 'api', 'number')}
        {field('Sum Assured (₱)', 'sumAssured', 'number')}
        {field('Commission (₱)', 'commissionAmount', 'number')}
        {field('Case Status', 'caseStatus', 'select', CASE_STATUSES)}
        {field('Policy Status', 'policyStatus', 'select', POLICY_STATUSES)}
        {field('Date Issued', 'dateIssued', 'date')}
        {field('Date Closed', 'dateClosed', 'date')}
      </div>

      <div className="mt-3">
        {field('Notes', 'notes', 'textarea')}
      </div>

      <div className="mt-5 flex gap-3">
        <Button
          type="button"
          className="min-h-10 rounded-full"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add policy record'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 rounded-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminPolicyRecordsClient() {
  const [agentFilter, setAgentFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;
  const queryClient = useQueryClient();

  const agentsQuery = useGetAgents('');
  const agents = (agentsQuery.data?.data ?? []).map((a) => ({
    id: a.id,
    displayName: a.displayName,
    agentCode: a.agentCode,
  }));

  const policiesQuery = useQuery({
    queryKey: ['admin-policies', agentFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentFilter) params.set('agentId', agentFilter);
      if (search) params.set('search', search);
      const { data } = await api.get<{ data: PolicyRecord[] }>(`/admin/policies?${params.toString()}`);
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/policies/${id}`);
    },
    onSuccess: () => {
      toast.success('Policy record archived.');
      void queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
    },
  });

  const policies = policiesQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Policy Records
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          View, add, and edit every client policy record per agent. All changes are audit-logged.
        </p>
      </section>

      {/* Filters + Add button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filter & Search</CardTitle>
          <CardDescription>Filter by agent, or search by client name or policy number.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="min-h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by agent"
            >
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.agentCode})
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="min-h-11 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-sm"
                placeholder="Search client name or policy #…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              type="button"
              className="min-h-11 gap-2 rounded-full"
              onClick={() => { setShowCreate(true); setEditingId(null); }}
            >
              <FilePlus2 className="h-4 w-4" />
              Add Policy Record
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create form */}
      {showCreate && (
        <PolicyForm
          agents={agents}
          onCancel={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Policy Records{' '}
            {!policiesQuery.isPending && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({policies.length})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            One row per closed deal / client policy. Click ✏️ to edit inline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policiesQuery.isPending ? (
            <LoadingSkeleton rows={5} columns={6} />
          ) : policies.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No policy records"
              description="Select a different agent or add a new policy record above."
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/40 dark:border-white/10">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_1.2fr_1.4fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-white/20 bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10">
                <span>Client</span>
                <span>Policy #</span>
                <span>Agent</span>
                <span>API</span>
                <span>Case</span>
                <span>Policy</span>
                <span />
              </div>

              {policies.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((policy) => (
                <div key={policy.id} className="border-b border-white/10 last:border-0 dark:border-white/5">
                  {/* Main row */}
                  <div className="grid grid-cols-[2fr_1.2fr_1.4fr_1fr_1fr_1fr_auto] items-center gap-x-4 px-4 py-3 text-sm">
                    <p className="truncate font-medium text-foreground">{policy.clientName}</p>
                    <p className="truncate text-muted-foreground">{policy.policyNumber}</p>
                    <div>
                      <p className="truncate font-medium text-foreground">{policy.agentName}</p>
                      <p className="text-xs text-muted-foreground">{policy.agentCode}</p>
                    </div>
                    <p className="text-foreground">{formatCurrency(policy.api)}</p>
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
                      {policy.caseStatus}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      policy.policyStatus === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {policy.policyStatus}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === policy.id ? null : policy.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        title="Expand details"
                      >
                        {expandedId === policy.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(policy.id); setShowCreate(false); setExpandedId(null); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-brand"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Archive policy ${policy.policyNumber}?`)) {
                            deleteMutation.mutate(policy.id);
                          }
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                        title="Archive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === policy.id && (
                    <div className="grid gap-3 border-t border-white/10 bg-muted/20 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/5">
                      {[
                        ['Product', policy.productType ?? '—'],
                        ['Plan Code', policy.planCode ?? '—'],
                        ['Modal Premium', formatCurrency(policy.modalPremium)],
                        ['Sum Assured', formatCurrency(policy.sumAssured)],
                        ['Commission', formatCurrency(policy.commissionAmount)],
                        ['Branch', policy.branchCode],
                        ['Date Issued', policy.dateIssued ?? '—'],
                        ['Date Closed', policy.dateClosed ?? '—'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm text-foreground">{value}</p>
                        </div>
                      ))}
                      {policy.notes && (
                        <div className="sm:col-span-2 lg:col-span-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                          <p className="mt-1 text-sm text-foreground">{policy.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit form inline */}
                  {editingId === policy.id && (
                    <div className="border-t border-white/10 px-4 py-4 dark:border-white/5">
                      <PolicyForm
                        agents={agents}
                        initial={policy}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => setEditingId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {policies.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between p-4 border-t border-white/10 dark:border-white/5">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(policies.length / ITEMS_PER_PAGE)}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(policies.length / ITEMS_PER_PAGE), p + 1))} disabled={page >= Math.ceil(policies.length / ITEMS_PER_PAGE)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
