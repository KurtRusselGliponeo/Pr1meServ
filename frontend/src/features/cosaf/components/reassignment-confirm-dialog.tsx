'use client';

import * as React from 'react';

import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

interface ReassignmentConfirmDialogProps {
  trigger: React.ReactNode;
  sourceAgentId: string;
  destinationAgentId: string;
  totalClients: number;
  onConfirm: () => Promise<void> | void;
  isPending?: boolean;
}

export function ReassignmentConfirmDialog({
  trigger,
  sourceAgentId,
  destinationAgentId,
  totalClients,
  onConfirm,
  isPending,
}: ReassignmentConfirmDialogProps) {
  return (
    <ConfirmActionDialog
      trigger={trigger}
      title="Confirm client reassignment"
      description={`You are moving ${totalClients} client record(s) from agent ${sourceAgentId} to agent ${destinationAgentId}. This action writes to the audit trail immediately.`}
      confirmLabel="Reassign clients"
      onConfirm={onConfirm}
      isPending={isPending}
    />
  );
}
