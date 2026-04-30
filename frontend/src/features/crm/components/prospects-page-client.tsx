'use client';

import * as React from 'react';
import {
  prospectPipelineStages,
  prospectTemperatures,
  type CreateProspect,
  type Prospect,
  type ProspectPipelineStage,
  type UpdateProspect,
} from '@a1prime/schemas';
import { BellRing, BriefcaseBusiness, CalendarClock, Filter, Plus, Search } from 'lucide-react';

import { KanbanBoard } from '@/components/crm/kanban-board';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateProspect } from '../hooks/use-create-prospect';
import { useGetProspects } from '../hooks/use-get-prospects';
import { useUpdateProspect } from '../hooks/use-update-prospect';
import { useUpdateProspectStage } from '../hooks/use-update-prospect-stage';
import { ProspectFormDialog } from './prospect-form-dialog';

function formatReminder(value?: string | null) {
  if (!value) {
    return 'No follow-up scheduled';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getReminderTone(prospect: Prospect) {
  if (!prospect.followUpDateUtc) {
    return 'text-muted-foreground';
  }

  const followUpTime = new Date(prospect.followUpDateUtc).getTime();
  const now = Date.now();

  if (followUpTime < now) {
    return 'text-destructive';
  }

  if (followUpTime - now < 24 * 60 * 60 * 1000) {
    return 'text-amber-600';
  }

  return 'text-emerald-600';
}

export function ProspectsPageClient() {
  const { user } = useAuth();
  const canChooseAgent = user?.role === 'Admin' || user?.role === 'BranchManager';
  const [temperature, setTemperature] = React.useState<'All' | (typeof prospectTemperatures)[number]>('All');
  const [pipelineStage, setPipelineStage] = React.useState<'All' | ProspectPipelineStage>('All');
  const [search, setSearch] = React.useState('');
  const [dueOnly, setDueOnly] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedProspect, setSelectedProspect] = React.useState<Prospect | null>(null);

  const prospectsQuery = useGetProspects({
    search: search.trim() || undefined,
    temperature: temperature === 'All' ? undefined : temperature,
    pipelineStage: pipelineStage === 'All' ? undefined : pipelineStage,
    dueOnly,
  });
  const agentsQuery = useGetAgents('', canChooseAgent);
  const createProspectMutation = useCreateProspect(prospectsQuery.filtersKey);
  const updateProspectMutation = useUpdateProspect(prospectsQuery.filtersKey);
  const updateStageMutation = useUpdateProspectStage(prospectsQuery.filtersKey);

  const prospects = prospectsQuery.data?.data ?? [];
  const reminders = prospects
    .filter((prospect) => Boolean(prospect.followUpDateUtc))
    .sort((left, right) =>
      (left.followUpDateUtc ?? '').localeCompare(right.followUpDateUtc ?? ''),
    )
    .slice(0, 6);

  const summary = React.useMemo(() => {
    return {
      total: prospects.length,
      warm: prospects.filter((prospect) => prospect.temperature === 'Warm').length,
      cold: prospects.filter((prospect) => prospect.temperature === 'Cold').length,
      due: prospects.filter(
        (prospect) => prospect.followUpDateUtc && new Date(prospect.followUpDateUtc).getTime() <= Date.now(),
      ).length,
    };
  }, [prospects]);

  const agentOptions = (agentsQuery.data?.data ?? []).map((agent) => ({
    value: agent.agentCode,
    label: `${agent.displayName} (${agent.agentCode})`,
  }));
  const isInitialLoading = prospectsQuery.isPending && !prospectsQuery.data;

  if (isInitialLoading) {
    return <LoadingSkeleton rows={5} columns={4} />;
  }

  if (!prospectsQuery.data || prospectsQuery.errorMessage) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="Prospects unavailable"
        description={prospectsQuery.errorMessage ?? 'We could not load the prospect pipeline.'}
      />
    );
  }

  async function handleFormSubmit(payload: CreateProspect | UpdateProspect) {
    if (selectedProspect) {
      await updateProspectMutation.mutateAsync({
        prospectId: selectedProspect.id,
        body: payload as UpdateProspect,
      });
    } else {
      await createProspectMutation.mutateAsync(payload as CreateProspect);
    }

    setIsDialogOpen(false);
    setSelectedProspect(null);
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Prospecting
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Agent prospecting workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Capture new leads, keep warm and cold labels separate from the pipeline, and stay on
              top of follow-up reminders before prospects become active clients.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedProspect(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add prospect
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total prospects</CardDescription>
            <CardTitle>{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Warm leads</CardDescription>
            <CardTitle>{summary.warm}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cold leads</CardDescription>
            <CardTitle>{summary.cold}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Due reminders</CardDescription>
            <CardTitle>{summary.due}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="floating-card space-y-4 bg-white/72 p-5 dark:bg-card/82">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter the pipeline by lead temperature, stage, and follow-up urgency.
          {prospectsQuery.isFetching ? (
            <span className="rounded-full border border-white/50 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft dark:border-white/10">
              Refreshing prospects...
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
              placeholder="Search by client, number, email, notes, or agent"
            />
          </div>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={temperature}
            onChange={(event) => setTemperature(event.target.value as typeof temperature)}
          >
            <option value="All">All temperatures</option>
            {prospectTemperatures.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={pipelineStage}
            onChange={(event) => setPipelineStage(event.target.value as typeof pipelineStage)}
          >
            <option value="All">All stages</option>
            {prospectPipelineStages.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} />
            Due only
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <KanbanBoard
          prospects={prospects}
          isUpdating={updateStageMutation.isPending}
          onSelectProspect={(prospect) => {
            setSelectedProspect(prospect);
            setIsDialogOpen(true);
          }}
          onStageChange={async (prospectId, nextStage) => {
            await updateStageMutation.mutateAsync({ prospectId, pipelineStage: nextStage });
          }}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-2 text-brand">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Follow-up reminders</CardTitle>
                <CardDescription>
                  Upcoming and overdue follow-ups across your current visible scope.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {reminders.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No reminders yet"
                description="Add a follow-up date to any prospect and it will appear here."
              />
            ) : (
              reminders.map((prospect) => (
                <button
                  key={prospect.id}
                  type="button"
                  className="w-full rounded-[24px] border border-white/40 bg-background/75 p-4 text-left dark:border-white/10"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{prospect.clientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {prospect.pipelineStage} | {prospect.temperature}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${getReminderTone(prospect)}`}>
                      {formatReminder(prospect.followUpDateUtc)}
                    </span>
                  </div>
                  {prospect.notes ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{prospect.notes}</p>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <ProspectFormDialog
        open={isDialogOpen}
        canChooseAgent={canChooseAgent}
        agents={agentOptions}
        initialProspect={selectedProspect}
        isPending={
          createProspectMutation.isPending ||
          updateProspectMutation.isPending ||
          agentsQuery.isPending
        }
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedProspect(null);
          }
        }}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
