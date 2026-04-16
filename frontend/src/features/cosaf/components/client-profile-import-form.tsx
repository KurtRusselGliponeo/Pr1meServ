'use client';

import * as React from 'react';
import axios from 'axios';
import { FileSpreadsheet, LoaderCircle, UploadCloud } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { getFieldErrors } from '@/lib/error-utils';
import { clientProfileImportSchema, type ClientProfileImportFormValues } from '../lib/client-profile-import-schema';
import { useImportClientProfiles } from '../hooks/use-import-client-profiles';

export function ClientProfileImportForm() {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [rowErrors, setRowErrors] = React.useState<string[]>([]);
  const importMutation = useImportClientProfiles();

  const form = useForm<ClientProfileImportFormValues>({
    resolver: zodResolver(clientProfileImportSchema),
    defaultValues: {
      file: undefined as never,
    },
  });

  async function onSubmit(values: ClientProfileImportFormValues) {
    setSubmitError(null);
    setRowErrors([]);

    try {
      const response = await importMutation.mutateAsync(values.file);

      toast.success('Import file uploaded successfully.', {
        description: `${response.fileName} is ready for processing.`,
      });

      form.reset();
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fileErrors = fieldErrors.file;

      if (fileErrors?.length) {
        form.setError('file', {
          type: 'server',
          message: fileErrors[0],
        });
      }

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              message?: string;
              rowErrors?: string[];
            }
          | undefined;

        setSubmitError(responseData?.message ?? 'Unable to import client profiles.');
        setRowErrors(responseData?.rowErrors ?? []);
        return;
      }

      setSubmitError('Unable to import client profiles.');
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value: _value, ...field } }) => (
            <FormItem>
              <FormLabel>Import file</FormLabel>
              <FormControl>
                <div className="rounded-3xl border border-dashed border-border/80 bg-card p-5">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Upload a branch import sheet
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Accepted formats: CSV or XLSX. Maximum file size: 5MB.
                      </p>
                    </div>
                  </div>

                  <Input
                    {...field}
                    type="file"
                    accept=".csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="min-h-12 rounded-2xl"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      onChange(file);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Use the latest branch template so column names match the import processor.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError ? (
          <div
            className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}

        {rowErrors.length ? (
          <section className="rounded-2xl border border-border/70 bg-card p-4" aria-live="polite">
            <h3 className="text-sm font-semibold text-foreground">Rows requiring attention</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {rowErrors.map((rowError) => (
                <li key={rowError} className="rounded-xl bg-muted/50 px-3 py-2">
                  {rowError}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="min-h-11 rounded-2xl px-5"
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Uploading import file
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Upload import file
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
