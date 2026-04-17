'use client';

import * as React from 'react';
import { FileText, Filter, Pin, PinOff, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetDocuments } from '../hooks/use-get-documents';
import { useUpdateDocumentPin } from '../hooks/use-update-document-pin';

const categories = ['All', 'COSAF', 'Compliance', 'Performance', 'Recruitment'] as const;

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function DocumentsPageClient() {
  const [category, setCategory] = React.useState<string | undefined>(undefined);
  const documentsQuery = useGetDocuments(category);
  const pinMutation = useUpdateDocumentPin(category);

  if (documentsQuery.isPending) {
    return <LoadingSkeleton rows={4} columns={4} />;
  }

  if (!documentsQuery.data || documentsQuery.errorMessage) {
    return (
      <EmptyState
        icon={FileText}
        title="Document repository unavailable"
        description={documentsQuery.errorMessage ?? 'Documents are not available yet.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Documents
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Live repository
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Browse uploaded library records, review pinned templates first, and filter by
              category.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <UploadCloud className="h-4 w-4" />
            Upload requests are available from the protected backend endpoint.
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {categories.map((option) => {
          const isActive = (option === 'All' && !category) || option === category;

          return (
            <Button
              key={option}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(option === 'All' ? undefined : option)}
            >
              <Filter className="h-4 w-4" />
              {option}
            </Button>
          );
        })}
      </div>

      {documentsQuery.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Try another category filter or upload the first document for this section."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {documentsQuery.data.map((document) => (
            <Card key={document.id}>
              <CardHeader className="rounded-[28px] bg-brand-gradient-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardDescription>{document.category}</CardDescription>
                    <CardTitle className="mt-2 text-xl">{document.fileName}</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={document.isPinned ? 'Unpin document' : 'Pin document'}
                    onClick={() =>
                      pinMutation.mutate({
                        documentId: document.id,
                        isPinned: !document.isPinned,
                      })
                    }
                    disabled={pinMutation.isPending}
                  >
                    {document.isPinned ? (
                      <PinOff className="h-4 w-4 text-brand" />
                    ) : (
                      <Pin className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Version
                    </p>
                    <p className="mt-1 font-medium text-foreground">{document.version}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Type
                    </p>
                    <p className="mt-1 font-medium text-foreground">{document.mimeType}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/50 bg-background/70 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Stored
                  </p>
                  <p className="mt-2 break-all text-sm text-foreground">{document.fileUrl}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Added {formatCreatedAt(document.createdAtUtc)}
                  {document.isPinned ? ' and currently pinned for quick access.' : '.'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
