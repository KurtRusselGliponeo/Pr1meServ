'use client';

import * as React from 'react';
import { AlertTriangle, FilePlus2, Pencil, Search, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { LineMetricChart } from '@/components/ui/metric-chart';
import { PersistencyFormDialog } from '@/features/admin/components/persistency-form-dialog';
import { usePersistencyRecords } from '@/features/admin/hooks/use-persistency';
import type { PersistencyRecord } from '@/features/admin/types/persistency.types';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function PersistencyPageClient() {
  const [recordMonth, setRecordMonth] = React.useState(currentMonth());
  const [search, setSearch] = React.useState('');
  const [branchCode, setBranchCode] = React.useState('');
  const [agentType, setAgentType] = React.useState('');
  const [team, setTeam] = React.useState('');
  const [lowOnly, setLowOnly] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<PersistencyRecord | null>(null);

  const recordsQuery = usePersistencyRecords({
    recordMonth,
    search,
    agentId: '',
    branchCode,
    agentType,
    team,
    lowOnly,
  });
  const records = recordsQuery.data?.data ?? [];
  const lowCount = records.filter((record) => record.isLowPersistency).length;
  const averagePersistency =
    records.length === 0
      ? 0
      : records.reduce((total, record) => total + record.personalPersistency, 0) / records.length;

  const trendPoints = React.useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>();
    for (const record of records) {
      const bucket = grouped.get(record.recordMonth) ?? { total: 0, count: 0 };
      bucket.total += record.personalPersistency;
      bucket.count += 1;
      grouped.set(record.recordMonth, bucket);
    }
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, bucket]) => ({ label: month, value: bucket.total / bucket.count }));
  }, [records]);

  function openCreateDialog() {
    setEditingRecord(null);
    setDialogOpen(true);
  }

  function openEditDialog(record: PersistencyRecord) {
    setEditingRecord(record);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Admin Data Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Manual Persistency
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter monthly persistency records, monitor trend movement, and flag low performers.
            </p>
          </div>
          <Button type="button" onClick={openCreateDialog} className="gap-2">
            <FilePlus2 className="h-4 w-4" />
            Add persistency
          </Button>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Average personal persistency</CardDescription>
            <CardTitle>{formatPercent(averagePersistency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Low persistency warnings</CardDescription>
            <CardTitle>{lowCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Records in view</CardDescription>
            <CardTitle>{recordsQuery.data?.meta.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>Filter monthly records by agent, branch, team, or warning state.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Input type="month" value={recordMonth} onChange={(event) => setRecordMonth(event.target.value)} />
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search agent, code, branch, team"
                className="pl-9"
              />
            </div>
            <Input value={branchCode} onChange={(event) => setBranchCode(event.target.value)} placeholder="Branch" />
            <Input value={agentType} onChange={(event) => setAgentType(event.target.value)} placeholder="Agent type" />
            <Input value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Team" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />
            Show low persistency only
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5" />
            Persistency trend
          </CardTitle>
          <CardDescription>Average personal persistency from the records currently in view.</CardDescription>
        </CardHeader>
        <CardContent>
          <LineMetricChart data={trendPoints} formatValue={formatPercent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Monthly records</CardTitle>
          <CardDescription>Rates below 85% are flagged for follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          {recordsQuery.isPending ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : recordsQuery.isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load persistency"
              description="Refresh the page or adjust your filters."
            />
          ) : records.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No persistency records"
              description="Add a manual monthly record or adjust the filters."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_auto] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                <span>Agent</span>
                <span>Month</span>
                <span>Branch</span>
                <span>Personal</span>
                <span>Unit</span>
                <span>Branch</span>
                <span />
              </div>
              {records.map((record) => (
                <div
                  key={record.id}
                  className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_auto] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{record.agentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.agentCode} {record.team ? `- ${record.team}` : ''}
                    </p>
                  </div>
                  <span>{record.recordMonth}</span>
                  <span>{record.branchCode ?? '-'}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatPercent(record.personalPersistency)}</span>
                    {record.isLowPersistency ? (
                      <Badge variant="secondary" className="text-amber-700 dark:text-amber-300">
                        Low
                      </Badge>
                    ) : null}
                  </div>
                  <span>{formatPercent(record.unitPersistency)}</span>
                  <span>{formatPercent(record.branchPersistency)}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditDialog(record)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PersistencyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        defaultMonth={recordMonth}
      />
    </div>
  );
}
