'use client';

import * as React from 'react';
import { FileUp, LoaderCircle, Search, UploadCloud } from 'lucide-react';
import type { ClientProfile } from '@a1prime/schemas';
import type { AuthenticatedUser } from '@a1prime/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getStoredAuthUser } from '@/lib/auth';
import { toast } from 'sonner';
import { useCompleteCosafUpload } from '@/features/phase-2-bm-workflow/hooks/use-complete-cosaf-upload';
import { useCreateDocumentUpload } from '@/features/phase-2-bm-workflow/hooks/use-create-document-upload';
import { useGetClientProfiles } from '../hooks/use-get-client-profiles';

type UploadStage = 'idle' | 'requesting-url' | 'uploading' | 'finalizing' | 'done';

export function CosafUploadPanel() {
  const authUser = getStoredAuthUser<AuthenticatedUser>();
  const [search, setSearch] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<ClientProfile | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [stage, setStage] = React.useState<UploadStage>('idle');
  const [statusMessage, setStatusMessage] = React.useState(
    'Pick a reassigned client and upload the signed COSAF file.',
  );
  const clientsQuery = useGetClientProfiles(
    1,
    {
      search,
      status: 'For Approval',
    },
    8,
  );
  const createUploadMutation = useCreateDocumentUpload();
  const completeUploadMutation = useCompleteCosafUpload();

  if (!authUser || authUser.role !== 'Agent') {
    return null;
  }

  async function handleSubmit() {
    if (!selectedClient || !selectedFile) {
      return;
    }

    try {
      setStage('requesting-url');
      setStatusMessage('Requesting a secure upload URL from the backend.');

      const upload = await createUploadMutation.mutateAsync({
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        category: 'COSAF',
      });

      setStage('uploading');
      setStatusMessage('Uploading the file to storage.');

      const uploadResponse = await fetch(upload.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Storage upload failed.');
      }

      setStage('finalizing');
      setStatusMessage('Finalizing COSAF upload and notifying the manager queue.');

      await completeUploadMutation.mutateAsync({
        documentId: upload.documentId,
        clientProfileId: selectedClient.id,
      });

      setStage('done');
      setStatusMessage('Upload complete. The manager approval queue has been updated.');
      setSelectedClient(null);
      setSelectedFile(null);
      setSearch('');
    } catch (error) {
      setStage('idle');
      setStatusMessage('Upload failed. Fix the issue and try again.');
      toast.error(error instanceof Error ? error.message : 'COSAF upload failed.');
    }
  }

  const isWorking =
    stage === 'requesting-url' || stage === 'uploading' || stage === 'finalizing';

  return (
    <Card className="overflow-hidden border border-brand/20 bg-white/72 dark:bg-card/82">
      <CardHeader className="bg-brand-gradient-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-white/85 p-3 text-brand shadow-soft">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <CardDescription>Agent handoff</CardDescription>
            <CardTitle className="mt-1">Upload directly into the manager queue</CardTitle>
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
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selectedClient?.id === client.id
                    ? 'border-brand bg-brand/10'
                    : 'border-white/50 bg-background/80 hover:border-brand/40 dark:border-white/10'
                }`}
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

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">2. Attach the signed COSAF file</p>
          <label className="flex cursor-pointer items-center justify-between rounded-3xl border border-dashed border-brand/35 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              {selectedFile ? selectedFile.name : 'Choose a PDF or image file'}
            </span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
            />
            <span className="rounded-full border border-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
              Browse
            </span>
          </label>
        </div>

        <div className="rounded-3xl border border-white/50 bg-background/70 p-4 dark:border-white/10">
          <p className="text-sm font-semibold text-foreground">Workflow status</p>
          <p className="mt-2 text-sm text-muted-foreground">{statusMessage}</p>
        </div>

        <Button
          type="button"
          size="lg"
          className="min-h-12 rounded-full"
          disabled={!selectedClient || !selectedFile || isWorking}
          onClick={() => void handleSubmit()}
        >
          {isWorking ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Processing upload
            </>
          ) : (
            'Upload and create approval'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
