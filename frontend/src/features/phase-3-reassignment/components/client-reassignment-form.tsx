'use client';

import * as React from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  LoaderCircle,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import type {
  AgentLookupItem,
  ClientProfile,
  ClientProfileReassign,
  ClientProfileReassignPreflightResponse,
} from '@a1prime/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGetClientProfiles } from '@/features/phase-2-bm-workflow/hooks/use-get-client-profiles';
import { useGetAgents } from '../hooks/use-get-agents';
import { useReassignPreflight } from '../hooks/use-reassign-preflight';
import { ReassignmentConfirmDialog } from './reassignment-confirm-dialog';

interface ClientReassignmentFormProps {
  onSubmit: (payload: ClientProfileReassign) => Promise<void>;
  isPending?: boolean;
}

function AgentOption({
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
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        isSelected
          ? 'border-brand bg-brand/10 text-foreground'
          : 'border-white/50 bg-background/80 text-foreground hover:border-brand/40 dark:border-white/10'
      }`}
    >
      <p className="font-medium">{agent.displayName}</p>
      <p className="text-xs text-muted-foreground">
        {agent.agentCode} · {agent.email}
      </p>
    </button>
  );
}

function ClientResultRow({
  client,
  onAdd,
  disabled,
}: {
  client: ClientProfile;
  onAdd: (client: ClientProfile) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-background/80 px-4 py-3 dark:border-white/10">
      <div>
        <p className="font-medium text-foreground">
          {client.firstName} {client.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          Policy {client.policyNumber} · {client.caseStatus}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => onAdd(client)} disabled={disabled}>
        Add
      </Button>
    </div>
  );
}

export function ClientReassignmentForm({
  onSubmit,
  isPending = false,
}: ClientReassignmentFormProps) {
  const [sourceSearch, setSourceSearch] = React.useState('');
  const [destinationSearch, setDestinationSearch] = React.useState('');
  const [clientSearch, setClientSearch] = React.useState('');
  const [sourceAgent, setSourceAgent] = React.useState<AgentLookupItem | null>(null);
  const [destinationAgent, setDestinationAgent] = React.useState<AgentLookupItem | null>(null);
  const [selectedClients, setSelectedClients] = React.useState<ClientProfile[]>([]);
  const [lastPreflight, setLastPreflight] =
    React.useState<ClientProfileReassignPreflightResponse | null>(null);

  const sourceAgentsQuery = useGetAgents(sourceSearch);
  const destinationAgentsQuery = useGetAgents(destinationSearch);
  const clientsQuery = useGetClientProfiles(
    1,
    {
      agentId: sourceAgent?.id,
      search: clientSearch,
    },
    8,
  );
  const preflightMutation = useReassignPreflight();

  const payload = React.useMemo<ClientProfileReassign | null>(() => {
    if (!sourceAgent || selectedClients.length === 0) {
      return null;
    }

    return {
      sourceAgentId: sourceAgent.id,
      destinationAgentId: destinationAgent?.id ?? null,
      clientProfileIds: selectedClients.map((client) => client.id),
    };
  }, [destinationAgent?.id, selectedClients, sourceAgent]);

  React.useEffect(() => {
    setLastPreflight(null);
  }, [payload]);

  function addClient(client: ClientProfile) {
    setSelectedClients((current) => {
      if (current.some((item) => item.id === client.id)) {
        return current;
      }

      return [...current, client];
    });
  }

  function removeClient(clientId: string) {
    setSelectedClients((current) => current.filter((item) => item.id !== clientId));
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
    setSourceSearch('');
    setDestinationSearch('');
    setClientSearch('');
    setSourceAgent(null);
    setDestinationAgent(null);
    setSelectedClients([]);
    setLastPreflight(null);
  }

  const availableClients =
    clientsQuery.data?.data.filter((client) => !selectedClients.some((item) => item.id === client.id)) ??
    [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Client reassignment workspace</CardTitle>
            <CardDescription>
              Search agents, select the client records to move, and validate the batch before it
              reaches the approval flow.
            </CardDescription>
          </div>
          <div className="rounded-full border border-white/50 bg-brand-gradient-soft px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-soft dark:border-white/10">
            {selectedClients.length} selected
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">1. Choose source agent</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search by name or agent code"
                />
              </div>
            </div>
            <div className="space-y-2">
              {sourceAgentsQuery.data?.data.map((agent) => (
                <AgentOption
                  key={agent.id}
                  agent={agent}
                  isSelected={sourceAgent?.id === agent.id}
                  onSelect={(nextAgent) => {
                    setSourceAgent(nextAgent);
                    setSelectedClients([]);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">2. Choose destination agent</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={destinationSearch}
                  onChange={(event) => setDestinationSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search by name or agent code"
                />
              </div>
            </div>
            <Button
              type="button"
              variant={!destinationAgent ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDestinationAgent(null)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Move selected clients to orphan queue
            </Button>
            <div className="space-y-2">
              {destinationAgentsQuery.data?.data.map((agent) => (
                <AgentOption
                  key={agent.id}
                  agent={agent}
                  isSelected={destinationAgent?.id === agent.id}
                  onSelect={setDestinationAgent}
                />
              ))}
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">3. Search and add client profiles</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                className="pl-9"
                placeholder={
                  sourceAgent
                    ? 'Search by client name or policy number'
                    : 'Select a source agent first'
                }
                disabled={!sourceAgent}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/50 bg-brand-gradient-soft p-4 shadow-soft dark:border-white/10">
            <div className="flex items-center gap-3">
              <UserRound className="h-4 w-4 text-brand" />
              <div>
                <p className="text-sm font-semibold text-foreground">Selected batch</p>
                <p className="text-sm text-muted-foreground">
                  {selectedClients.length === 0
                    ? 'No client profiles added yet.'
                    : `${selectedClients.length} client profile(s) ready for preflight validation.`}
                </p>
              </div>
            </div>
            {selectedClients.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => removeClient(client.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3 py-2 text-sm text-foreground shadow-soft"
                  >
                    {client.policyNumber}
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {availableClients.map((client) => (
              <ClientResultRow
                key={client.id}
                client={client}
                onAdd={addClient}
                disabled={!sourceAgent}
              />
            ))}
          </div>
        </section>

        {lastPreflight ? (
          <section
            className={`rounded-3xl border p-4 shadow-soft ${
              lastPreflight.ok
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastPreflight.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              )}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {lastPreflight.ok
                    ? 'Preflight passed. This batch is ready.'
                    : 'Preflight found issues that need attention.'}
                </p>
                {!lastPreflight.ok ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {lastPreflight.issues.map((issue) => (
                      <li key={`${issue.code}-${issue.clientProfileId ?? issue.message}`}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <ReassignmentConfirmDialog
          trigger={
            <Button
              type="button"
              size="lg"
              className="min-h-12 rounded-full"
              disabled={!payload || preflightMutation.isPending || isPending}
              onClick={() => void handleReview()}
            >
              {preflightMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Validating
                </>
              ) : (
                'Run preflight and review'
              )}
            </Button>
          }
          sourceAgentName={sourceAgent?.displayName ?? 'No source selected'}
          destinationAgentName={destinationAgent?.displayName ?? 'Orphan queue'}
          totalClients={selectedClients.length}
          isPending={isPending}
          canConfirm={Boolean(lastPreflight?.ok)}
          onConfirm={handleConfirm}
        />
      </CardContent>
    </Card>
  );
}
