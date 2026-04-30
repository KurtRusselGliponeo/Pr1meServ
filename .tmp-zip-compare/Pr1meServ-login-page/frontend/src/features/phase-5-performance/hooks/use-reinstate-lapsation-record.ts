'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useReinstateLapsationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const response = await api.post(`/lapsation/${recordId}/reinstate`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.lapsation });
    },
  });
}

