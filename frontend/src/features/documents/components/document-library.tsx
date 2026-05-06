'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download, FileIcon, History, Pin, Search, Trash2, Upload } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DocumentUploadModal } from './document-upload-modal';
import { DocumentLibraryTableSkeleton } from '@/components/ui/panel-skeletons';
import { useGetDocuments } from '@/features/phase-2-bm-workflow/hooks/use-get-documents';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/identity';
import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import type { DocumentLibraryItem } from '@/features/phase-2-bm-workflow/types/document-library.types';

const categories = [
  'All',
  'COSAF',
  'Lapsation & Reinstatement',
  'Recruitment',
  'Compliance & Policy',
  'Performance & Reports',
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function DocumentLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>('All');
  const [fileType, setFileType] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const categoryFilter = activeCategory === 'All' ? undefined : activeCategory;
  const canManageDocuments = user?.role === 'Admin' || user?.role === 'BranchManager';
  const historyDocumentId = searchParams.get('history');

  const { data, isLoading, errorMessage } = useGetDocuments({
    category: categoryFilter,
    search: searchQuery,
    fileType,
    includeArchived,
  });

  const historyQuery = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.get(`/documents/${documentId}/history`);
      return response.data as DocumentLibraryItem[];
    },
  });

  React.useEffect(() => {
    if (historyDocumentId) {
      historyQuery.mutate(historyDocumentId);
    }
  }, [historyDocumentId]);

  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const response = await api.patch(`/documents/${id}/pin`, { isPinned });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.documents()[0],
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/documents/${id}/archive`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.documents()[0],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.documents()[0],
      });
    },
  });

  const metadataMutation = useMutation({
    mutationFn: async ({
      id,
      fileName,
      description,
      keywords,
      category,
    }: {
      id: string;
      fileName: string;
      description: string | null;
      keywords: string[];
      category: string;
    }) => {
      const response = await api.patch(`/documents/${id}/metadata`, {
        fileName,
        description,
        keywords,
        category,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.documents()[0],
      });
    },
  });

  const handleDownload = React.useCallback(async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/download`);
    const downloadUrl = response.data?.downloadUrl as string;
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const handleEditMetadata = React.useCallback(
    async (document: DocumentLibraryItem) => {
      const nextFileName = window.prompt('File name', document.originalFileName);
      if (!nextFileName) {
        return;
      }

      const nextDescription = window.prompt('Description', document.description ?? '');
      const nextKeywords = window.prompt('Keywords (comma separated)', document.keywords.join(', '));

      await metadataMutation.mutateAsync({
        id: document.id,
        fileName: nextFileName,
        description: nextDescription,
        keywords:
          nextKeywords?.split(',').map((value) => value.trim()).filter(Boolean) ?? document.keywords,
        category: document.category,
      });
    },
    [metadataMutation],
  );

  const handleArchive = React.useCallback(
    async (document: DocumentLibraryItem) => {
      const reason = window.prompt('Archive reason', 'Superseded by a newer repository version.');
      if (!reason) {
        return;
      }

      await archiveMutation.mutateAsync({
        id: document.id,
        reason,
      });
    },
    [archiveMutation],
  );

  const handlePermanentDelete = React.useCallback(
    async (document: DocumentLibraryItem) => {
      const confirmed = window.confirm(
        `Permanently delete "${document.originalFileName}"? This cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }

      await deleteMutation.mutateAsync(document.id);
    },
    [deleteMutation],
  );

  if (isLoading && !data) {
    return <DocumentLibraryTableSkeleton />;
  }

  if (!isLoading && errorMessage) {
    return (
      <EmptyState
        icon={FileIcon}
        title="Document library unavailable"
        description={errorMessage}
      />
    );
  }

  const documents = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Document Library</h2>
          <p className="text-muted-foreground">
            Centralized repository with version history, archive controls, search, and branch-safe access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/cosaf?category=COSAF">COSAF quick link</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/lapsation?documents=Lapsation">Lapsation quick link</Link>
          </Button>
          {canManageDocuments ? (
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload document
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border">
        <div className="grid gap-4 border-b border-border/70 bg-background/80 p-4 lg:grid-cols-[1.4fr_1fr_0.7fr_auto]">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, keywords, description, or category"
              className="pl-11"
              aria-label="Search documents"
            />
          </div>
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Input
            value={fileType}
            onChange={(event) => setFileType(event.target.value)}
            placeholder="pdf, xlsx, docx"
            aria-label="Filter by file type"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Show archived
          </label>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Stored</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No documents matched the current filters.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="align-top">
                    <div className="flex items-start gap-2">
                      <FileIcon className="mt-1 h-4 w-4 text-blue-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{doc.originalFileName}</p>
                          {doc.isPinned ? <Pin className="h-3 w-3 fill-current text-brand" /> : null}
                          {doc.isArchived ? <Badge variant="secondary">Archived</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{doc.description ?? 'No description'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {doc.keywords.length > 0 ? doc.keywords.join(', ') : 'No keywords'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>v{doc.version}</p>
                      <p className="text-xs text-muted-foreground">{doc.fileExtension.toUpperCase()}</p>
                    </div>
                  </TableCell>
                  <TableCell>{doc.branchCode ?? 'Global'}</TableCell>
                  <TableCell>
                    <div>
                      <p>{formatDate(doc.createdAtUtc)}</p>
                      <p className="text-xs text-muted-foreground">{(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      {canManageDocuments ? (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/documents?history=${doc.id}`}>
                              <History className="mr-2 h-4 w-4" />
                              History
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pinMutation.mutate({ id: doc.id, isPinned: !doc.isPinned })}
                          >
                            <Pin className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditMetadata(doc)}>
                            Edit
                          </Button>
                          {!doc.isArchived ? (
                            <Button variant="ghost" size="sm" onClick={() => handleArchive(doc)}>
                              Archive
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermanentDelete(doc)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {historyDocumentId && historyQuery.data ? (
        <div className="rounded-md border p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Version History</h3>
              <p className="text-sm text-muted-foreground">
                Archived and active versions for the selected repository document.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/documents">Close history</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {historyQuery.data.map((item) => (
              <div key={item.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.originalFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      v{item.version} · {item.isArchived ? 'Archived' : 'Active'} · {formatDate(item.createdAtUtc)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(item.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
