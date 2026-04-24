'use client';

import * as React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { ClientAssignmentHistoryResponse, ListClientProfilesResponse } from '@a1prime/schemas';

import { EmptyState } from '@/components/ui/empty-state';
import { ReassignmentBoardSkeleton } from '@/components/ui/panel-skeletons';
import { useGetClientProfiles } from '@/features/phase-2-bm-workflow/hooks/use-get-client-profiles';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import { useGetClientHistory } from '@/features/phase-3-reassignment/hooks/use-get-client-history';
import { useReassignClients } from '@/features/phase-3-reassignment/hooks/use-reassign-clients';
import { AuditTrailTimeline } from './audit-trail-timeline';
import { ClientReassignmentForm } from './client-reassignment-form';

export function ReassignPageClient() {
  const [clientSearch, setClientSearch] = React.useState('');
  const [agentSearch, setAgentSearch] = React.useState('');
  const deferredClientSearch = React.useDeferredValue(clientSearch);
  const deferredAgentSearch = React.useDeferredValue(agentSearch);

  const orphanClientsQuery = useGetClientProfiles(
    1,
    {
      status: 'Orphan',
      search: deferredClientSearch,
    },
    24,
  );
  const agentsQuery = useGetAgents(deferredAgentSearch);
  const reassignMutation = useReassignClients();
  const [historyClientId, setHistoryClientId] = React.useState<string | undefined>(undefined);
  const historyQuery = useGetClientHistory(historyClientId);

  const auditItems = (orphanClientsQuery.data?.data ?? [])
    .slice(0, 5)
    .map((profile: ListClientProfilesResponse['data'][number], index: number) => ({
    id: profile.id,
    title: `Orphan policy ${profile.policyNumber} is ready for remapping`,
    description: `${profile.firstName} ${profile.lastName} is waiting in the orphan queue. Assign the record to an active agent to restart the digital COSAF path.`,
    timestampUtc:
      profile.updatedAtUtc ??
      profile.createdAtUtc ??
      new Date(Date.now() - index * 3600000).toISOString(),
  }));

  if (orphanClientsQuery.isPending && !orphanClientsQuery.data) {
    return <ReassignmentBoardSkeleton />;
  }

  if (orphanClientsQuery.errorMessage) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title="Client reassignment is unavailable"
        description={orphanClientsQuery.errorMessage}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Orphan Client Automation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Admin reassignment board
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Match orphaned client profiles to active agents, validate the batch before submission, and
          keep the orphan board responsive with optimistic updates while reassignment is in flight.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ClientReassignmentForm
          orphanClients={orphanClientsQuery.data?.data ?? []}
          agents={agentsQuery.data?.data ?? []}
          clientSearch={clientSearch}
          agentSearch={agentSearch}
          onClientSearchChange={setClientSearch}
          onAgentSearchChange={setAgentSearch}
          isClientsPending={orphanClientsQuery.isPending}
          isAgentsPending={agentsQuery.isPending}
          isPending={reassignMutation.isPending}
          onViewHistory={setHistoryClientId}
          onSubmit={async (payload) => {
            await reassignMutation.mutateAsync(payload);
          }}
        />
        <div className="space-y-6">
          <AuditTrailTimeline items={auditItems} />
          {historyClientId ? (
            <section className="floating-card bg-white/72 p-6 dark:bg-card/82">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">
                Client assignment history
              </p>
              {historyQuery.isPending ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading client history…</p>
              ) : historyQuery.errorMessage ? (
                <p className="mt-4 text-sm text-destructive">{historyQuery.errorMessage}</p>
              ) : (
                <AuditTrailTimeline
                  items={(historyQuery.data?.data ?? []).map(
                    (entry: ClientAssignmentHistoryResponse['data'][number]) => ({
                    id: entry.id,
                    title: `${entry.fromAgentName ?? 'Unassigned'} -> ${entry.toAgentName ?? 'Unassigned'}`,
                    description: `${entry.reason ?? 'Assignment updated'} Branch: ${entry.branchCode}.`,
                    timestampUtc: entry.createdAtUtc,
                    }),
                  )}
                />
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
