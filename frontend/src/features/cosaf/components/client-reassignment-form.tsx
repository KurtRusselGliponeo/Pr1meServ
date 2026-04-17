'use client';

import * as React from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  ClientProfileReassignSchema,
  type ClientProfile,
  type ClientProfileReassign,
} from '@a1prime/schemas';

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

interface ClientReassignmentFormProps {
  clients: ClientProfile[];
  onSubmit: (payload: ClientProfileReassign) => Promise<void>;
  isPending?: boolean;
}

export function ClientReassignmentForm({
  clients,
  onSubmit,
  isPending = false,
}: ClientReassignmentFormProps) {
  const [clientProfileIdsText, setClientProfileIdsText] = React.useState(
    clients
      .slice(0, 3)
      .map((item) => item.id)
      .join('\n'),
  );

  const form = useForm<ClientProfileReassign>({
    resolver: zodResolver(ClientProfileReassignSchema as never),
    defaultValues: {
      sourceAgentId: '',
      destinationAgentId: null,
      clientProfileIds: clients.slice(0, 3).map((item) => item.id),
    },
  });

  const values = form.watch();
  const parsed = ClientProfileReassignSchema.safeParse(values);
  const selectedClientIds = parsed.success ? parsed.data.clientProfileIds : [];

  async function handleSubmit(values: ClientProfileReassign) {
    const payload = ClientProfileReassignSchema.parse(values);
    await onSubmit(payload);
    form.reset({
      sourceAgentId: '',
      destinationAgentId: null,
      clientProfileIds: [],
    });
    setClientProfileIdsText('');
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
          <div className="rounded-full border border-white/50 bg-brand-gradient-soft px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-soft dark:border-white/10">
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
                    <FormDescription>
                      The clients must currently belong to this agent.
                    </FormDescription>
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
                      <Input
                        placeholder="Leave blank to orphan these clients"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value.trim();
                          field.onChange(nextValue.length > 0 ? nextValue : null);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      This agent becomes the new owner after confirmation. Leave it blank to move
                      the records into an orphan queue.
                    </FormDescription>
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
                      rows={6}
                      value={clientProfileIdsText}
                      placeholder="Paste one UUID per line or separate them with commas."
                      className="min-h-32 w-full rounded-3xl border border-white/55 bg-background/88 px-4 py-3 text-sm text-foreground shadow-soft outline-none transition-all duration-300 ease-smooth focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/10 dark:bg-white/5"
                      onChange={(event) => {
                        const nextText = event.target.value;
                        setClientProfileIdsText(nextText);
                        field.onChange(
                          nextText
                            .split(/[\s,]+/)
                            .map((item) => item.trim())
                            .filter(Boolean),
                        );
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Quick fill: the form preloads a few ids from the current COSAF list so you can
                    test the flow.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-3xl border border-white/50 bg-brand-gradient-soft p-4 shadow-soft dark:border-white/10">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Ready to submit</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClientIds.length} client record(s) will be reassigned after
                    confirmation.
                  </p>
                </div>
              </div>
            </div>

            <ReassignmentConfirmDialog
              trigger={
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 rounded-full"
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
              destinationAgentId={values.destinationAgentId ?? 'Orphan queue'}
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
