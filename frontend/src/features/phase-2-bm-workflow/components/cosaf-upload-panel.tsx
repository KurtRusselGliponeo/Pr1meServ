'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUp, LoaderCircle, Search, UploadCloud } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthenticatedUser, ClientProfile } from '@a1prime/schemas';

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
import { getStoredAuthUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import { toast } from 'sonner';
import { useCompleteCosafUpload } from '@/features/phase-2-bm-workflow/hooks/use-complete-cosaf-upload';
import { useGetClientProfiles } from '../hooks/use-get-client-profiles';

const MAX_COSAF_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const cosafUploadFormSchema = z.object({
  file: z
    .instanceof(File, { message: 'Attach a signed COSAF PDF before uploading.' })
    .refine((file) => file.type === 'application/pdf', {
      message: 'Only PDF files are allowed for COSAF submissions.',
    })
    .refine((file) => file.size <= MAX_COSAF_FILE_SIZE_BYTES, {
      message: 'COSAF files must be 15MB or smaller.',
    }),
});

type CosafUploadFormValues = z.infer<typeof cosafUploadFormSchema>;

const uploadDocumentResponseSchema = z.object({
  documentId: z.string().uuid(),
  webViewLink: z.string().url().nullable().optional(),
});

type UploadStage = 'idle' | 'uploading' | 'finalizing' | 'done';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CosafUploadPanel() {
  const authUser = getStoredAuthUser<AuthenticatedUser>();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<ClientProfile | null>(null);
  const [stage, setStage] = React.useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState(
    'Pick a reassigned client, attach the signed PDF, and stream it into the manager review queue.',
  );

  const form = useForm<CosafUploadFormValues>({
    resolver: zodResolver(cosafUploadFormSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const clientsQuery = useGetClientProfiles(
    1,
    {
      search,
      status: 'For Approval',
    },
    8,
  );

  const uploadMutation = useMutation({
    mutationKey: ['documents', 'cosaf-upload-stream'],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'COSAF');

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          if (!event.total) {
            setUploadProgress(45);
            return;
          }

          const nextProgress = Math.min(Math.round((event.loaded / event.total) * 100), 100);
          setUploadProgress(nextProgress);
        },
      });

      return uploadDocumentResponseSchema.parse(response.data);
    },
  });

  const completeUploadMutation = useCompleteCosafUpload();

  if (!authUser || authUser.role !== 'Agent') {
    return null;
  }

  async function handleSubmit(values: CosafUploadFormValues) {
    if (!selectedClient) {
      toast.error('Select a client before uploading the COSAF file.');
      return;
    }

    try {
      setStage('uploading');
      setUploadProgress(0);
      setStatusMessage('Streaming the signed COSAF PDF to the backend upload proxy.');

      const uploadResult = await uploadMutation.mutateAsync(values.file);

      setStage('finalizing');
      setUploadProgress(100);
      setStatusMessage('Finalizing the upload and updating the queue to PENDING_REVIEW.');

      await completeUploadMutation.mutateAsync({
        documentId: uploadResult.documentId,
        clientProfileId: selectedClient.id,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cosafApprovals }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents() }),
      ]);

      setStage('done');
      setStatusMessage('COSAF upload completed. The client is now marked as PENDING_REVIEW.');
      setSelectedClient(null);
      setSearch('');
      form.reset();
    } catch (error) {
      setStage('idle');
      setUploadProgress(0);
      setStatusMessage('Upload failed. Review the file and try again.');
      toast.error(error instanceof Error ? error.message : 'COSAF upload failed.');
    }
  }

  const isWorking = uploadMutation.isPending || completeUploadMutation.isPending;

  return (
    <Card className="overflow-hidden border border-brand/20 bg-white/72 dark:bg-card/82">
      <CardHeader className="bg-brand-gradient-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-white/85 p-3 text-brand shadow-soft">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <CardDescription>Agent upload portal</CardDescription>
            <CardTitle className="mt-1">Stream the signed COSAF into review</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">1. Find your reassigned client</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search by client name or policy number"
            />
          </div>
          <div className="grid gap-2">
            {clientsQuery.data?.data.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClient(client)}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left transition',
                  selectedClient?.id === client.id
                    ? 'border-brand bg-brand-gradient-soft'
                    : 'border-white/50 bg-background/80 hover:border-brand/40 dark:border-white/10',
                )}
              >
                <p className="font-medium text-foreground">
                  {client.firstName} {client.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Policy {client.policyNumber} | {client.caseStatus}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>2. Attach the signed COSAF PDF</FormLabel>
                  <FormControl>
                    <label className="flex cursor-pointer items-center justify-between rounded-3xl border border-dashed border-brand/35 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        {value ? `${value.name} (${formatFileSize(value.size)})` : 'Choose a PDF file'}
                      </span>
                      <input
                        {...field}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          onChange(file);
                        }}
                      />
                      <span className="rounded-full border border-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                        Browse
                      </span>
                    </label>
                  </FormControl>
                  <FormDescription>
                    PDFs only. Maximum file size: 15MB. The upload is streamed through the backend
                    proxy to Google Drive.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-3xl border border-white/50 bg-background/70 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Workflow status</p>
                  <p className="mt-2 text-sm text-muted-foreground">{statusMessage}</p>
                </div>
                <span className="text-sm font-semibold text-brand">{uploadProgress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand/10">
                <div
                  className={cn(
                    'h-full rounded-full bg-brand transition-[width] duration-300 ease-out',
                    stage === 'done' && 'bg-emerald-500',
                  )}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="min-h-12 rounded-full"
              disabled={!selectedClient || isWorking}
            >
              {isWorking ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {stage === 'finalizing' ? 'Finalizing queue state' : 'Streaming upload'}
                </>
              ) : (
                'Upload and mark PENDING_REVIEW'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
