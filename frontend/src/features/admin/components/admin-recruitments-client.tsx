'use client';

import * as React from 'react';
import { FilePlus2, Search, UserPlus2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

type RecruitmentRecord = {
  id: string;
  agentId: string;
  agentCode: string | null;
  agentName: string | null;
  recruiter: string | null;
  umCode: string | null;
  umName: string | null;
  bmCode: string | null;
  bmName: string | null;
  team: string | null;
  birthday: string | null;
  dateAppointed: string;
  dateTerminated: string | null;
  status: string;
  contacts: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type RecruitmentListResponse = {
  data: RecruitmentRecord[];
  summary: {
    total: number;
    active: number;
    terminated: number;
    reinstated: number;
    pending: number;
  };
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type RecruitmentDetail = RecruitmentRecord & {
  timeline: {
    auditEvents: Array<{
      id: string;
      action: string;
      timestampUtc: string;
      actorName: string | null;
    }>;
  };
};

type FormValues = {
  agentId: string;
  agentCode: string;
  agentName: string;
  recruiter: string;
  umCode: string;
  umName: string;
  bmCode: string;
  bmName: string;
  team: string;
  birthday: string;
  dateAppointed: string;
  dateTerminated: string;
  status: string;
  contacts: string;
  notes: string;
};

function toFormValues(record?: RecruitmentRecord | null): FormValues {
  return {
    agentId: record?.agentId ?? '',
    agentCode: record?.agentCode ?? '',
    agentName: record?.agentName ?? '',
    recruiter: record?.recruiter ?? '',
    umCode: record?.umCode ?? '',
    umName: record?.umName ?? '',
    bmCode: record?.bmCode ?? '',
    bmName: record?.bmName ?? '',
    team: record?.team ?? '',
    birthday: record?.birthday ?? '',
    dateAppointed: record?.dateAppointed ? record.dateAppointed.slice(0, 16) : '',
    dateTerminated: record?.dateTerminated ? record.dateTerminated.slice(0, 16) : '',
    status: record?.status ?? 'Active',
    contacts: record?.contacts ?? '',
    notes: record?.notes ?? '',
  };
}

function RecruitmentFormDialog({
  open,
  onOpenChange,
  initialRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecord?: RecruitmentRecord | null;
}) {
  const queryClient = useQueryClient();
  const agentsQuery = useGetAgents('', open);
  const [form, setForm] = React.useState<FormValues>(() => toFormValues(initialRecord));
  const [details, setDetails] = React.useState<string[]>([]);

  React.useEffect(() => {
    setForm(toFormValues(initialRecord));
    setDetails([]);
  }, [initialRecord, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agentId: form.agentId,
        agentCode: form.agentCode || undefined,
        agentName: form.agentName || undefined,
        recruiter: form.recruiter || undefined,
        umCode: form.umCode || undefined,
        umName: form.umName || undefined,
        bmCode: form.bmCode || undefined,
        bmName: form.bmName || undefined,
        team: form.team || undefined,
        birthday: form.birthday || undefined,
        dateAppointed: new Date(form.dateAppointed).toISOString(),
        dateTerminated: form.dateTerminated ? new Date(form.dateTerminated).toISOString() : null,
        status: form.status,
        contacts: form.contacts || undefined,
        notes: form.notes || null,
      };

      if (initialRecord) {
        const { data } = await api.patch<RecruitmentDetail>(`/admin/recruitments/${initialRecord.id}`, payload);
        return data;
      }

      const { data } = await api.post<RecruitmentDetail>('/admin/recruitments', payload);
      return data;
    },
    onSuccess: async () => {
      toast.success(initialRecord ? 'Recruitment record updated.' : 'Recruitment record created.');
      await queryClient.invalidateQueries({ queryKey: ['admin-recruitments'] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setDetails((error as { response?: { data?: { details?: string[] } } })?.response?.data?.details ?? []);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialRecord ? 'Edit recruitment' : 'Add recruitment'}</DialogTitle>
          <DialogDescription>Track recruits, recruiter hierarchy, team, and appointment lifecycle inside the app.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Agent</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={form.agentId}
              onChange={(event) => {
                const selected = (agentsQuery.data?.data ?? []).find((item) => item.id === event.target.value);
                setForm((current) => ({
                  ...current,
                  agentId: event.target.value,
                  agentCode: selected?.agentCode ?? current.agentCode,
                  agentName: selected?.displayName ?? current.agentName,
                }));
              }}
            >
              <option value="">Select agent</option>
              {(agentsQuery.data?.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} ({agent.agentCode})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm"><span className="font-medium">Recruiter</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.recruiter} onChange={(event) => setForm((current) => ({ ...current, recruiter: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Agent code</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.agentCode} onChange={(event) => setForm((current) => ({ ...current, agentCode: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Agent name</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.agentName} onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">UM code</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.umCode} onChange={(event) => setForm((current) => ({ ...current, umCode: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">UM name</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.umName} onChange={(event) => setForm((current) => ({ ...current, umName: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">BM code</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.bmCode} onChange={(event) => setForm((current) => ({ ...current, bmCode: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">BM name</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.bmName} onChange={(event) => setForm((current) => ({ ...current, bmName: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Team</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.team} onChange={(event) => setForm((current) => ({ ...current, team: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Birthday</span><input type="date" className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.birthday} onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Date appointed</span><input type="datetime-local" className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.dateAppointed} onChange={(event) => setForm((current) => ({ ...current, dateAppointed: event.target.value }))} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Date terminated</span><input type="datetime-local" className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.dateTerminated} onChange={(event) => setForm((current) => ({ ...current, dateTerminated: event.target.value }))} /></label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Status</span>
            <select className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {['Active', 'Pending', 'Terminated', 'Reinstated'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm"><span className="font-medium">Contacts</span><input className="h-11 w-full rounded-md border border-input bg-background px-3" value={form.contacts} onChange={(event) => setForm((current) => ({ ...current, contacts: event.target.value }))} /></label>
        </div>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Notes</span>
          <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        {details.length > 0 ? <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{details.map((detail) => <p key={detail}>{detail}</p>)}</div> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving...' : initialRecord ? 'Save changes' : 'Create recruitment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusActionDialog({
  open,
  title,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { dateTerminated?: string; notes?: string }) => Promise<void> | void;
  isPending: boolean;
}) {
  const [dateTerminated, setDateTerminated] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setDateTerminated('');
      setNotes('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Capture any lifecycle notes for this recruitment record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="space-y-2 text-sm"><span className="font-medium">Termination date</span><input type="datetime-local" className="h-11 w-full rounded-md border border-input bg-background px-3" value={dateTerminated} onChange={(event) => setDateTerminated(event.target.value)} /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Notes</span><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isPending} onClick={() => onSubmit({ dateTerminated: dateTerminated ? new Date(dateTerminated).toISOString() : undefined, notes })}>
            {isPending ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRecruitmentsClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [recruiter, setRecruiter] = React.useState('');
  const [team, setTeam] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [appointedFrom, setAppointedFrom] = React.useState('');
  const [editingRecord, setEditingRecord] = React.useState<RecruitmentRecord | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [terminateRecord, setTerminateRecord] = React.useState<RecruitmentRecord | null>(null);
  const [reinstateRecord, setReinstateRecord] = React.useState<RecruitmentRecord | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [search, recruiter, team, status, appointedFrom]);

  const recruitmentsQuery = useQuery({
    queryKey: ['admin-recruitments', page, search, recruiter, team, status, appointedFrom],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) params.set('search', search.trim());
      if (recruiter.trim()) params.set('recruiter', recruiter.trim());
      if (team.trim()) params.set('team', team.trim());
      if (status) params.set('status', status);
      if (appointedFrom) params.set('appointedFrom', appointedFrom);
      const { data } = await api.get<RecruitmentListResponse>(`/admin/recruitments?${params.toString()}`);
      return data;
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async (payload: { recruitmentId: string; dateTerminated?: string; notes?: string }) => {
      const { data } = await api.post(`/admin/recruitments/${payload.recruitmentId}/terminate`, {
        dateTerminated: payload.dateTerminated,
        notes: payload.notes || null,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success('Recruitment record terminated.');
      setTerminateRecord(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-recruitments'] });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: async (payload: { recruitmentId: string; notes?: string }) => {
      const { data } = await api.post(`/admin/recruitments/${payload.recruitmentId}/reinstate`, {
        notes: payload.notes || null,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success('Recruitment record reinstated.');
      setReinstateRecord(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-recruitments'] });
    },
  });

  const records = recruitmentsQuery.data?.data ?? [];
  const meta = recruitmentsQuery.data?.meta;
  const summary = recruitmentsQuery.data?.summary;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Manual Recruitment Management</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Track recurring recruits, recruiter hierarchy, team assignment, and appointment lifecycle while keeping monthly recruitment metrics in sync.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total', summary?.total ?? 0],
          ['Active', summary?.active ?? 0],
          ['Terminated', summary?.terminated ?? 0],
          ['Reinstated', summary?.reinstated ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Search and filters</CardTitle>
          <CardDescription>Filter by agent code, recruiter, team, status, and appointment date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm" placeholder="Search agent code, name, recruiter, or team" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <input className="h-11 rounded-md border border-input bg-background px-3 text-sm" placeholder="Recruiter" value={recruiter} onChange={(event) => setRecruiter(event.target.value)} />
          <input className="h-11 rounded-md border border-input bg-background px-3 text-sm" placeholder="Team" value={team} onChange={(event) => setTeam(event.target.value)} />
          <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['Active', 'Pending', 'Terminated', 'Reinstated'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="date" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={appointedFrom} onChange={(event) => setAppointedFrom(event.target.value)} />
          <Button type="button" className="h-11 gap-2 rounded-full" onClick={() => { setEditingRecord(null); setShowForm(true); }}>
            <FilePlus2 className="h-4 w-4" />
            Add recruitment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recruitment records</CardTitle>
          <CardDescription>{meta ? `Showing ${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}` : 'Loading records'}</CardDescription>
        </CardHeader>
        <CardContent>
          {recruitmentsQuery.isPending ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : records.length === 0 ? (
            <EmptyState icon={UserPlus2} title="No recruitment records found" description="Try another filter combination or add a recruitment record." />
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>{['Agent', 'Recruiter', 'UM/BM', 'Team', 'Appointed', 'Status', 'Actions'].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-t border-border">
                        <td className="px-3 py-3"><p className="font-medium">{record.agentName ?? '-'}</p><p className="text-xs text-muted-foreground">{record.agentCode ?? '-'}</p></td>
                        <td className="px-3 py-3">{record.recruiter ?? '-'}</td>
                        <td className="px-3 py-3"><p>{record.umName ?? record.umCode ?? '-'}</p><p className="text-xs text-muted-foreground">{record.bmName ?? record.bmCode ?? '-'}</p></td>
                        <td className="px-3 py-3">{record.team ?? '-'}</td>
                        <td className="px-3 py-3">{new Date(record.dateAppointed).toLocaleDateString()}</td>
                        <td className="px-3 py-3">{record.status}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingRecord(record); setShowForm(true); }}>Edit</Button>
                            {record.status !== 'Terminated' ? <Button type="button" size="sm" variant="outline" onClick={() => setTerminateRecord(record)}>Terminate</Button> : null}
                            {record.status === 'Terminated' ? <Button type="button" size="sm" onClick={() => setReinstateRecord(record)}>Reinstate</Button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <Button type="button" variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <RecruitmentFormDialog open={showForm} onOpenChange={setShowForm} initialRecord={editingRecord} />
      <StatusActionDialog
        open={Boolean(terminateRecord)}
        title="Terminate recruitment"
        isPending={terminateMutation.isPending}
        onOpenChange={(open) => { if (!open) setTerminateRecord(null); }}
        onSubmit={async (payload) => {
          if (!terminateRecord) return;
          await terminateMutation.mutateAsync({ recruitmentId: terminateRecord.id, ...payload });
        }}
      />
      <StatusActionDialog
        open={Boolean(reinstateRecord)}
        title="Reinstate recruitment"
        isPending={reinstateMutation.isPending}
        onOpenChange={(open) => { if (!open) setReinstateRecord(null); }}
        onSubmit={async (payload) => {
          if (!reinstateRecord) return;
          await reinstateMutation.mutateAsync({ recruitmentId: reinstateRecord.id, notes: payload.notes });
        }}
      />
    </div>
  );
}
