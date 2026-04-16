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
import {
  clientProfileImportSchema,
  type ClientProfileImportFormValues,
} from '../lib/client-profile-import-schema';
import { useImportClientProfiles } from '../hooks/use-import-client-profiles';

export function ClientProfileImportForm() {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [rowErrors, setRowErrors] = React.useState<string[]>([]);
  const fileRef = React.useRef<File | null>(null);
  const importMutation = useImportClientProfiles();

  const form = useForm<ClientProfileImportFormValues>({
    resolver: zodResolver(clientProfileImportSchema as never),
    defaultValues: {
      fileName: '',
      mimeType: 'application/pdf',
      sizeBytes: 1,
    },
  });

  async function onSubmit(_values: ClientProfileImportFormValues) {
    setSubmitError(null);
    setRowErrors([]);

    try {
      const file = fileRef.current;

      if (!file) {
        form.setError('fileName', {
          type: 'manual',
          message: 'Please choose a file to import.',
        });
        return;
      }

      const response = await importMutation.mutateAsync(file);

      toast.success('Import file uploaded successfully.', {
        description: `${response.fileName} is ready for processing.`,
      });

      fileRef.current = null;
      form.reset();
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fileErrors = fieldErrors.fileName;

      if (fileErrors?.length) {
        form.setError('fileName', {
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
        <input type="hidden" {...form.register('fileName')} />
        <input type="hidden" {...form.register('mimeType')} />
        <input type="hidden" {...form.register('sizeBytes', { valueAsNumber: true })} />
        <FormField
          control={form.control}
          name="fileName"
          render={() => (
            <FormItem>
              <FormLabel>Import file</FormLabel>
              <FormControl>
                <div className="rounded-[28px] border-2 border-dashed border-brand/30 bg-brand-gradient-soft p-5 shadow-soft">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/70 text-brand shadow-soft dark:bg-white/10">
                      <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Upload a branch import sheet
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Accepted formats: PDF, JPEG, or PNG. Maximum file size: 20MB.
                      </p>
                    </div>
                  </div>

                  <Input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="min-h-12 rounded-2xl file:mr-3 file:rounded-full file:border-0 file:bg-brand-gradient file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-foreground"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      fileRef.current = file ?? null;
                      form.setValue('fileName', file?.name ?? '', { shouldValidate: true });
                      form.setValue(
                        'mimeType',
                        (file?.type as 'application/pdf' | 'image/jpeg' | 'image/png') ??
                          'application/pdf',
                        { shouldValidate: true },
                      );
                      form.setValue('sizeBytes', file?.size ?? 1, { shouldValidate: true });
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Upload the validated source document that should enter protected import processing.
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
          <section className="rounded-3xl border border-white/50 bg-background/85 p-4 shadow-soft dark:border-white/10" aria-live="polite">
            <h3 className="text-sm font-semibold text-foreground">Rows requiring attention</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {rowErrors.map((rowError) => (
                <li key={rowError} className="rounded-2xl bg-brand-gradient-soft px-3 py-2">
                  {rowError}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="min-h-12 rounded-full px-5"
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
