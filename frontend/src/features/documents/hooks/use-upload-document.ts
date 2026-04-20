'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

interface UploadDocumentPayload {
  file: File;
  category: string;
}

interface UploadDocumentResponse {
  documentId: string;
  webViewLink: string | null;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category }: UploadDocumentPayload) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data as UploadDocumentResponse;
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.documents() });
    },
    onError: () => {
      toast.error('Upload failed. Please try again.');
    },
  });
}
