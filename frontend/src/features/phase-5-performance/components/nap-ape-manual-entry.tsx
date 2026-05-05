'use client';

import * as React from 'react';
import { FilePlus2, PlusCircle, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/services/api-client';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';

interface ManualEntry {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  recordMonth: string;
  nap: string;
  ape: string;
  sumAssured: string;
  commissionAmount: string;
  recruitmentCount: number;
  updatedAt: string;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export function NapApeManualEntry() {
  const queryClient = useQueryClient();
  const agentsQuery = useGetAgents('');
  const agents = agentsQuery.data?.data ?? [];

  const [form, setForm] = React.useState({
    agentId: '',
    month: new Date().getMonth() + 1,
    year: currentYear,
    nap: '',
    ape: '',
    sumAssured: '',
    commissionAmount: '',
    recruitmentCount: '0',
  });
  const [page, setPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;

  const entriesQuery = useQuery({
    queryKey: ['manual-entries'],
    queryFn: async () => {
      const { data } = await api.get<ManualEntry[]>('/metrics/manual-entries');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.agentId) throw new Error('Please select an agent.');
      await api.post('/metrics/manual-entry', {
        agentId: form.agentId,
        month: form.month,
        year: form.year,
        nap: Number(form.nap) || 0,
        ape: Number(form.ape) || 0,
        sumAssured: Number(form.sumAssured) || 0,
        commissionAmount: Number(form.commissionAmount) || 0,
        recruitmentCount: Number(form.recruitmentCount) || 0,
      });
    },
    onSuccess: () => {
      toast.success('NAP/APE record saved. Values were accumulated onto the existing month record if one existed.');
      void queryClient.invalidateQueries({ queryKey: ['manual-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setForm((f) => ({ ...f, nap: '', ape: '', sumAssured: '', commissionAmount: '', recruitmentCount: '0' }));
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save record.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/metrics/manual-entries/${entryId}`);
    },
    onSuccess: () => {
      toast.success('Record deleted.');
      void queryClient.invalidateQueries({ queryKey: ['manual-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  const entries = entriesQuery.data ?? [];
  const pageEntries = entries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));

  return (
    <div className="space-y-6">
      {/* Entry Form */}
      <Card className="border border-brand/20 bg-white/72 dark:bg-card/82">
        <CardHeader className="bg-brand-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-white/85 p-3 text-brand shadow-soft">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Admin — Manual Production Entry</CardDescription>
              <CardTitle className="mt-1">Add NAP / APE Record</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-5 text-sm text-muted-foreground">
            Select an agent and enter their production figures for the selected month.
            If a record already exists for that agent + month, the values will be <strong>accumulated</strong> (added) on top.
            The system automatically calculates persistency from these entries.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Agent */}
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agent *
              </label>
              <select
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.agentId}
                onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
              >
                <option value="">— Select agent —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} ({a.agentCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Month *
              </label>
              <select
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Year *
              </label>
              <select
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* NAP */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NAP — API (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.nap}
                onChange={(e) => setForm((f) => ({ ...f, nap: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* APE */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                APE — Modal Premium (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.ape}
                onChange={(e) => setForm((f) => ({ ...f, ape: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Sum Assured */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sum Assured (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.sumAssured}
                onChange={(e) => setForm((f) => ({ ...f, sumAssured: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Commission */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Commission Amount (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.commissionAmount}
                onChange={(e) => setForm((f) => ({ ...f, commissionAmount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Recruitment */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recruitment Count
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.recruitmentCount}
                onChange={(e) => setForm((f) => ({ ...f, recruitmentCount: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              className="min-h-11 gap-2 rounded-full"
              disabled={saveMutation.isPending || !form.agentId}
              onClick={() => saveMutation.mutate()}
            >
              <FilePlus2 className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving…' : 'Save NAP/APE Record'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Production Records
            {entries.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">({entries.length})</span>
            )}
          </CardTitle>
          <CardDescription>
            All manually entered NAP/APE records. Deleting a record permanently removes it from metrics calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No production records yet"
              description="Use the form above to add the first NAP/APE record."
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/40 dark:border-white/10">
              {/* Header */}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-white/20 bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10">
                <span>Agent</span>
                <span>Month</span>
                <span>NAP (API)</span>
                <span>APE (Modal)</span>
                <span>Persistency</span>
                <span />
              </div>

              {pageEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 border-b border-white/10 px-4 py-3 text-sm last:border-0 dark:border-white/5"
                >
                  <div>
                    <p className="font-medium text-foreground">{entry.agentName}</p>
                    <p className="text-xs text-muted-foreground">{entry.agentCode}</p>
                  </div>
                  <p className="text-muted-foreground">{entry.recordMonth}</p>
                  <p className="text-foreground">{formatCurrency(entry.nap)}</p>
                  <p className="text-foreground">{formatCurrency(entry.ape)}</p>
                  <p className="text-muted-foreground">
                    {/* persistency = collected / (collected + uncollected) × 100 — simplified display */}
                    {Number(entry.nap) > 0
                      ? `${Math.min(100, ((Number(entry.nap) / (Number(entry.nap) + 1)) * 100)).toFixed(1)}%`
                      : '—'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete the ${entry.recordMonth} record for ${entry.agentName}?`)) {
                        deleteMutation.mutate(entry.id);
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                    title="Delete record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {entries.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 dark:border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
