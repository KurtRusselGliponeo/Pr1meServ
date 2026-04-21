'use client';

import * as React from 'react';
import { LoaderCircle, MessageSquareWarning } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CosafRejectionDialogProps {
  approvalId: string | null;
  open: boolean;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (approvalId: string, reason: string) => void;
}

const MIN_REASON_LENGTH = 10;

export function CosafRejectionDialog({
  approvalId,
  open,
  isPending = false,
  onOpenChange,
  onSubmit,
}: CosafRejectionDialogProps) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const hasValidationError =
    trimmedReason.length > 0 && trimmedReason.length < MIN_REASON_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] border border-brand/15 p-0 sm:max-w-xl">
        <div className="rounded-t-[28px] bg-brand-gradient-soft px-6 py-5">
          <DialogHeader className="text-left">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-brand shadow-soft">
              <MessageSquareWarning className="h-5 w-5" />
            </div>
            <DialogTitle>Return COSAF submission</DialogTitle>
            <DialogDescription>
              A rejection reason is required so the agent knows exactly what to fix before
              resubmitting.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 pb-6 pt-2">
          <label htmlFor="cosaf-rejection-reason" className="text-sm font-semibold text-foreground">
            Rejection reason
          </label>
          <textarea
            id="cosaf-rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what needs correction before this COSAF can be approved."
            className="min-h-32 w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
          />
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className={hasValidationError ? 'text-destructive' : 'text-muted-foreground'}>
              {hasValidationError
                ? `Enter at least ${MIN_REASON_LENGTH} characters.`
                : 'This note will be sent back to the assigned agent.'}
            </p>
            <p className="text-muted-foreground">{trimmedReason.length} characters</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!approvalId || trimmedReason.length < MIN_REASON_LENGTH || isPending}
              onClick={() => {
                if (!approvalId) {
                  return;
                }

                onSubmit(approvalId, trimmedReason);
              }}
            >
              {isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Returning
                </>
              ) : (
                'Return to agent'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
