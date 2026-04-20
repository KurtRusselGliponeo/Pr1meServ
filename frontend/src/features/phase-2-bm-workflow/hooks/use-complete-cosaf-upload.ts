'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';

interface CompleteCosafUploadPayload {
  documentId: string;
  clientProfileId: string;
}

export function useCompleteCosafUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CompleteCosafUploadPayload) => {
      const response = await api.post('/documents/cosaf-upload-complete', payload);
      return response.data;
    },
    onSuccess: async () => {
      toast.success('COSAF upload sent to the approval queue.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cosaf-approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['documents'] }),
      ]);
    },
  });
}
