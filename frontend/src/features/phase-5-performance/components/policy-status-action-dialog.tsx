'use client';

import * as React from 'react';
import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const POLICY_STATUSES = ['At Risk', 'Lapsed', 'Reinstated', 'Cancelled', 'Active'] as const;
const FOLLOW_UP_STATUSES = ['Open', 'In Progress', 'Resolved', 'Dismissed'] as const;

export interface PolicyStatusActionValues {
  status: string;
  reason: string;
  notes: string;
  followUpStatus: string;
}

export function PolicyStatusActionDialog({
  open,
  policyNumber,
  initialStatus,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  policyNumber: string | null;
  initialStatus: string;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PolicyStatusActionValues) => Promise<void> | void;
}) {
  const [status, setStatus] = React.useState(initialStatus || 'At Risk');
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [followUpStatus, setFollowUpStatus] = React.useState('Open');

  React.useEffect(() => {
    if (open) {
      setStatus(initialStatus || 'At Risk');
      setReason('');
      setNotes('');
      setFollowUpStatus(initialStatus === 'Reinstated' ? 'Resolved' : 'Open');
    }
  }, [initialStatus, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Update policy status</DialogTitle>
          <DialogDescription>
            Set the next lifecycle status for {policyNumber ?? 'the selected policy'} and capture the follow-up context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {POLICY_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Follow-up status</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={followUpStatus}
              onChange={(event) => setFollowUpStatus(event.target.value)}
            >
              {FOLLOW_UP_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Reason</span>
            <input
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this status changing?"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Notes</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional follow-up details, customer context, or audit notes."
            />
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || reason.trim().length === 0}
            onClick={() => onSubmit({ status, reason: reason.trim(), notes, followUpStatus })}
          >
            {isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              'Save status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
