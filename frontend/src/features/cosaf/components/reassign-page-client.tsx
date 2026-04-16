'use client';

import { useMemo } from 'react';
import { ArrowRightLeft } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetClientProfiles } from '@/features/cosaf/hooks/use-get-client-profiles';
import { useReassignClients } from '@/features/cosaf/hooks/use-reassign-clients';
import { AuditTrailTimeline } from './audit-trail-timeline';
import { ClientReassignmentForm } from './client-reassignment-form';

export function ReassignPageClient() {
  const { data, isPending, errorMessage } = useGetClientProfiles(1, {});
  const reassignMutation = useReassignClients();

  const auditItems = useMemo(() => {
    const clients = data?.data ?? [];

    return clients.slice(0, 5).map((profile, index) => ({
      id: profile.id,
      title: `Client ${profile.policyNumber} prepared for reassignment`,
      description: `${profile.firstName} ${profile.lastName} is currently owned by agent ${profile.assignedAgentId}. Use the confirmed batch action to transfer ownership safely.`,
      timestampUtc:
        profile.updatedAtUtc ??
        profile.createdAtUtc ??
        new Date(Date.now() - index * 3600000).toISOString(),
    }));
  }, [data?.data]);

  if (isPending) {
    return <LoadingSkeleton rows={6} columns={2} />;
  }

  if (errorMessage || !data) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title="Client reassignment is unavailable"
        description={errorMessage ?? 'We could not load the source client list for reassignment.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-background/95 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">COSAF</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Client reassignment
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Batch transfer client ownership between agents, confirm the move before it is written, and
          keep the branch team aligned with a visible audit timeline.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ClientReassignmentForm
          clients={data.data}
          isPending={reassignMutation.isPending}
          onSubmit={async (payload) => {
            await reassignMutation.mutateAsync(payload);
          }}
        />
        <AuditTrailTimeline items={auditItems} />
      </div>
    </div>
  );
}
