'use client';

import { UserRound } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { AuditTrailTimeline } from '@/features/phase-3-reassignment/components/audit-trail-timeline';
import { useGetAgentProfile } from '../hooks/use-get-agent-profile';
import { useUploadAgentProfilePhoto } from '../hooks/use-upload-agent-profile-photo';
import { useUpdateAgentProfile } from '../hooks/use-update-agent-profile';
import { AgentProfileEditForm } from './agent-profile-edit-form';

interface AgentProfilePageClientProps {
  agentId: string;
}

export function AgentProfilePageClient({ agentId }: AgentProfilePageClientProps) {
  const profileQuery = useGetAgentProfile(agentId);
  const updateMutation = useUpdateAgentProfile(agentId);
  const uploadPhotoMutation = useUploadAgentProfilePhoto(agentId);

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
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Agent profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {profile.displayName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review editable identity details, verify the linked agent code, and inspect recent
              profile activity in one place.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-[28px] border border-white/50 bg-brand-gradient-soft px-5 py-4 shadow-soft dark:border-white/10">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={`${profile.displayName} profile`}
                className="h-16 w-16 rounded-full object-cover shadow-soft"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-xl font-semibold text-brand-foreground shadow-soft">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">
                Agent code
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{profile.agentCode}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch {profile.branchCode}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AgentProfileEditForm
          profile={profile}
          isPending={updateMutation.isPending}
          isPhotoPending={uploadPhotoMutation.isPending}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync(payload);
          }}
          onPhotoUpload={async (file) => {
            await uploadPhotoMutation.mutateAsync(file);
          }}
        />
        <AuditTrailTimeline
          items={profile.auditTrail.map((entry: (typeof profile.auditTrail)[number]) => ({
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
