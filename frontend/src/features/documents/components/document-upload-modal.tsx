'use client';

import * as React from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUploadDocument } from '../hooks/use-upload-document';

const DOCUMENT_CATEGORIES = [
  'COSAF',
  'Lapsation & Reinstatement',
  'Recruitment',
  'Compliance & Policy',
  'Performance & Reports',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentUploadModal({ isOpen, onClose }: DocumentUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState<string>('');
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [keywords, setKeywords] = React.useState('');
  const [branchCode, setBranchCode] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument();

  function handleClose() {
    setFile(null);
    setCategory('');
    setFileError(null);
    setDescription('');
    setKeywords('');
    setBranchCode('');
    uploadMutation.reset();
    onClose();
  }

  function validateAndSetFile(selectedFile: File) {
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setFileError('Invalid file type. Please upload a PDF, Word, or Excel document.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setFileError('File is too large. Maximum size is 25MB.');
      return;
    }

    setFileError(null);
    setFile(selectedFile);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleSubmit() {
    if (!file || !category) return;
    uploadMutation.mutate(
      {
        file,
        category,
        description,
        branchCode,
        keywords: keywords
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      },
      { onSuccess: () => setTimeout(handleClose, 1500) },
    );
  }

  const isSuccess = uploadMutation.isSuccess;
  const isLoading = uploadMutation.isPending;
  const canSubmit = !!file && !!category && !isLoading && !isSuccess;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Branch Document</DialogTitle>
          <DialogDescription>
            Select a category and upload the official form. It will be stored in the
            branch document repository, versioned automatically, and older versions will be archived.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="doc-category">Document Category</Label>
            <div className="flex flex-wrap gap-2" id="doc-category" role="group" aria-label="Document category">
              {DOCUMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all',
                    category === cat
                      ? 'border-brand bg-brand text-white'
                      : 'border-border bg-background text-muted-foreground hover:border-brand/50',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="doc-branch">Target Branch</Label>
              <Input
                id="doc-branch"
                value={branchCode}
                onChange={(event) => setBranchCode(event.target.value)}
                placeholder="Optional for Admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-keywords">Keywords</Label>
              <Input
                id="doc-keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="keyword, policy, template"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Description</Label>
            <Input
              id="doc-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description for repository search"
            />
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              'relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all',
              isDragging
                ? 'border-brand bg-brand/5 scale-[1.01]'
                : 'border-border bg-muted/30 hover:border-brand/50 hover:bg-muted/50',
              file && 'cursor-default',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileInput}
              aria-label="Upload document file"
            />

            {isSuccess ? (
              <div className="flex flex-col items-center gap-2 text-green-600">
                <CheckCircle2 className="h-10 w-10" />
                <p className="font-semibold">Uploaded to repository!</p>
              </div>
            ) : file ? (
              <div className="flex w-full items-center gap-4 rounded-xl border bg-background p-4">
                <FileText className="h-8 w-8 shrink-0 text-brand" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split('/')[1].toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="rounded-full p-1 hover:bg-muted"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                  <UploadCloud className="h-7 w-7 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Drop file here or{' '}
                    <span className="text-brand underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, Word, or Excel · Max 25 MB
                  </p>
                </div>
              </>
            )}
          </div>

          {fileError && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload to repository
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
