'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  LoaderCircle,
  Search,
  UserRound,
} from 'lucide-react';
import type {
  AgentLookupItem,
  ClientProfile,
  ClientProfileReassign,
  ClientProfileReassignPreflightResponse,
} from '@a1prime/schemas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useReassignPreflight } from '../hooks/use-reassign-preflight';
import { ReassignmentConfirmDialog } from './reassignment-confirm-dialog';

interface ClientReassignmentFormProps {
  orphanClients: ClientProfile[];
  agents: AgentLookupItem[];
  clientSearch: string;
  agentSearch: string;
  onClientSearchChange: (value: string) => void;
  onAgentSearchChange: (value: string) => void;
  onViewHistory: (clientId: string) => void;
  onSubmit: (payload: ClientProfileReassign) => Promise<void>;
  isClientsPending?: boolean;
  isAgentsPending?: boolean;
  isPending?: boolean;
}

function formatCurrency(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function DestinationAgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: AgentLookupItem;
  isSelected: boolean;
  onSelect: (agent: AgentLookupItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(agent)}
      className={cn(
        'w-full rounded-[26px] border px-4 py-4 text-left shadow-soft transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20',
        isSelected
          ? 'border-brand/35 bg-brand-gradient-soft text-foreground'
          : 'border-white/50 bg-background/85 text-foreground hover:-translate-y-0.5 hover:border-brand/40 dark:border-white/10 dark:bg-white/[0.03]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{agent.displayName}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand/75">{agent.agentCode}</p>
        </div>
        {isSelected ? <Badge className="bg-brand text-white">Target</Badge> : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{agent.email}</p>
    </button>
  );
}

function OrphanClientCard({
  client,
  isSelected,
  onToggle,
  onViewHistory,
}: {
  client: ClientProfile;
  isSelected: boolean;
  onToggle: (clientId: string) => void;
  onViewHistory: (clientId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(client.id)}
      className={cn(
        'flex h-full flex-col rounded-[28px] border px-4 py-4 text-left shadow-soft transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20',
        isSelected
          ? 'border-brand/35 bg-brand-gradient-soft'
          : 'border-white/50 bg-background/88 hover:-translate-y-0.5 hover:border-brand/35 dark:border-white/10 dark:bg-white/[0.03]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">
            {client.firstName} {client.lastName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand/75">
            Policy {client.policyNumber}
          </p>
        </div>
        <Badge
          className={cn(
            'border-none',
            isSelected ? 'bg-brand text-white' : 'bg-background/80 text-muted-foreground',
          )}
        >
          {isSelected ? 'Selected' : client.caseStatus}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em]">Premium</dt>
          <dd className="mt-1 text-foreground">{formatCurrency(client.modalPremium)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em]">API</dt>
          <dd className="mt-1 text-foreground">{formatCurrency(client.api)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onViewHistory(client.id);
          }}
        >
          View history
        </Button>
      </div>
    </button>
  );
}

function AgentColumnSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`agent-loading-${index}`}
          className="rounded-[26px] border border-white/50 bg-background/85 px-4 py-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="h-5 w-40 animate-pulse rounded-full bg-muted/70" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-muted/70" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

function OrphanClientGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`client-loading-${index}`}
          className="rounded-[28px] border border-white/50 bg-background/88 px-4 py-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="h-5 w-36 animate-pulse rounded-full bg-muted/70" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded-full bg-muted/70" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-12 animate-pulse rounded-2xl bg-muted/70" />
            <div className="h-12 animate-pulse rounded-2xl bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientReassignmentForm({
  orphanClients,
  agents,
  clientSearch,
  agentSearch,
  onClientSearchChange,
  onAgentSearchChange,
  onViewHistory,
  onSubmit,
  isClientsPending = false,
  isAgentsPending = false,
  isPending = false,
}: ClientReassignmentFormProps) {
  const shouldReduceMotion = useReducedMotion();
  const [destinationAgent, setDestinationAgent] = React.useState<AgentLookupItem | null>(null);
  const [selectedClientIds, setSelectedClientIds] = React.useState<string[]>([]);
  const [lastPreflight, setLastPreflight] =
    React.useState<ClientProfileReassignPreflightResponse | null>(null);
  const preflightMutation = useReassignPreflight();

  const selectedClients = orphanClients.filter((client) => selectedClientIds.includes(client.id));
  const allVisibleSelected =
    orphanClients.length > 0 && orphanClients.every((client) => selectedClientIds.includes(client.id));

  const payload = destinationAgent && selectedClients.length > 0
    ? {
        sourceAgentId: null,
        destinationAgentId: destinationAgent.id,
        clientProfileIds: selectedClients.map((client) => client.id),
      }
    : null;

  React.useEffect(() => {
    setSelectedClientIds((current) =>
      current.filter((clientId) => orphanClients.some((client) => client.id === clientId)),
    );
  }, [orphanClients]);

  React.useEffect(() => {
    setLastPreflight(null);
  }, [destinationAgent?.id, selectedClientIds]);

  function toggleClient(clientId: string) {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((selectedId) => selectedId !== clientId)
        : [...current, clientId],
    );
  }

  function toggleSelectAllVisible() {
    setSelectedClientIds((current) => {
      if (allVisibleSelected) {
        return current.filter((clientId) => !orphanClients.some((client) => client.id === clientId));
      }

      const nextIds = new Set(current);
      orphanClients.forEach((client) => nextIds.add(client.id));
      return [...nextIds];
    });
  }

  async function handleReview() {
    if (!payload) {
      return;
    }

    const result = await preflightMutation.mutateAsync(payload);
    setLastPreflight(result);
  }

  async function handleConfirm() {
    if (!payload || !lastPreflight?.ok) {
      return;
    }

    await onSubmit(payload);
    setSelectedClientIds([]);
    setLastPreflight(null);
  }

  return (
    <Card className="border-white/50 bg-white/72 dark:border-white/10 dark:bg-card/82">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-xl">Orphan reassignment board</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Map unassigned client profiles to an active agent, validate the batch, and push the
              next handoff without waiting for a page reload.
            </CardDescription>
          </div>
          <div className="rounded-full border border-white/50 bg-brand-gradient-soft px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-soft dark:border-white/10">
            {selectedClients.length} queued
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-4 rounded-[28px] border border-white/50 bg-background/70 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Target agent</p>
                <p className="text-sm text-muted-foreground">
                  Select the active owner for the orphaned batch.
                </p>
              </div>
              <Badge className="bg-background/80 text-muted-foreground shadow-none">
                {agents.length} active
              </Badge>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={agentSearch}
                onChange={(event) => onAgentSearchChange(event.target.value)}
                className="pl-9"
                placeholder="Search by agent name or code"
              />
            </div>
            <div className="grid gap-3">
              {isAgentsPending ? (
                <AgentColumnSkeleton />
              ) : null}
              {!isAgentsPending && agents.length === 0 ? (
                <div className="rounded-[24px] border border-white/50 bg-brand-gradient-soft px-4 py-6 text-sm text-muted-foreground dark:border-white/10">
                  No active agents matched your search.
                </div>
              ) : null}
              {agents.map((agent) => (
                <DestinationAgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={destinationAgent?.id === agent.id}
                  onSelect={setDestinationAgent}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-white/50 bg-background/70 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Orphan clients</p>
                <p className="text-sm text-muted-foreground">
                  Multi-select the unassigned records that should move to the chosen agent.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={toggleSelectAllVisible}
                disabled={orphanClients.length === 0}
              >
                {allVisibleSelected ? 'Clear visible' : 'Select visible'}
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={(event) => onClientSearchChange(event.target.value)}
                className="pl-9"
                placeholder="Search orphan clients by name or policy number"
              />
            </div>
            <div className="rounded-[24px] border border-white/50 bg-brand-gradient-soft px-4 py-4 shadow-soft dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/85 p-2 text-brand shadow-soft">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Batch summary</p>
                  <p className="text-sm text-muted-foreground">
                    {destinationAgent
                      ? `Moving ${selectedClients.length} client record(s) to ${destinationAgent.displayName}.`
                      : 'Choose an agent and select one or more orphaned records.'}
                  </p>
                </div>
              </div>
            </div>
            {isClientsPending ? (
              <OrphanClientGridSkeleton />
            ) : null}
            {!isClientsPending && orphanClients.length === 0 ? (
              <div className="rounded-[24px] border border-white/50 bg-brand-gradient-soft px-4 py-6 text-sm text-muted-foreground dark:border-white/10">
                No orphaned client profiles matched the current search.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {orphanClients.map((client) => (
                <motion.div
                  key={client.id}
                  layout={!shouldReduceMotion}
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          layout: {
                            duration: 0.24,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        }
                  }
                >
                  <OrphanClientCard
                    client={client}
                    isSelected={selectedClientIds.includes(client.id)}
                    onToggle={toggleClient}
                    onViewHistory={onViewHistory}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {lastPreflight ? (
          <section
            className={cn(
              'rounded-[28px] border p-4 shadow-soft',
              lastPreflight.ok
                ? 'border-emerald-300/70 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                : 'border-destructive/30 bg-destructive/10',
            )}
          >
            <div className="flex items-start gap-3">
              {lastPreflight.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              )}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {lastPreflight.ok
                    ? 'Preflight passed. The reassignment batch is ready.'
                    : 'Preflight found issues that need to be resolved first.'}
                </p>
                {lastPreflight.ok ? (
                  <p className="text-sm text-muted-foreground">
                    The optimistic update will clear these records from the orphan board as soon as
                    the reassignment request is sent.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {lastPreflight.issues.map((issue) => (
                      <li key={`${issue.code}-${issue.clientProfileId ?? issue.message}`}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ArrowRightLeft className="h-4 w-4 text-brand" />
            <span>Selected orphan clients will move to `For Approval` after reassignment.</span>
          </div>
          <ReassignmentConfirmDialog
            trigger={
              <Button
                type="button"
                size="lg"
                className="min-h-12 rounded-full"
                disabled={!payload || preflightMutation.isPending || isPending}
                onClick={() => {
                  void handleReview();
                }}
              >
                {preflightMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Validating batch
                  </>
                ) : (
                  'Review reassignment'
                )}
              </Button>
            }
            sourceAgentName="Orphan queue"
            destinationAgentName={destinationAgent?.displayName ?? 'No agent selected'}
            totalClients={selectedClients.length}
            isPending={isPending}
            canConfirm={Boolean(lastPreflight?.ok)}
            onConfirm={handleConfirm}
          />
        </div>
      </CardContent>
    </Card>
  );
}
