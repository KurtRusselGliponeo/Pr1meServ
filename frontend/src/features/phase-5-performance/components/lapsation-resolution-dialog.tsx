'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, LoaderCircle, Upload } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

const lapsationResolutionSchema = z
  .object({
    resolutionNote: z.string().trim(),
    reinstatementDocument: z.any().optional(),
  })
  .superRefine((values, context) => {
    const fileList = values.reinstatementDocument as FileList | undefined;
    const hasFile = Boolean(fileList?.length);
    const trimmedNote = values.resolutionNote.trim();

    if (!hasFile && trimmedNote.length < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolutionNote'],
        message: 'Add at least 10 characters or upload a reinstatement document.',
      });
    }
  });

type LapsationResolutionValues = z.infer<typeof lapsationResolutionSchema>;

interface LapsationResolutionDialogProps {
  open: boolean;
  recordId: string | null;
  policyNumber?: string | null;
  clientName?: string | null;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (recordId: string, values: LapsationResolutionValues) => Promise<void> | void;
}

export function LapsationResolutionDialog({
  open,
  recordId,
  policyNumber,
  clientName,
  isPending = false,
  onOpenChange,
  onSubmit,
}: LapsationResolutionDialogProps) {
  const form = useForm<LapsationResolutionValues>({
    resolver: zodResolver(lapsationResolutionSchema),
    mode: 'onChange',
    defaultValues: {
      resolutionNote: '',
      reinstatementDocument: undefined,
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
              <FileText className="h-5 w-5" />
            </div>
            <DialogTitle>Resolve lapsation</DialogTitle>
            <DialogDescription>
              Upload a reinstatement document or leave a resolution note before clearing this policy
              from your queue.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="mb-4 rounded-3xl border border-brand/10 bg-background/80 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">{policyNumber ?? 'Selected policy'}</p>
            <p className="mt-1 text-muted-foreground">{clientName ?? 'Assigned client'}</p>
          </div>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                if (!recordId) {
                  return;
                }

                await onSubmit(recordId, {
                  ...values,
                  resolutionNote: values.resolutionNote.trim(),
                });
              })}
            >
              <FormField
                control={form.control}
                name="reinstatementDocument"
                render={({ field: { onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Reinstatement document</FormLabel>
                    <FormControl>
                      <div className="rounded-3xl border border-dashed border-brand/25 bg-background/80 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Upload className="h-4 w-4 text-brand" />
                          Optional upload for proof of reinstatement
                        </div>
                        <Input
                          {...field}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(event) => onChange(event.target.files)}
                          disabled={isPending}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resolutionNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution note</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={5}
                        placeholder="Summarize how the policy was resolved, or what reinstatement proof was collected."
                        className="min-h-32 w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                        disabled={isPending}
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
                <Button type="submit" disabled={!recordId || isPending || !form.formState.isValid}>
                  {isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Resolving
                    </>
                  ) : (
                    'Submit resolution'
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
