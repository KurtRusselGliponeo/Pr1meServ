'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useUpdateDocumentPin(category?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, isPinned }: { documentId: string; isPinned: boolean }) => {
      const response = await api.patch(`/documents/${documentId}/pin`, { isPinned });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents(category) });
    },
  });
}

