'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';
import { queryKeys } from '@/lib/query';

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
