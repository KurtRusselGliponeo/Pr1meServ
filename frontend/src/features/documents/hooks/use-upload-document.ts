'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

interface UploadDocumentPayload {
  file: File;
  category: string;
  description?: string;
  keywords?: string[];
  branchCode?: string;
}

interface UploadDocumentResponse {
  documentId: string;
  webViewLink: string | null;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category, description, keywords, branchCode }: UploadDocumentPayload) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (description) {
        formData.append('description', description);
      }
      if (keywords?.length) {
        formData.append('keywords', keywords.join(','));
      }
      if (branchCode) {
        formData.append('branchCode', branchCode);
      }

      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data as UploadDocumentResponse;
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully.');
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.documents()[0],
      });
    },
    onError: () => {
      toast.error('Upload failed. Please try again.');
    },
  });
}
