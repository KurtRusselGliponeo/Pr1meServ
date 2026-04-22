'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, MessageSquareWarning } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const rejectionReasonSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(10, 'Enter at least 10 characters so the agent knows what to fix.'),
});

type RejectionReasonValues = z.infer<typeof rejectionReasonSchema>;

interface CosafRejectionDialogProps {
  approvalId: string | null;
  open: boolean;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (approvalId: string, reason: string) => void;
}

export function CosafRejectionDialog({
  approvalId,
  open,
  isPending = false,
  onOpenChange,
  onSubmit,
}: CosafRejectionDialogProps) {
  const form = useForm<RejectionReasonValues>({
    resolver: zodResolver(rejectionReasonSchema),
    mode: 'onChange',
    defaultValues: {
      rejectionReason: '',
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] border border-brand/15 p-0 sm:max-w-xl">
        <div className="rounded-t-[28px] bg-brand-gradient-soft px-6 py-5">
          <DialogHeader className="text-left">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-brand shadow-soft">
              <MessageSquareWarning className="h-5 w-5" />
            </div>
            <DialogTitle>Reject COSAF submission</DialogTitle>
            <DialogDescription>
              A detailed rejection reason is required before this record can be returned to the
              agent.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-2">
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                if (!approvalId) {
                  return;
                }

                onSubmit(approvalId, values.rejectionReason.trim());
              })}
            >
              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection reason</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={5}
                        placeholder="Explain what needs correction before this COSAF can be approved."
                        className="min-h-32 w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  type="submit"
                  variant="destructive"
                  disabled={!approvalId || isPending || !form.formState.isValid}
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Rejecting
                    </>
                  ) : (
                    'Reject submission'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
