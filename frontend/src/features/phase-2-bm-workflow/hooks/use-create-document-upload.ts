'use client';

import { useMutation } from '@tanstack/react-query';

import api from '@/services/api-client';

interface CreateDocumentUploadPayload {
  fileName: string;
  mimeType: string;
  category: string;
}

interface CreateDocumentUploadResponse {
  signedUrl: string;
  documentId: string;
}

export function useCreateDocumentUpload() {
  return useMutation({
    mutationFn: async (payload: CreateDocumentUploadPayload) => {
      const response = await api.post('/documents/presigned-url', payload);
      return response.data as CreateDocumentUploadResponse;
    },
  });
}
