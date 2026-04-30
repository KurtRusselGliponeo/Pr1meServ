'use client';

import * as React from 'react';

import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

interface ReassignmentConfirmDialogProps {
  trigger: React.ReactNode;
  sourceAgentName: string;
  destinationAgentName: string;
  totalClients: number;
  onConfirm: () => Promise<void> | void;
  isPending?: boolean;
  canConfirm?: boolean;
}

export function ReassignmentConfirmDialog({
  trigger,
  sourceAgentName,
  destinationAgentName,
  totalClients,
  onConfirm,
  isPending,
  canConfirm = true,
}: ReassignmentConfirmDialogProps) {
  return (
    <ConfirmActionDialog
      trigger={trigger}
      title="Confirm client reassignment"
      description={`You are moving ${totalClients} client record(s) from ${sourceAgentName} to ${destinationAgentName}. This action writes to the audit trail immediately.`}
      confirmLabel="Reassign clients"
      onConfirm={async () => {
        if (!canConfirm) {
          return;
        }

        await onConfirm();
      }}
      isPending={isPending || !canConfirm}
    />
  );
}
