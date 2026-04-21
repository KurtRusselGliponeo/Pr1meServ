'use client';

import * as React from 'react';
import { CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { toast } from 'sonner';
import { useGetCosafApprovals } from '../hooks/use-get-cosaf-approvals';
import {
  useApproveCosafApproval,
  useRejectCosafApproval,
} from '../hooks/use-update-cosaf-approval';
import { CosafRejectionDialog } from './cosaf-rejection-dialog';

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CosafApprovalsPanel() {
  const approvalsQuery = useGetCosafApprovals();
  const approveMutation = useApproveCosafApproval();
  const rejectMutation = useRejectCosafApproval();
  const [approvalToReject, setApprovalToReject] = React.useState<string | null>(null);

  const handleReject = React.useCallback(
    async (approvalId: string, reason: string) => {
      try {
        await rejectMutation.mutateAsync({ approvalId, reason });
        toast.success('COSAF submission returned to the agent.');
        setApprovalToReject(null);
      } catch {
        // Axios interceptor already displays the failure state.
      }
    },
    [rejectMutation],
  );

  if (approvalsQuery.isPending) {
    return <LoadingSkeleton rows={2} columns={2} />;
  }

  if (!approvalsQuery.data || approvalsQuery.errorMessage) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="Approvals unavailable"
        description={approvalsQuery.errorMessage ?? 'Pending COSAF approvals are not available yet.'}
      />
    );
  }

  return (
    <Card className="overflow-hidden border border-brand/20 bg-white/72 dark:bg-card/82">
      <CardHeader className="bg-brand-gradient-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardDescription>Manager review queue</CardDescription>
            <CardTitle className="mt-2">Live COSAF approvals</CardTitle>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand shadow-soft dark:border-white/10 dark:bg-white/10">
            <Clock3 className="h-3.5 w-3.5" />
            {approvalsQuery.data.data.length} pending
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvalsQuery.data.data.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Approval queue is clear"
            description="There are no pending COSAF records waiting on manager review right now."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {approvalsQuery.data.data.map((approval) => (
              <article
                key={approval.id}
                className="rounded-[28px] border border-brand/15 bg-background/80 p-5 shadow-soft dark:bg-background/30"
              >
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand/75">
                      Policy {approval.policyNumber}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">
                      {approval.assignedAgentName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted {formatCreatedAt(approval.createdAtUtc)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => approveMutation.mutate({ approvalId: approval.id })}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setApprovalToReject(approval.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Return
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
      <CosafRejectionDialog
        approvalId={approvalToReject}
        open={Boolean(approvalToReject)}
        isPending={rejectMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalToReject(null);
          }
        }}
        onSubmit={(approvalId, reason) => {
          void handleReject(approvalId, reason);
        }}
      />
    </Card>
  );
}
