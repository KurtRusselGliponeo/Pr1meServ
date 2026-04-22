'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, FileIcon, Pin, Search, Upload } from 'lucide-react';
import { DocumentUploadModal } from './document-upload-modal';
import { DocumentLibraryTableSkeleton } from '@/components/ui/panel-skeletons';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

interface Document {
  id: string;
  fileName: string;
  category: string;
  version: string;
  fileUrl: string;
  isPinned: boolean;
  createdAtUtc: string;
}

export function DocumentLibrary() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await fetch('/api/v1/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  const filteredDocuments = React.useMemo(() => {
    if (!documents) return [];

    const normalizedSearch = searchQuery.trim().toLowerCase();

    return [...documents]
      .filter((document) => {
        const categoryMatches = activeCategory === 'All' || document.category === activeCategory;
        const searchMatches =
          normalizedSearch.length === 0 ||
          document.fileName.toLowerCase().includes(normalizedSearch) ||
          document.category.toLowerCase().includes(normalizedSearch);

        return categoryMatches && searchMatches;
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [documents, activeCategory, searchQuery]);

  const { mutate: togglePin } = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const response = await fetch(`/api/v1/documents/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned }),
      });
      if (!response.ok) throw new Error('Failed to pin document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  if (isLoading && !documents) {
    return <DocumentLibraryTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Document Library</h2>
          <p className="text-muted-foreground">
            Centralized repository for all official branch forms and templates.
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Form
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="flex flex-col gap-4 border-b border-border/70 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search documents by name or category"
              className="pl-11"
              aria-label="Search documents"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['All', 'COSAF', 'Compliance', 'Performance', 'Recruitment'].map((category) => {
              const isActive = activeCategory === category;

              return (
                <Button
                  key={category}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Button>
              );
            })}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <div className="p-4">
                    <div className="space-y-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`documents-inline-loading-${index}`}
                          className="grid grid-cols-[1.6fr_1fr_0.8fr_1fr_1fr] items-center gap-4"
                        >
                          <div className="h-5 animate-pulse rounded-full bg-muted/70" />
                          <div className="h-8 w-24 animate-pulse rounded-full bg-muted/70" />
                          <div className="h-4 w-16 animate-pulse rounded-full bg-muted/70" />
                          <div className="h-4 w-24 animate-pulse rounded-full bg-muted/70" />
                          <div className="flex justify-end gap-2">
                            <div className="h-9 w-10 animate-pulse rounded-xl bg-muted/70" />
                            <div className="h-9 w-28 animate-pulse rounded-xl bg-muted/70" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : documents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No matching documents. Try a different search or category.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-blue-500" />
                    {doc.fileName}
                    {doc.isPinned && <Pin className="h-3 w-3 text-red-500 ml-1 fill-red-500" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.category}</Badge>
                  </TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>{formatDate(doc.createdAtUtc)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePin({ id: doc.id, isPinned: !doc.isPinned })}
                        title={doc.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DocumentUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
