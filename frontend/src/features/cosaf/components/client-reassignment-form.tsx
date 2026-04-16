'use client';

import { z } from 'zod';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { type ClientProfile } from '@a1prime/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@/features/identity/lib/zod-resolver';
import { ReassignmentConfirmDialog } from './reassignment-confirm-dialog';

const reassignmentFormSchema = z
  .object({
    sourceAgentId: z.string().uuid('Provide a valid source agent id.'),
    destinationAgentId: z.string().uuid('Provide a valid destination agent id.'),
    clientProfileIds: z
      .string()
      .min(1, 'Enter at least one client profile id.')
      .transform((value) =>
        value
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
  })
  .refine((value) => value.sourceAgentId !== value.destinationAgentId, {
    message: 'Source and destination agents must be different.',
    path: ['destinationAgentId'],
  });

type ReassignmentFormValues = z.input<typeof reassignmentFormSchema>;
type ReassignmentPayload = z.output<typeof reassignmentFormSchema>;

interface ClientReassignmentFormProps {
  clients: ClientProfile[];
  onSubmit: (payload: ReassignmentPayload) => Promise<void>;
  isPending?: boolean;
}

export function ClientReassignmentForm({
  clients,
  onSubmit,
  isPending = false,
}: ClientReassignmentFormProps) {
  const form = useForm<ReassignmentFormValues>({
    resolver: zodResolver(reassignmentFormSchema as unknown as z.ZodType<ReassignmentFormValues>),
    defaultValues: {
      sourceAgentId: '',
      destinationAgentId: '',
      clientProfileIds: clients.slice(0, 3).map((item) => item.id).join('\n'),
    },
  });

  const values = form.watch();
  const parsed = reassignmentFormSchema.safeParse(values);
  const selectedClientIds = parsed.success ? parsed.data.clientProfileIds : [];

  async function handleSubmit(values: ReassignmentFormValues) {
    const payload = reassignmentFormSchema.parse(values);
    await onSubmit(payload);
    form.reset({
      sourceAgentId: '',
      destinationAgentId: '',
      clientProfileIds: '',
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Client reassignment workspace</CardTitle>
            <CardDescription>
              Move batches of client records between agents and keep a clear branch audit trail.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {clients.length} profiles loaded
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="sourceAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source agent id</FormLabel>
                    <FormControl>
                      <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
                    </FormControl>
                    <FormDescription>The clients must currently belong to this agent.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination agent id</FormLabel>
                    <FormControl>
                      <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
                    </FormControl>
                    <FormDescription>This agent becomes the new owner after confirmation.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientProfileIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client profile ids</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={6}
                      placeholder="Paste one UUID per line or separate them with commas."
                      className="min-h-32 w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </FormControl>
                  <FormDescription>
                    Quick fill: the form preloads a few ids from the current COSAF list so you can test the flow.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Ready to submit</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClientIds.length} client record(s) will be reassigned after confirmation.
                  </p>
                </div>
              </div>
            </div>

            <ReassignmentConfirmDialog
              trigger={
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11 rounded-2xl"
                  disabled={!parsed.success || isPending}
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Reassigning
                    </>
                  ) : (
                    'Review reassignment'
                  )}
                </Button>
              }
              sourceAgentId={values.sourceAgentId}
              destinationAgentId={values.destinationAgentId}
              totalClients={selectedClientIds.length}
              isPending={isPending}
              onConfirm={() =>
                form.handleSubmit(async (submittedValues) => {
                  await handleSubmit(submittedValues);
                })()
              }
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
