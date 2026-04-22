'use client';

import { KanbanBoard } from '@/components/crm/kanban-board';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProspects } from '@/features/crm/hooks/use-get-prospects';
import { useUpdateProspectStage } from '@/features/crm/hooks/use-update-prospect-stage';
import { BriefcaseBusiness } from 'lucide-react';

export default function ProspectsPage() {
  const prospectsQuery = useGetProspects();
  const updateStageMutation = useUpdateProspectStage();

  if (prospectsQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <div className="grid gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px] rounded-3xl" />
          ))}
        </div>
      </div>
    );
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

  return (
    <KanbanBoard
      prospects={prospectsQuery.data.data}
      isUpdating={updateStageMutation.isPending}
      onStageChange={async (prospectId, pipelineStage) => {
        await updateStageMutation.mutateAsync({ prospectId, pipelineStage });
      }}
    />
  );
}
