'use client';

import { UserRound } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { AuditTrailTimeline } from '@/features/cosaf/components/audit-trail-timeline';
import { useGetAgentProfile } from '../hooks/use-get-agent-profile';
import { useUpdateAgentProfile } from '../hooks/use-update-agent-profile';
import { AgentProfileEditForm } from './agent-profile-edit-form';

interface AgentProfilePageClientProps {
  agentId: string;
}

export function AgentProfilePageClient({ agentId }: AgentProfilePageClientProps) {
  const profileQuery = useGetAgentProfile(agentId);
  const updateMutation = useUpdateAgentProfile(agentId);

  if (profileQuery.isPending) {
    return <LoadingSkeleton rows={6} columns={2} />;
  }

  if (!profileQuery.data || profileQuery.errorMessage) {
    return (
      <EmptyState
        icon={UserRound}
        title="Agent profile unavailable"
        description={profileQuery.errorMessage ?? 'The requested agent profile could not be found.'}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-background/95 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
          Agent profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {profile.displayName}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review editable identity details, verify the linked agent code, and inspect recent profile activity in one place.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AgentProfileEditForm
          profile={profile}
          isPending={updateMutation.isPending}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync(payload);
          }}
        />
        <AuditTrailTimeline
          items={profile.auditTrail.map((entry) => ({
            id: entry.id,
            title: entry.action,
            description: `${entry.summary} Actor: ${entry.actorName}.`,
            timestampUtc: entry.timestampUtc,
          }))}
        />
      </div>
    </div>
  );
}
